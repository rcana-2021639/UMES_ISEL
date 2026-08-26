export type RangeMode = "day" | "week" | "month";

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Given an anchor date and a mode (día/semana/mes), returns the [from, to] range it covers. */
export function rangeFor(mode: RangeMode, anchor: Date): { from: Date; to: Date } {
  if (mode === "day") {
    return { from: anchor, to: anchor };
  }
  if (mode === "week") {
    const from = startOfWeekMonday(anchor);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    return { from, to };
  }
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from, to };
}
