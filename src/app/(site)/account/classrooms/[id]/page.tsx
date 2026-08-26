"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/Button";
import { Container } from "@/components/layout";
import { BareInput, FormError } from "@/components/form";
import { SetupNotice } from "@/components/SetupNotice";
import { ScreenCanvas, DeviceFrame } from "@/components/ScreenCanvas";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useClock } from "@/lib/useClock";
import type { Camera, Classroom } from "@/lib/types";

export default function ClassroomPage() {
  const params = useParams<{ id: string }>();
  const classroomId = params.id;
  const router = useRouter();
  const time = useClock();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState(0);
  const [copied, setCopied] = useState(false);

  const loadCameras = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("cameras")
      .select("*")
      .eq("classroom_id", classroomId)
      .order("position");
    setCameras((data ?? []) as Camera[]);
  }, [classroomId]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const { data: room, error: roomError } = await supabase
        .from("classrooms")
        .select("*")
        .eq("id", classroomId)
        .single();
      if (!active) return;
      if (roomError) {
        setError("We couldn't find that classroom.");
        setLoading(false);
        return;
      }
      setClassroom(room as Classroom);
      await loadCameras();
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [classroomId, router, loadCameras]);

  async function addCamera(event: React.FormEvent) {
    event.preventDefault();
    const label = newLabel.trim();
    if (!label) return;

    setError(null);
    setAdding(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("cameras").insert({
      classroom_id: classroomId,
      label,
      position: cameras.length,
    });
    setAdding(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewLabel("");
    await loadCameras();
  }

  async function updateCamera(id: string, patch: Partial<Camera>) {
    setCameras((current) =>
      current.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
    const { error: updateError } = await createClient()
      .from("cameras")
      .update(patch)
      .eq("id", id);
    if (updateError) setError(updateError.message);
  }

  async function removeCamera(id: string) {
    const remaining = cameras.filter((c) => c.id !== id);
    setCameras(remaining);
    const supabase = createClient();
    await supabase.from("cameras").delete().eq("id", id);
    await Promise.all(
      remaining.map((c, i) =>
        supabase.from("cameras").update({ position: i }).eq("id", c.id)
      )
    );
    await loadCameras();
  }

  async function moveCamera(id: string, direction: -1 | 1) {
    const from = cameras.findIndex((c) => c.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= cameras.length) return;

    const reordered = [...cameras];
    [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
    setCameras(reordered);

    const supabase = createClient();
    await Promise.all(
      reordered.map((c, i) =>
        supabase.from("cameras").update({ position: i }).eq("id", c.id)
      )
    );
    await loadCameras();
  }

  async function toggleBlackout() {
    if (!classroom) return;
    const next = !classroom.blacked_out;
    setClassroom({ ...classroom, blacked_out: next });
    const { error: updateError } = await createClient()
      .from("classrooms")
      .update({ blacked_out: next })
      .eq("id", classroom.id);
    if (updateError) setError(updateError.message);
  }

  async function copyScreenLink() {
    const url = `${window.location.origin}/screen/${classroomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link. Open it from the button instead.");
    }
  }

  if (!isSupabaseConfigured) return <SetupNotice what="Classroom controls" />;

  if (loading) {
    return (
      <div className="py-16 sm:py-20">
        <Container size="wide">
          <p className="text-muted">Loading classroom…</p>
        </Container>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="py-16 sm:py-20">
        <Container size="wide">
          <p className="text-muted">{error ?? "Classroom not found."}</p>
          <Link
            href="/account"
            className="mt-4 inline-block font-medium text-accent hover:underline"
          >
            Back to classrooms
          </Link>
        </Container>
      </div>
    );
  }

  const count = cameras.length;
  const previewIndex = count > 0 ? preview % count : 0;
  const previewCamera = count > 0 ? cameras[previewIndex] : null;
  const previewMode = classroom.blacked_out
    ? "blackout"
    : previewCamera
      ? "live"
      : "boot";
  const screenPath = `/screen/${classroom.id}`;

  return (
    <div className="py-16 sm:py-20">
      <Container size="wide">
        <Link
          href="/account"
          className="text-sm text-muted hover:text-foreground"
        >
          All classrooms
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {classroom.name}
          </h1>
          <Button
            variant={classroom.blacked_out ? "primary" : "secondary"}
            onClick={toggleBlackout}
            aria-pressed={classroom.blacked_out}
          >
            {classroom.blacked_out ? "Show the board" : "Black out"}
          </Button>
        </div>

        {error && (
          <div className="mt-6">
            <FormError message={error} />
          </div>
        )}

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:gap-16">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-8">
              <div>
                <h2 className="text-lg font-semibold">Desk screen</h2>
                <p className="mt-1 max-w-md text-sm text-muted">
                  Open this link on the student&apos;s device to pair it with
                  this room.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={copyScreenLink}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <ButtonLink href={screenPath} variant="secondary">
                  Open
                </ButtonLink>
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-lg font-semibold">Cameras</h2>
              <p className="mt-1 text-sm text-muted">
                One per thing the student needs to see. Next view cycles them
                in this order.
              </p>

              <ul className="mt-6 divide-y divide-black/10 border-y border-black/10">
                {cameras.map((camera, i) => (
                  <li key={camera.id} className="py-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-2.5 w-4 shrink-0 text-sm text-muted">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <label
                          className="sr-only"
                          htmlFor={`label-${camera.id}`}
                        >
                          Camera name
                        </label>
                        <BareInput
                          id={`label-${camera.id}`}
                          value={camera.label}
                          maxLength={80}
                          onChange={(e) =>
                            setCameras((current) =>
                              current.map((c) =>
                                c.id === camera.id
                                  ? { ...c, label: e.target.value }
                                  : c
                              )
                            )
                          }
                          onBlur={(e) =>
                            updateCamera(camera.id, {
                              label: e.target.value.trim() || "Camera",
                            })
                          }
                        />
                        <details className="mt-3" open={Boolean(camera.stream_url)}>
                          <summary className="cursor-pointer text-sm text-muted hover:text-foreground">
                            Camera address
                          </summary>
                          <label
                            className="sr-only"
                            htmlFor={`url-${camera.id}`}
                          >
                            Camera address for {camera.label}
                          </label>
                          <BareInput
                            id={`url-${camera.id}`}
                            type="url"
                            className="mt-2"
                            placeholder="https://"
                            value={camera.stream_url ?? ""}
                            onChange={(e) =>
                              setCameras((current) =>
                                current.map((c) =>
                                  c.id === camera.id
                                    ? { ...c, stream_url: e.target.value }
                                    : c
                                )
                              )
                            }
                            onBlur={(e) =>
                              updateCamera(camera.id, {
                                stream_url: e.target.value.trim() || null,
                              })
                            }
                          />
                          <p className="mt-2 text-sm text-muted">
                            The address this camera streams to. Leave blank
                            until the hardware is set up.
                          </p>
                        </details>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <IconButton
                          label={`Move ${camera.label} up`}
                          disabled={i === 0}
                          onClick={() => moveCamera(camera.id, -1)}
                        >
                          ↑
                        </IconButton>
                        <IconButton
                          label={`Move ${camera.label} down`}
                          disabled={i === cameras.length - 1}
                          onClick={() => moveCamera(camera.id, 1)}
                        >
                          ↓
                        </IconButton>
                        <IconButton
                          label={`Remove ${camera.label}`}
                          onClick={() => removeCamera(camera.id)}
                        >
                          ×
                        </IconButton>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <form
                onSubmit={addCamera}
                className="mt-6 flex flex-col gap-3 sm:flex-row"
              >
                <label className="sr-only" htmlFor="new-camera">
                  New camera name
                </label>
                <BareInput
                  id="new-camera"
                  placeholder="Front whiteboard"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                  maxLength={80}
                />
                <Button type="submit" disabled={adding} className="shrink-0">
                  {adding ? "Adding…" : "Add a view"}
                </Button>
              </form>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="mb-3 text-sm text-muted">What the student sees</h2>
            <DeviceFrame>
              <ScreenCanvas
                compact
                mode={previewMode}
                camera={previewCamera}
                time={time ?? undefined}
                cameraIndex={previewIndex}
                cameraCount={count}
                onNextCamera={() => setPreview((p) => p + 1)}
              />
            </DeviceFrame>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-black/10 text-muted transition-colors hover:bg-black/[.03] hover:text-foreground disabled:opacity-35 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  );
}
