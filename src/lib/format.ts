/** "1 hr 58 min", "45 min" or "2 hr". */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** "34 songs · 2 hr 3 min". */
export function summarize(tracks: { durationMs: number }[]): string {
  const count = `${tracks.length} ${tracks.length === 1 ? "song" : "songs"}`;
  const totalMs = tracks.reduce((sum, track) => sum + track.durationMs, 0);
  return `${count} · ${formatDuration(totalMs)}`;
}
