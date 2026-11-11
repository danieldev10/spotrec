"use client";

import { useEffect, useState } from "react";

/**
 * The user's Spotify profile picture, or a generic person icon when there is
 * none. With `lookUp`, the picture is fetched from Spotify first (used for
 * sessions that have not looked one up yet).
 */
export function Avatar({ url, lookUp = false }: { url?: string; lookUp?: boolean }) {
  const [fetched, setFetched] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!lookUp) return;
    let cancelled = false;
    fetch("/api/profile", { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.avatarUrl === "string") setFetched(data.avatarUrl);
      })
      .catch(() => {}); // the default icon stays
    return () => {
      cancelled = true;
    };
  }, [lookUp]);

  const src = url ?? fetched;

  if (src && !failed) {
    return (
      // A plain <img>: Spotify serves profile pictures from several hosts, and
      // at this size there is nothing for next/image to optimise.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={32}
        height={32}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-8 shrink-0 rounded-full border border-line object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-zinc-400"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
  );
}
