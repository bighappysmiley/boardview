import type { Desk, Student } from "@/lib/types";

const MAX = 8;

export function nextEmptyCell(desks: Desk[]): { row: number; col: number } | null {
  const taken = new Set(desks.map((d) => `${d.row}:${d.col}`));
  for (let row = 0; row < MAX; row++) {
    for (let col = 0; col < MAX; col++) {
      if (!taken.has(`${row}:${col}`)) return { row, col };
    }
  }
  return null;
}

export function SeatingChart({
  desks,
  students,
  selectedId,
  onSelect,
  onPlace,
}: {
  desks: Desk[];
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPlace: (row: number, col: number) => void;
}) {
  const maxRow = desks.reduce((m, d) => Math.max(m, d.row), -1);
  const maxCol = desks.reduce((m, d) => Math.max(m, d.col), -1);
  const rowCount = Math.min(MAX, Math.max(4, maxRow + 2));
  const colCount = Math.min(MAX, Math.max(5, maxCol + 2));

  const byCell = new Map(desks.map((d) => [`${d.row}:${d.col}`, d] as const));
  const studentByDesk = new Map(
    students.filter((s) => s.desk_id).map((s) => [s.desk_id as string, s])
  );

  return (
    <div>
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted">
        Front of the room
      </p>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rowCount }, (_, row) =>
          Array.from({ length: colCount }, (_, col) => {
            const desk = byCell.get(`${row}:${col}`);
            const student = desk ? studentByDesk.get(desk.id) : undefined;
            const selected = desk?.id === selectedId;
            const key = `${row}:${col}`;

            if (!desk) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPlace(row, col)}
                  aria-label={`Add a seat at row ${row + 1}, seat ${col + 1}`}
                  className="aspect-square min-h-14 rounded-lg border border-dashed border-black/15 bg-transparent text-muted/40 transition-colors hover:border-black/30 hover:bg-black/[.03] hover:text-muted"
                >
                  +
                </button>
              );
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(selected ? null : desk.id)}
                aria-pressed={selected}
                aria-label={
                  student
                    ? `${student.display_name}, ${
                        desk.kind === "screen" ? "screen" : "seat"
                      }`
                    : `${desk.kind === "screen" ? "Screen" : "Seat"} at row ${
                        row + 1
                      }, seat ${col + 1}`
                }
                className={`flex aspect-square min-h-14 flex-col items-center justify-center rounded-lg border px-1 text-center transition-colors ${
                  selected
                    ? "border-foreground bg-white"
                    : "border-black/10 bg-white hover:border-black/25"
                } ${student?.blacked_out ? "opacity-50" : ""}`}
              >
                {desk.kind === "screen" && (
                  <span
                    aria-hidden="true"
                    className="mb-0.5 h-1.5 w-4 rounded-[1px] bg-foreground"
                  />
                )}
                <span className="w-full truncate text-[0.7rem] font-medium leading-tight">
                  {student?.display_name ??
                    (desk.kind === "screen" ? "Screen" : "Seat")}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
