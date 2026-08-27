import type { Desk } from "@/lib/types";

export const GRID = 12;

export function spanCols(desk: Desk) {
  return Math.max(1, desk.col_span ?? 1);
}

export function spanRows(desk: Desk) {
  return Math.max(1, desk.row_span ?? 1);
}

export function coversCell(desk: Desk, row: number, col: number) {
  return (
    row >= desk.row &&
    row < desk.row + spanRows(desk) &&
    col >= desk.col &&
    col < desk.col + spanCols(desk)
  );
}

export function occupiedCells(desks: Desk[], ignoreId?: string) {
  const taken = new Set<string>();
  for (const desk of desks) {
    if (desk.id === ignoreId) continue;
    const rows = spanRows(desk);
    const cols = spanCols(desk);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        taken.add(`${desk.row + r}:${desk.col + c}`);
      }
    }
  }
  return taken;
}

export function canPlace(
  desks: Desk[],
  row: number,
  col: number,
  colSpan = 1,
  rowSpan = 1,
  ignoreId?: string
) {
  if (row < 0 || col < 0) return false;
  if (row + rowSpan > GRID || col + colSpan > GRID) return false;
  const taken = occupiedCells(desks, ignoreId);
  for (let r = 0; r < rowSpan; r++) {
    for (let c = 0; c < colSpan; c++) {
      if (taken.has(`${row + r}:${col + c}`)) return false;
    }
  }
  return true;
}

export function nextEmptyCell(
  desks: Desk[],
  colSpan = 1,
  rowSpan = 1
): { row: number; col: number } | null {
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (canPlace(desks, row, col, colSpan, rowSpan)) {
        return { row, col };
      }
    }
  }
  return null;
}

export function deskAt(desks: Desk[], row: number, col: number) {
  return desks.find((desk) => coversCell(desk, row, col)) ?? null;
}
