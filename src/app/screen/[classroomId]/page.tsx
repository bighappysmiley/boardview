"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ScreenCanvas, type ScreenMode } from "@/components/ScreenCanvas";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEMO_CLASSROOM_ID, demoCameras, demoClassroom } from "@/lib/demo";
import { useClock } from "@/lib/useClock";
import type { Camera, Classroom } from "@/lib/types";

export default function ScreenPage() {
  const params = useParams<{ classroomId: string }>();
  const classroomId = params.classroomId;
  const isDemo = classroomId === DEMO_CLASSROOM_ID || !isSupabaseConfigured;

  const [classroom, setClassroom] = useState<Classroom | null>(
    isDemo ? demoClassroom : null
  );
  const [cameras, setCameras] = useState<Camera[]>(isDemo ? demoCameras : []);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const time = useClock();

  // Load the room and its cameras, then stay subscribed so the teacher's
  // blackout toggle and camera edits reach the screen without a refresh.
  useEffect(() => {
    if (isDemo) return;

    const supabase = createClient();
    let active = true;

    Promise.all([
      supabase.from("classrooms").select("*").eq("id", classroomId).single(),
      supabase
        .from("cameras")
        .select("*")
        .eq("classroom_id", classroomId)
        .order("position"),
    ]).then(([classroomRes, camerasRes]) => {
      if (!active) return;
      if (classroomRes.error) {
        setError("This screen isn't connected to a classroom yet.");
        setLoading(false);
        return;
      }
      setClassroom(classroomRes.data as Classroom);
      setCameras((camerasRes.data ?? []) as Camera[]);
      setLoading(false);
    });

    const channel = supabase
      .channel(`screen:${classroomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "classrooms",
          filter: `id=eq.${classroomId}`,
        },
        (payload) => setClassroom(payload.new as Classroom)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cameras",
          filter: `classroom_id=eq.${classroomId}`,
        },
        () => {
          supabase
            .from("cameras")
            .select("*")
            .eq("classroom_id", classroomId)
            .order("position")
            .then(({ data }) => setCameras((data ?? []) as Camera[]));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [classroomId, isDemo]);

  const nextCamera = useCallback(() => {
    setIndex((current) => current + 1);
  }, []);

  // A physical button on the camera box can send a key press instead of a tap.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "n") nextCamera();
      if (event.key === "ArrowLeft") setIndex((current) => current - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextCamera]);

  // Derived rather than stored, so adding or removing a camera can never
  // strand the index out of range.
  const count = cameras.length;
  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
  const camera = count > 0 ? cameras[safeIndex] : null;

  let mode: ScreenMode = "boot";
  if (classroom?.blacked_out) mode = "blackout";
  else if (camera) mode = "live";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-screen">
      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-white/50">
          One moment…
        </div>
      ) : error ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-white/70">{error}</p>
          <Link href="/account" className="text-sm font-medium text-white/50 underline">
            Open the classroom
          </Link>
        </div>
      ) : (
        <ScreenCanvas
          mode={mode}
          camera={camera}
          time={time ?? undefined}
          cameraIndex={safeIndex}
          cameraCount={count}
          onNextCamera={nextCamera}
        />
      )}

      {/* Discreet way back out for whoever is setting the device up. */}
      <Link
        href="/account"
        className="absolute bottom-3 left-3 rounded-md px-3 py-1.5 text-xs text-white/25 transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:bg-white/10 focus-visible:text-white"
      >
        Teacher preview
      </Link>
    </div>
  );
}
