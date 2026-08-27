import { deskLabel, type Desk, type Student } from "@/lib/types";
import { coversCell, GRID, spanCols, spanRows } from "@/lib/seating";

export function SeatingChart({
  desks,
  students,
  selectedId,
  onSelect,
  onPlace,
  onMove,
}: {
  desks: Desk[];
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPlace: (row: number, col: number) => void;
  onMove: (id: string, row: number, col: number) => void;
}) {
  const maxRow = desks.reduce(
    (m, d) => Math.max(m, d.row + spanRows(d) - 1),
    -1
  );
  const maxCol = desks.reduce(
    (m, d) => Math.max(m, d.col + spanCols(d) - 1),
    -1
  );
  const rowCount = Math.min(GRID, Math.max(4, maxRow + 2));
  const colCount = Math.min(GRID, Math.max(5, maxCol + 2));

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
        style={{
          gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rowCount}, minmax(3.5rem, auto))`,
        }}
      >
        {Array.from({ length: rowCount }, (_, row) =>
          Array.from({ length: colCount }, (_, col) => {
            const origin = desks.find((d) => d.row === row && d.col === col);
            if (origin) {
              return (
                <DeskCell
                  key={origin.id}
                  desk={origin}
                  student={studentByDesk.get(origin.id)}
                  selected={origin.id === selectedId}
                  colCount={colCount}
                  rowCount={rowCount}
                  onSelect={onSelect}
                />
              );
            }
            if (desks.some((d) => coversCell(d, row, col))) return null;
            return (
              <button
                key={`${row}:${col}`}
                type="button"
                onClick={() => onPlace(row, col)}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("text/desk-id");
                  if (id) onMove(id, row, col);
                }}
                aria-label={`Add a seat at row ${row + 1}, seat ${col + 1}`}
                style={{ gridColumn: col + 1, gridRow: row + 1 }}
                className="h-full min-h-14 rounded-lg border border-dashed border-black/15 bg-transparent text-muted/40 transition-colors hover:border-black/30 hover:bg-black/[.03] hover:text-muted"
              >
                +
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function DeskCell({
  desk,
  student,
  selected,
  colCount,
  rowCount,
  onSelect,
}: {
  desk: Desk;
  student?: Student;
  selected: boolean;
  colCount: number;
  rowCount: number;
  onSelect: (id: string | null) => void;
}) {
  const cols = Math.min(spanCols(desk), colCount - desk.col);
  const rows = Math.min(spanRows(desk), rowCount - desk.row);
  const kindLabel =
    desk.kind === "screen"
      ? "screen"
      : desk.kind === "fixture"
        ? deskLabel(desk)
        : "seat";

  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/desk-id", desk.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onSelect(selected ? null : desk.id)}
      aria-pressed={selected}
      aria-label={
        student ? `${student.display_name}, ${kindLabel}` : kindLabel
      }
      style={{
        gridColumn: `${desk.col + 1} / span ${cols}`,
        gridRow: `${desk.row + 1} / span ${rows}`,
      }}
      className={`flex h-full min-h-14 flex-col items-center justify-center rounded-lg border px-1 text-center transition-colors ${
        selected
          ? "border-foreground bg-white"
          : desk.kind === "fixture"
            ? "border-black/10 bg-black/[.04] hover:border-black/25"
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
          (desk.kind === "screen"
            ? "Screen"
            : desk.kind === "fixture"
              ? deskLabel(desk)
              : "Seat")}
      </span>
    </button>
  );
}
