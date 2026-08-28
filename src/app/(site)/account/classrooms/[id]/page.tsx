"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/Button";
import { Container } from "@/components/layout";
import { BareInput, FormError } from "@/components/form";
import { SetupNotice } from "@/components/SetupNotice";
import { ScreenCanvas, DeviceFrame } from "@/components/ScreenCanvas";
import { SeatingChart } from "@/components/SeatingChart";
import { StudentRoster } from "@/components/StudentRoster";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useClock } from "@/lib/useClock";
import { isPin, randomPin } from "@/lib/pins";
import { canPlace, nextEmptyCell, spanCols, spanRows } from "@/lib/seating";
import type {
  Camera,
  Classroom,
  Desk,
  DeskKind,
  PinMode,
  Student,
} from "@/lib/types";
import { deskLabel, isStudentDesk } from "@/lib/types";

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinsCopied, setPinsCopied] = useState(false);
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

  useEffect(() => {
    if (!classroomId || loading) return;
    const id = window.setInterval(() => {
      loadDesks();
      loadStudents();
    }, 4000);
    return () => window.clearInterval(id);
  }, [classroomId, loading, loadDesks, loadStudents]);

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
    const camera = cameras.find((c) => c.id === id);
    if (!window.confirm(`Remove ${camera?.label ?? "this camera"}?`)) return;
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

  async function renameClassroom(name: string) {
    if (!classroom) return;
    const next = name.trim();
    if (!next || next === classroom.name) return;
    setClassroom({ ...classroom, name: next });
    const { error: updateError } = await createClient()
      .from("classrooms")
      .update({ name: next })
      .eq("id", classroom.id);
    if (updateError) {
      setError(updateError.message);
      setClassroom({ ...classroom, name: classroom.name });
    }
  }

  async function deleteClassroom() {
    if (!classroom) return;
    if (
      !window.confirm(
        `Remove ${classroom.name} and everyone in it? This cannot be undone.`
      )
    ) {
      return;
    }
    setError(null);
    const { error: deleteError } = await createClient()
      .from("classrooms")
      .delete()
      .eq("id", classroom.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push("/account");
  }

  async function copyPins() {
    if (students.length === 0) return;
    const text = students
      .map((s) => `${s.display_name}  ${s.pin}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setPinsCopied(true);
      window.setTimeout(() => setPinsCopied(false), 2000);
    } catch {
      setError("Couldn't copy the PINs.");
    }
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

  async function placeDesk(
    row: number,
    col: number,
    kind: DeskKind = "empty",
    extra: Partial<Desk> = {}
  ) {
    const colSpan = extra.col_span ?? 1;
    const rowSpan = extra.row_span ?? 1;
    if (!canPlace(desks, row, col, colSpan, rowSpan)) {
      setError("That doesn't fit. Move something first.");
      return;
    }
    setError(null);
    const { data, error: insertError } = await createClient()
      .from("desks")
      .insert({
        classroom_id: classroomId,
        row,
        col,
        kind,
        label: extra.label ?? null,
        col_span: colSpan,
        row_span: rowSpan,
      })
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

  async function addTeacherDesk() {
    const width = 3;
    const cell =
      nextEmptyCell(desks, width, 1) ?? nextEmptyCell(desks, 1, 1);
    if (!cell) {
      setError("The chart is full. Remove a desk first.");
      return;
    }
    const colSpan = canPlace(desks, cell.row, cell.col, width, 1) ? width : 1;
    await placeDesk(cell.row, cell.col, "fixture", {
      label: "Teacher's desk",
      col_span: colSpan,
      row_span: 1,
    });
  }

  async function moveDesk(id: string, row: number, col: number) {
    const desk = desks.find((d) => d.id === id);
    if (!desk) return;
    if (desk.row === row && desk.col === col) return;
    if (!canPlace(desks, row, col, spanCols(desk), spanRows(desk), id)) {
      setError("That doesn't fit. Move something first.");
      return;
    }
    await updateDesk(id, { row, col });
  }

  async function updateDesk(id: string, patch: Partial<Desk>) {
    const desk = desks.find((d) => d.id === id);
    if (!desk) return;
    const nextCols = patch.col_span ?? spanCols(desk);
    const nextRows = patch.row_span ?? spanRows(desk);
    const nextRow = patch.row ?? desk.row;
    const nextCol = patch.col ?? desk.col;
    if (
      !canPlace(desks, nextRow, nextCol, nextCols, nextRows, id)
    ) {
      setError("That doesn't fit. Move something first.");
      return;
    }

    setError(null);
    if (patch.kind === "fixture") {
      await createClient()
        .from("students")
        .update({ desk_id: null })
        .eq("desk_id", id);
    }
    setDesks((current) =>
      current.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, ...patch };
        if (patch.kind === "empty" || patch.kind === "fixture") {
          next.screen_token = null;
        }
        if (patch.kind === "empty" || patch.kind === "screen") {
          next.col_span = 1;
          next.row_span = 1;
        }
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
    if (patch.kind === "fixture") await loadStudents();
  }

  async function removeDesk(id: string) {
    if (!window.confirm("Remove this from the chart?")) return;
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
      const desk = desks.find((d) => d.id === deskId);
      if (desk && !isStudentDesk(desk)) {
        setError("That isn't a student seat.");
        return;
      }
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

  async function renameStudent(student: Student, display_name: string) {
    const name = display_name.trim();
    if (!name || name === student.display_name) return;
    setError(null);
    const { error: updateError } = await createClient()
      .from("students")
      .update({ display_name: name })
      .eq("id", student.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
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
    if (!window.confirm(`Remove ${student.display_name}?`)) return;
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

  async function copyDeskLink(desk: Desk) {
    if (!desk.screen_token) return;
    const url = `${window.location.origin}/screen/s/${desk.screen_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(desk.id);
      window.setTimeout(() => setCopiedId(null), 2000);
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
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="classroom-name">
              Classroom name
            </label>
            <input
              id="classroom-name"
              defaultValue={classroom.name}
              key={classroom.id}
              maxLength={80}
              autoComplete="off"
              className="w-full max-w-xl bg-transparent text-3xl font-semibold tracking-tight outline-none hover:bg-white/60 focus-visible:rounded-md sm:text-4xl"
              onBlur={(e) => void renameClassroom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
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
                    Tap a square to add a seat. Drag to move, or tap a seat
                    and use the arrows. Add a teacher&apos;s desk if the front
                    of the room isn&apos;t a row of seats.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={addTeacherDesk}>
                    Add teacher&apos;s desk
                  </Button>
                  <Button variant="secondary" onClick={addScreenDesk}>
                    Add a screen
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <SeatingChart
                  desks={desks}
                  students={students}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onPlace={(row, col) => placeDesk(row, col, "empty")}
                  onMove={moveDesk}
                />
              </div>

              {selected && (
                <DeskPanel
                  desk={selected}
                  student={seatedHere}
                  students={students}
                  copied={copiedId === selected.id}
                  pairPath={pairPath}
                  onKind={(kind) => updateDesk(selected.id, { kind })}
                  onLabel={(label) =>
                    updateDesk(selected.id, {
                      label: label.trim() || null,
                    })
                  }
                  onSpan={(col_span, row_span) =>
                    updateDesk(selected.id, { col_span, row_span })
                  }
                  onAssign={(studentId) =>
                    studentId
                      ? assignStudent(studentId, selected.id)
                      : seatedHere
                        ? assignStudent(seatedHere.id, null)
                        : undefined
                  }
                  onNudge={(dRow, dCol) =>
                    void moveDesk(
                      selected.id,
                      selected.row + dRow,
                      selected.col + dCol
                    )
                  }
                  canNudge={(dRow, dCol) =>
                    canPlace(
                      desks,
                      selected.row + dRow,
                      selected.col + dCol,
                      spanCols(selected),
                      spanRows(selected),
                      selected.id
                    )
                  }
                  onCopy={() => copyDeskLink(selected)}
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
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Students</h2>
                  <p className="mt-1 max-w-lg text-sm text-muted">
                    Each student has a PIN. You can tell them the number; they
                    enter it on the desk screen.
                  </p>
                </div>
                {students.length > 0 ? (
                  <Button variant="secondary" onClick={() => void copyPins()}>
                    {pinsCopied ? "Copied" : "Copy PINs"}
                  </Button>
                ) : null}
              </div>

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
                  onRename={renameStudent}
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
            <Link
              href={`/screen/${classroom.id}`}
              className="mt-2 inline-block text-sm text-accent hover:underline"
            >
              Open full screen
            </Link>
          </aside>
        </div>

        <div className="mt-16 border-t border-black/10 pt-6">
          <button
            type="button"
            onClick={() => void deleteClassroom()}
            className="text-sm text-muted hover:text-red-800"
          >
            Remove this classroom
          </button>
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
  onSpan,
  onAssign,
  onNudge,
  canNudge,
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
  onSpan: (colSpan: number, rowSpan: number) => void;
  onAssign: (studentId: string) => void;
  onNudge: (dRow: number, dCol: number) => void;
  canNudge: (dRow: number, dCol: number) => boolean;
  onCopy: () => void;
  onRotate: () => void;
  onRemove: () => void;
  onBlackout?: () => void;
}) {
  const studentDesk = isStudentDesk(desk);
  return (
    <div className="mt-6 rounded-xl border border-black/8 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-semibold">{deskLabel(desk)}</h3>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-muted hover:text-foreground"
        >
          Remove
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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
        <KindToggle
          active={desk.kind === "fixture"}
          onClick={() => onKind("fixture")}
        >
          Other
        </KindToggle>
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block font-medium">
          {desk.kind === "fixture" ? "What is this" : "Name this desk"}
        </span>
        <BareInput
          defaultValue={desk.label ?? ""}
          key={`${desk.id}-label`}
          maxLength={40}
          placeholder={
            desk.kind === "fixture" ? "Teacher's desk" : "Window"
          }
          onBlur={(e) => onLabel(e.target.value)}
        />
      </label>

      <div className="mt-4">
        <p className="mb-1.5 text-sm font-medium">Move</p>
        <div className="grid w-[6.75rem] grid-cols-3 gap-1">
          <span />
          <IconButton
            label="Move up"
            disabled={!canNudge(-1, 0)}
            onClick={() => onNudge(-1, 0)}
          >
            ↑
          </IconButton>
          <span />
          <IconButton
            label="Move left"
            disabled={!canNudge(0, -1)}
            onClick={() => onNudge(0, -1)}
          >
            ←
          </IconButton>
          <span className="flex items-center justify-center text-[0.65rem] tabular-nums text-muted">
            {desk.col + 1},{desk.row + 1}
          </span>
          <IconButton
            label="Move right"
            disabled={!canNudge(0, 1)}
            onClick={() => onNudge(0, 1)}
          >
            →
          </IconButton>
          <span />
          <IconButton
            label="Move down"
            disabled={!canNudge(1, 0)}
            onClick={() => onNudge(1, 0)}
          >
            ↓
          </IconButton>
        </div>
      </div>

      {desk.kind === "fixture" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">How wide</span>
            <BareInput
              type="number"
              min={1}
              max={12 - desk.col}
              key={`${desk.id}-wide-${desk.col_span}`}
              defaultValue={desk.col_span}
              onBlur={(e) =>
                onSpan(Number(e.target.value) || 1, desk.row_span)
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">How deep</span>
            <BareInput
              type="number"
              min={1}
              max={12 - desk.row}
              key={`${desk.id}-deep-${desk.row_span}`}
              defaultValue={desk.row_span}
              onBlur={(e) =>
                onSpan(desk.col_span, Number(e.target.value) || 1)
              }
            />
          </label>
        </div>
      )}

      {studentDesk && (
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
      )}

      {studentDesk && student && onBlackout && (
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
