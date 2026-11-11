import type { SpotifyTrack } from "@/lib/spotify";

export function TrackList({ tracks }: { tracks: SpotifyTrack[] }) {
  return (
    <ol className="space-y-1.5 text-sm">
      {tracks.map((track, index) => (
        <li key={track.uri} className="flex gap-3">
          <span className="w-5 shrink-0 text-right tabular-nums text-zinc-600">{index + 1}</span>
          <a
            href={track.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 truncate hover:underline"
          >
            {track.name}
            <span className="text-zinc-500"> · {track.artists}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
