"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/Button";
import { Container } from "@/components/layout";
import { BareInput, FormError } from "@/components/form";
import { SetupNotice } from "@/components/SetupNotice";
import { ScreenCanvas, DeviceFrame } from "@/components/ScreenCanvas";
import { SeatingChart, nextEmptyCell } from "@/components/SeatingChart";
import { StudentRoster } from "@/components/StudentRoster";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useClock } from "@/lib/useClock";
import { isPin, randomPin } from "@/lib/pins";
import type {
  Camera,
  Classroom,
  Desk,
  DeskKind,
  PinMode,
  Student,
} from "@/lib/types";
import { deskLabel } from "@/lib/types";

const STUDENT_COLS =
  "id, classroom_id, display_name, pin, desk_id, blacked_out, created_at";

export default function ClassroomPage() {
  const params = useParams<{ id: string }>();
  const classroomId = params.id;
  const router = useRouter();
  const time = useClock();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newStudent, setNewStudent] = useState("");
  const [adding, setAdding] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [preview, setPreview] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadCameras = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("cameras")
      .select("*")
      .eq("classroom_id", classroomId)
      .order("position");
    setCameras((data ?? []) as Camera[]);
  }, [classroomId]);

  const loadDesks = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("desks")
      .select("*")
      .eq("classroom_id", classroomId)
      .order("row")
      .order("col");
    setDesks((data ?? []) as Desk[]);
  }, [classroomId]);

  const loadStudents = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("students")
      .select(STUDENT_COLS)
      .eq("classroom_id", classroomId)
      .order("display_name");
    setStudents((data ?? []) as Student[]);
  }, [classroomId]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    Promise.resolve()
      .then(async () => {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (!data.session?.user) {
          router.replace(`/login?next=/account/classrooms/${classroomId}`);
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
          return;
        }
        setClassroom(room as Classroom);
        await Promise.all([loadCameras(), loadDesks(), loadStudents()]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [classroomId, router, loadCameras, loadDesks, loadStudents]);

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

  async function setPinMode(pin_mode: PinMode) {
    if (!classroom) return;
    setClassroom({ ...classroom, pin_mode });
    const { error: updateError } = await createClient()
      .from("classrooms")
      .update({ pin_mode })
      .eq("id", classroom.id);
    if (updateError) setError(updateError.message);
  }

  async function placeDesk(row: number, col: number, kind: DeskKind = "empty") {
    setError(null);
    const { data, error: insertError } = await createClient()
      .from("desks")
      .insert({ classroom_id: classroomId, row, col, kind })
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSelectedId((data as Desk).id);
    await loadDesks();
  }

  async function addScreenDesk() {
    const cell = nextEmptyCell(desks);
    if (!cell) {
      setError("The chart is full. Remove a desk first.");
      return;
    }
    await placeDesk(cell.row, cell.col, "screen");
  }

  async function updateDesk(id: string, patch: Partial<Desk>) {
    setError(null);
    setDesks((current) =>
      current.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, ...patch };
        if (patch.kind === "empty") next.screen_token = null;
        return next;
      })
    );
    const { data, error: updateError } = await createClient()
      .from("desks")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (updateError) {
      setError(updateError.message);
      await loadDesks();
      return;
    }
    if (data) {
      setDesks((current) =>
        current.map((d) => (d.id === id ? (data as Desk) : d))
      );
    }
  }

  async function removeDesk(id: string) {
    setError(null);
    const { error: deleteError } = await createClient()
      .from("desks")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (selectedId === id) setSelectedId(null);
    await Promise.all([loadDesks(), loadStudents()]);
  }

  async function assignStudent(studentId: string, deskId: string | null) {
    setError(null);
    const supabase = createClient();
    if (deskId) {
      const { error: clearError } = await supabase
        .from("students")
        .update({ desk_id: null })
        .eq("desk_id", deskId)
        .neq("id", studentId);
      if (clearError) {
        setError(clearError.message);
        return;
      }
    }
    const { error: updateError } = await supabase
      .from("students")
      .update({ desk_id: deskId })
      .eq("id", studentId);
    if (updateError) {
      setError(friendlyStudentError(updateError.message));
      return;
    }
    await loadStudents();
  }

  function unusedPin(excludeId?: string) {
    const used = new Set(
      students.filter((s) => s.id !== excludeId).map((s) => s.pin)
    );
    for (let i = 0; i < 50; i++) {
      const pin = randomPin();
      if (!used.has(pin)) return pin;
    }
    return null;
  }

  async function addStudent(event: React.FormEvent) {
    event.preventDefault();
    const display_name = newStudent.trim();
    if (!display_name) return;
    const pin = unusedPin();
    if (!pin) {
      setError("Couldn't make a unique PIN. Try again.");
      return;
    }

    setError(null);
    setAddingStudent(true);
    const { error: insertError } = await createClient()
      .from("students")
      .insert({ classroom_id: classroomId, display_name, pin });
    setAddingStudent(false);

    if (insertError) {
      setError(friendlyStudentError(insertError.message));
      return;
    }
    setNewStudent("");
    await loadStudents();
  }

  async function setStudentPin(student: Student, pin: string) {
    if (!isPin(pin)) {
      setError("A PIN is four digits.");
      return;
    }
    setError(null);
    const { error: updateError } = await createClient()
      .from("students")
      .update({ pin })
      .eq("id", student.id);
    if (updateError) {
      setError(friendlyStudentError(updateError.message));
      return;
    }
    await loadStudents();
  }

  async function randomizePin(student: Student) {
    const pin = unusedPin(student.id);
    if (!pin) {
      setError("Couldn't make a unique PIN. Try again.");
      return;
    }
    await setStudentPin(student, pin);
  }

  async function toggleStudentBlackout(student: Student) {
    setError(null);
    const { error: updateError } = await createClient()
      .from("students")
      .update({ blacked_out: !student.blacked_out })
      .eq("id", student.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadStudents();
  }

  async function removeStudent(student: Student) {
    setError(null);
    const { error: deleteError } = await createClient()
      .from("students")
      .delete()
      .eq("id", student.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadStudents();
  }

  async function copyDeskLink(token: string) {
    const url = `${window.location.origin}/screen/s/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link. Open it from the button instead.");
    }
  }

  async function rotateDeskLink(deskId: string) {
    setError(null);
    const { data, error: rpcError } = await createClient().rpc(
      "rotate_desk_token",
      { p_desk: deskId }
    );
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await loadDesks();
    return data as string;
  }

  if (!isSupabaseConfigured) return <SetupNotice what="This classroom" />;

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
  const selected = desks.find((d) => d.id === selectedId) ?? null;
  const seatedHere = selected
    ? students.find((s) => s.desk_id === selected.id) ?? null
    : null;
  const pairPath = selected?.screen_token
    ? `/screen/s/${selected.screen_token}`
    : null;

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
            {classroom.blacked_out ? "Show every board" : "Black out all"}
          </Button>
        </div>

        {error && (
          <div className="mt-6">
            <FormError message={error} />
          </div>
        )}

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:gap-16">
          <div>
            <div className="border-b border-black/10 pb-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Seating</h2>
                  <p className="mt-1 max-w-md text-sm text-muted">
                    Tap a square to add a seat. Mark the ones that have a
                    screen, then seat students.
                  </p>
                </div>
                <Button variant="secondary" onClick={addScreenDesk}>
                  Add a screen
                </Button>
              </div>

              <div className="mt-6">
                <SeatingChart
                  desks={desks}
                  students={students}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onPlace={(row, col) => placeDesk(row, col, "empty")}
                />
              </div>

              {selected && (
                <DeskPanel
                  desk={selected}
                  student={seatedHere}
                  students={students}
                  copied={copied}
                  pairPath={pairPath}
                  onKind={(kind) => updateDesk(selected.id, { kind })}
                  onLabel={(label) =>
                    updateDesk(selected.id, {
                      label: label.trim() || null,
                    })
                  }
                  onAssign={(studentId) =>
                    studentId
                      ? assignStudent(studentId, selected.id)
                      : seatedHere
                        ? assignStudent(seatedHere.id, null)
                        : undefined
                  }
                  onCopy={() =>
                    selected.screen_token &&
                    copyDeskLink(selected.screen_token)
                  }
                  onRotate={() => rotateDeskLink(selected.id)}
                  onRemove={() => removeDesk(selected.id)}
                  onBlackout={
                    seatedHere
                      ? () => toggleStudentBlackout(seatedHere)
                      : undefined
                  }
                />
              )}
            </div>

            <div className="mt-10 border-b border-black/10 pb-10">
              <h2 className="text-lg font-semibold">Students</h2>
              <p className="mt-1 max-w-lg text-sm text-muted">
                Each student has a PIN. You can tell them the number; they
                enter it on the desk screen.
              </p>

              <fieldset className="mt-5">
                <legend className="text-sm font-medium">How they sign in</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <PinModeOption
                    name="pin-mode"
                    checked={classroom.pin_mode === "assigned_desk"}
                    onChange={() => setPinMode("assigned_desk")}
                    title="Assigned seats"
                    detail="You choose the desk. They enter their PIN there."
                  />
                  <PinModeOption
                    name="pin-mode"
                    checked={classroom.pin_mode === "pin_as_id"}
                    onChange={() => setPinMode("pin_as_id")}
                    title="PIN is enough"
                    detail="They can use any screen. Their PIN finds them."
                  />
                </div>
              </fieldset>

              <div className="mt-6">
                <StudentRoster
                  students={students}
                  desks={desks}
                  newName={newStudent}
                  onNewName={setNewStudent}
                  adding={addingStudent}
                  onAdd={addStudent}
                  onAssign={assignStudent}
                  onRandomPin={randomizePin}
                  onCustomPin={setStudentPin}
                  onBlackout={toggleStudentBlackout}
                  onRemove={removeStudent}
                />
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-lg font-semibold">Cameras</h2>
              <p className="mt-1 text-sm text-muted">
                One for each board or poster. Next view walks through them in
                this order.
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
                        <details
                          className="mt-3"
                          open={Boolean(camera.stream_url)}
                        >
                          <summary className="cursor-pointer text-sm text-muted hover:text-foreground">
                            Camera link
                          </summary>
                          <label
                            className="sr-only"
                            htmlFor={`url-${camera.id}`}
                          >
                            Camera link for {camera.label}
                          </label>
                          <BareInput
                            id={`url-${camera.id}`}
                            type="url"
                            className="mt-2"
                            placeholder="Paste the camera link"
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
                            Only needed after the camera is installed. Leave
                            blank until then.
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
                  {adding ? "Adding…" : "Add a camera"}
                </Button>
              </form>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="mb-3 text-sm text-muted">Teacher preview</h2>
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
            <p className="mt-3 text-sm text-muted">
              Desk screens use their own link, after a PIN.
            </p>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function DeskPanel({
  desk,
  student,
  students,
  copied,
  pairPath,
  onKind,
  onLabel,
  onAssign,
  onCopy,
  onRotate,
  onRemove,
  onBlackout,
}: {
  desk: Desk;
  student: Student | null;
  students: Student[];
  copied: boolean;
  pairPath: string | null;
  onKind: (kind: DeskKind) => void;
  onLabel: (label: string) => void;
  onAssign: (studentId: string) => void;
  onCopy: () => void;
  onRotate: () => void;
  onRemove: () => void;
  onBlackout?: () => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-black/8 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-semibold">{deskLabel(desk)}</h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-muted hover:text-foreground"
        >
          Remove desk
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <KindToggle
          active={desk.kind === "empty"}
          onClick={() => onKind("empty")}
        >
          Seat
        </KindToggle>
        <KindToggle
          active={desk.kind === "screen"}
          onClick={() => onKind("screen")}
        >
          Screen
        </KindToggle>
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block font-medium">Name this desk</span>
        <BareInput
          defaultValue={desk.label ?? ""}
          key={`${desk.id}-label`}
          maxLength={40}
          placeholder="Window"
          onBlur={(e) => onLabel(e.target.value)}
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block font-medium">Student</span>
        <select
          className="w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-base"
          value={student?.id ?? ""}
          onChange={(e) => onAssign(e.target.value)}
        >
          <option value="">Nobody here</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name}
            </option>
          ))}
        </select>
      </label>

      {student && onBlackout && (
        <Button
          variant="secondary"
          className="mt-4"
          onClick={onBlackout}
          aria-pressed={student.blacked_out}
        >
          {student.blacked_out
            ? `Show the board for ${student.display_name}`
            : `Black out ${student.display_name}`}
        </Button>
      )}

      {desk.kind === "screen" && pairPath && (
        <div className="mt-6 border-t border-black/8 pt-5">
          <p className="text-sm text-muted">
            Open this on the desk screen.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onCopy}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <ButtonLink href={pairPath} variant="secondary">
              Open
            </ButtonLink>
            <Button variant="ghost" onClick={onRotate}>
              New link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function KindToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
        active
          ? "border-foreground bg-foreground text-white"
          : "border-black/10 bg-white text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PinModeOption({
  name,
  checked,
  onChange,
  title,
  detail,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${
        checked ? "border-foreground bg-white" : "border-black/10 bg-white"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1"
      />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm text-muted">{detail}</span>
      </span>
    </label>
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

function friendlyStudentError(message: string) {
  if (message.toLowerCase().includes("students_classroom_id_pin")) {
    return "That PIN is already used in this classroom.";
  }
  if (message.toLowerCase().includes("students_one_per_desk")) {
    return "Someone is already sitting at that desk.";
  }
  return message;
}
