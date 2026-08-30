/**
 * Single authoritative "days remaining" helper for every countdown surface.
 * Uses Math.ceil so a wedding tomorrow always shows "1 day to go", not 0.
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}
