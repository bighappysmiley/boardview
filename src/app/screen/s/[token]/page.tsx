"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PinPad } from "@/components/PinPad";
import { ScreenCanvas, type ScreenMode } from "@/components/ScreenCanvas";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useClock } from "@/lib/useClock";
import type { DeskSessionView, OpenDesk } from "@/lib/types";

function sessionKey(token: string) {
  return `bv_desk_session:${token}`;
}

function rpcMessage(message: string) {
  return message.replace(/^[A-Z0-9]+:\s*/, "");
}

export default function PairedDeskPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const time = useClock();

  const [desk, setDesk] = useState<OpenDesk | null>(null);
  const [view, setView] = useState<DeskSessionView | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [pinError, setPinError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(
    isSupabaseConfigured ? null : "This screen isn't connected."
  );
  const [unlocking, setUnlocking] = useState(false);
  const [index, setIndex] = useState(0);
  const sessionRef = useRef<string | null>(null);

  const applyView = useCallback((next: DeskSessionView) => {
    sessionRef.current = next.session_token;
    setView(next);
    try {
      window.localStorage.setItem(sessionKey(token), next.session_token);
    } catch {
      /* private mode */
    }
  }, [token]);

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    setView(null);
    try {
      window.localStorage.removeItem(sessionKey(token));
    } catch {
      /* private mode */
    }
  }, [token]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    let active = true;

    Promise.resolve()
      .then(async () => {
        const { data, error } = await supabase.rpc("open_desk", {
          p_token: token,
        });
        if (!active) return;
        if (error || !data) {
          setFatal("This screen isn't connected to a classroom yet.");
          return;
        }
        setDesk(data as OpenDesk);

        let stored: string | null = null;
        try {
          stored = window.localStorage.getItem(sessionKey(token));
        } catch {
          stored = null;
        }
        if (!stored) return;

        const session = await supabase.rpc("desk_session", {
          p_token: token,
          p_session: stored,
        });
        if (!active) return;
        if (session.error || !session.data) {
          try {
            window.localStorage.removeItem(sessionKey(token));
          } catch {
            /* private mode */
          }
          return;
        }
        applyView(session.data as DeskSessionView);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, applyView]);

  useEffect(() => {
    if (!view) return;
    const supabase = createClient();
    const id = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current) return;
      supabase
        .rpc("desk_session", { p_token: token, p_session: current })
        .then(({ data, error }) => {
          if (error || !data) {
            clearSession();
            setPinError("Sign in with your PIN again.");
            return;
          }
          applyView(data as DeskSessionView);
        });
    }, 2500);
    return () => window.clearInterval(id);
  }, [view, token, applyView, clearSession]);

  useEffect(() => {
    if (view || loading || fatal) return;
    const supabase = createClient();
    const id = window.setInterval(() => {
      supabase.rpc("open_desk", { p_token: token }).then(({ data, error }) => {
        if (error || !data) {
          setFatal("This screen isn't connected to a classroom yet.");
          setDesk(null);
          return;
        }
        setDesk(data as OpenDesk);
      });
    }, 2500);
    return () => window.clearInterval(id);
  }, [view, loading, fatal, token]);

  async function unlock(pin: string) {
    setUnlocking(true);
    setPinError(null);
    const { data, error } = await createClient().rpc("unlock_screen", {
      p_token: token,
      p_pin: pin,
    });
    setUnlocking(false);
    if (error || !data) {
      setPinError(rpcMessage(error?.message ?? "That PIN didn't work."));
      return;
    }
    applyView(data as DeskSessionView);
  }

  const nextCamera = useCallback(() => {
    setIndex((current) => current + 1);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!view) return;
      if (event.key === "ArrowRight" || event.key === "n") nextCamera();
      if (event.key === "ArrowLeft") setIndex((current) => current - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nextCamera, view]);

  const cameras = view?.cameras ?? [];
  const count = cameras.length;
  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;
  const camera = count > 0 ? cameras[safeIndex] : null;

  let mode: ScreenMode = "boot";
  if (view?.classroom_blacked_out || view?.student_blacked_out) {
    mode = "blackout";
  } else if (camera) {
    mode = "live";
  }

  const needsPin =
    !view &&
    desk &&
    (desk.pin_mode === "pin_as_id" || desk.seated);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-screen">
      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-white/50">
          One moment…
        </div>
      ) : fatal ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-white/70">{fatal}</p>
        </div>
      ) : view ? (
        <ScreenCanvas
          mode={mode}
          camera={camera}
          time={time ?? undefined}
          cameraIndex={safeIndex}
          cameraCount={count}
          onNextCamera={nextCamera}
        />
      ) : needsPin ? (
        <div className="flex h-full flex-col">
          {desk?.classroom_name && (
            <p className="pt-8 text-center text-sm text-white/50">
              {desk.classroom_name}
            </p>
          )}
          <div className="min-h-0 flex-1">
            <PinPad onSubmit={unlock} error={pinError} disabled={unlocking} />
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-white/70">This desk isn&apos;t assigned yet.</p>
          <p className="text-sm text-white/45">
            Ask your teacher to seat someone here.
          </p>
        </div>
      )}

      <Link
        href="/account"
        className="absolute bottom-3 left-3 rounded-md px-3 py-1.5 text-xs text-white/25 transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:bg-white/10 focus-visible:text-white"
      >
        Teacher controls
      </Link>
    </div>
  );
}
