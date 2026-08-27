import { BareInput } from "@/components/form";
import { Button } from "@/components/Button";
import { deskLabel, type Desk, type Student } from "@/lib/types";

export function StudentRoster({
  students,
  desks,
  newName,
  onNewName,
  adding,
  onAdd,
  onAssign,
  onRandomPin,
  onCustomPin,
  onBlackout,
  onRemove,
}: {
  students: Student[];
  desks: Desk[];
  newName: string;
  onNewName: (value: string) => void;
  adding: boolean;
  onAdd: (event: React.FormEvent) => void;
  onAssign: (studentId: string, deskId: string | null) => void;
  onRandomPin: (student: Student) => void;
  onCustomPin: (student: Student, pin: string) => void;
  onBlackout: (student: Student) => void;
  onRemove: (student: Student) => void;
}) {
  return (
    <div>
      <ul className="divide-y divide-black/10 border-y border-black/10">
        {students.length === 0 && (
          <li className="py-5 text-sm text-muted">
            Add the students who sit in this room. Each one gets a PIN.
          </li>
        )}
        {students.map((student) => (
          <li key={student.id} className="py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{student.display_name}</p>
                <p className="mt-1 font-mono text-sm tabular-nums tracking-widest">
                  PIN {student.pin}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <SmallButton
                  onClick={() => onRandomPin(student)}
                  label={`New PIN for ${student.display_name}`}
                >
                  New PIN
                </SmallButton>
                <SmallButton
                  onClick={() => {
                    const next = window.prompt(
                      `PIN for ${student.display_name}`,
                      student.pin
                    );
                    if (next == null) return;
                    onCustomPin(student, next.trim());
                  }}
                  label={`Set PIN for ${student.display_name}`}
                >
                  Set PIN
                </SmallButton>
                <SmallButton
                  onClick={() => onBlackout(student)}
                  label={
                    student.blacked_out
                      ? `Show the board for ${student.display_name}`
                      : `Black out ${student.display_name}`
                  }
                >
                  {student.blacked_out ? "Show board" : "Black out"}
                </SmallButton>
                <SmallButton
                  onClick={() => onRemove(student)}
                  label={`Remove ${student.display_name}`}
                >
                  Remove
                </SmallButton>
              </div>
            </div>
            <label className="mt-3 block text-sm">
              <span className="sr-only">Desk for {student.display_name}</span>
              <select
                className="w-full max-w-xs rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                value={student.desk_id ?? ""}
                onChange={(e) =>
                  onAssign(student.id, e.target.value || null)
                }
              >
                <option value="">No desk</option>
                {desks.map((desk) => (
                  <option key={desk.id} value={desk.id}>
                    {deskLabel(desk)}
                    {desk.kind === "screen" ? " · screen" : ""}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>

      <form onSubmit={onAdd} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="new-student">
          Student name
        </label>
        <BareInput
          id="new-student"
          placeholder="Maya Chen"
          value={newName}
          onChange={(e) => onNewName(e.target.value)}
          required
          maxLength={80}
        />
        <Button type="submit" disabled={adding} className="shrink-0">
          {adding ? "Adding…" : "Add a student"}
        </Button>
      </form>
    </div>
  );
}

function SmallButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="rounded-md border border-black/10 px-2.5 py-1 text-sm text-muted transition-colors hover:bg-black/[.03] hover:text-foreground"
      {...props}
    >
      {children}
    </button>
  );
}
