import type { SpotifyTrack } from "./spotify";

export type Pick = { title: string; artist: string };

/**
 * Builds the final track list from Claude's picks, in order, stopping once
 * the playlist reaches its target. The target is a running time, or a number
 * of songs when the listener asked for a count instead.
 */
export class Assembly {
  tracks: SpotifyTrack[] = [];
  /** How many picks could not be found on Spotify. */
  notFound = 0;
  totalMs = 0;

  private seen = new Set<string>();
  private targetMs: number | null;
  private targetCount: number | null;
  private maxTracks: number;

  constructor(target: { ms: number } | { count: number }, maxTracks: number) {
    this.targetMs = "ms" in target ? target.ms : null;
    this.targetCount = "count" in target ? target.count : null;
    this.maxTracks = maxTracks;
  }

  get full(): boolean {
    if (this.tracks.length >= this.maxTracks) return true;
    if (this.targetMs !== null) return this.totalMs >= this.targetMs;
    return this.tracks.length >= (this.targetCount ?? 0);
  }

  /** What is still needed to reach the target, or null when it has been reached. */
  get shortfall(): { minutes: number } | { songs: number } | null {
    if (this.full) return null;
    if (this.targetMs !== null) {
      return { minutes: Math.ceil((this.targetMs - this.totalMs) / 60_000) };
    }
    return { songs: (this.targetCount ?? 0) - this.tracks.length };
  }

  /** `found[i]` is the Spotify match for `picks[i]`, or null if there was none. */
  add(picks: Pick[], found: (SpotifyTrack | null)[]) {
    for (let i = 0; i < picks.length && !this.full; i++) {
      const track = found[i];
      if (!track) {
        this.notFound++;
      } else if (!this.seen.has(track.uri)) {
        this.seen.add(track.uri);
        this.tracks.push(track);
        this.totalMs += track.durationMs;
      }
    }
  }
}
