"use client";

import { useState, type FormEvent } from "react";
import type { Draft } from "@/lib/draft";
import { summarize } from "@/lib/format";
import { TrackList } from "./TrackList";

type Busy = "drafting" | "editing" | "creating" | null;

const BUSY_TEXT: Record<Exclude<Busy, null>, string> = {
  drafting: "Picking songs and finding them on Spotify. This usually takes under a minute.",
  editing: "Editing the playlist…",
  creating: "Creating the playlist in your Spotify…",
};

async function post(path: string, body: unknown) {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { error: (data?.error as string) ?? "Something went wrong. Please try again." };
    }
    return { data };
  } catch {
    return { error: "Couldn't reach the server. Check your connection and try again." };
  }
}

export function Generator() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  // The playlist being worked on. It exists only in this page until "Create" is clicked.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [edits, setEdits] = useState<string[]>([]);
  const [instruction, setInstruction] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  async function startDraft(event: FormEvent) {
    event.preventDefault();
    const text = prompt.trim();
    if (busy || text.length < 3) return;
    setBusy("drafting");
    setError(null);
    const result = await post("/api/draft", { prompt: text });
    setBusy(null);
    if (result.error || !result.data?.draft) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setDraft(result.data.draft);
    setDraftPrompt(text);
    setEdits([]);
    setInstruction("");
    setCreatedUrl(null);
    setPrompt("");
  }

  async function applyEdit(event: FormEvent) {
    event.preventDefault();
    const text = instruction.trim();
    if (busy || !draft || text.length < 2) return;
    setBusy("editing");
    setError(null);
    const result = await post("/api/draft", {
      prompt: draftPrompt,
      revision: { draft, instruction: text, earlierEdits: edits },
    });
    setBusy(null);
    if (result.error || !result.data?.draft) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return; // the draft and the typed edit are left as they were
    }
    setDraft(result.data.draft);
    setEdits([...edits, text]);
    setInstruction("");
  }

  async function create() {
    if (busy || !draft) return;
    setBusy("creating");
    setError(null);
    const result = await post("/api/playlists", {
      name: draft.name,
      description: draft.description,
      uris: draft.tracks.map((track) => track.uri),
    });
    setBusy(null);
    if (result.error || !result.data?.url) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setCreatedUrl(result.data.url);
  }

  function startOver() {
    setDraft(null);
    setCreatedUrl(null);
    setEdits([]);
    setInstruction("");
    setError(null);
  }

  const status = (
    <>
      {busy && (
        <p role="status" className="mt-4 text-sm text-zinc-400">
          {BUSY_TEXT[busy]}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
    </>
  );

  // Step 1: describe the playlist.
  if (!draft) {
    return (
      <section>
        <h2 className="mb-6 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          <label htmlFor="prompt">
            What do you want <span className="whitespace-nowrap text-accent">to hear?</span>
          </label>
        </h2>
        <form
          onSubmit={startDraft}
          className="rounded-2xl border border-line bg-panel/80 p-4 shadow-2xl shadow-black/40 backdrop-blur focus-within:border-accent/50"
        >
          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="A calm afrobeats playlist for a 2 hour drive…"
            rows={3}
            maxLength={1000}
            disabled={busy !== null}
            className="w-full resize-none bg-transparent text-lg placeholder:text-zinc-600 focus:outline-none disabled:opacity-60"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={busy !== null || prompt.trim().length < 3}
              className="shrink-0 rounded-full bg-accent px-5 py-2 font-medium text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Building…" : "Generate"}
            </button>
          </div>
        </form>

        {status}
      </section>
    );
  }

  // Steps 2 and 3: review and edit the draft, then create it.
  const created = createdUrl !== null;
  return (
    <section>
      <div
        className={`rounded-2xl border bg-panel p-5 ${created ? "border-accent/40" : "border-line"}`}
      >
        {created && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-accent">
            Added to your Spotify
          </p>
        )}
        <h2 className="text-2xl font-semibold tracking-tight">{draft.name}</h2>
        <p className="mt-1 text-sm text-zinc-500">{summarize(draft.tracks)}</p>

        {created && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={createdUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-black hover:brightness-110"
            >
              Open in Spotify ↗
            </a>
            <button
              type="button"
              onClick={startOver}
              className="rounded-full border border-line px-4 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              Make another
            </button>
          </div>
        )}

        {/* The list scrolls inside the card, so a long playlist doesn't stretch the
            page. Its height is the window height minus everything around it (about
            31rem), so the Create button stays on screen. */}
        <div
          className={`track-scroll mt-3 max-h-[max(12rem,calc(100dvh-31rem))] overflow-y-auto pr-2 ${busy === "editing" ? "opacity-50" : ""}`}
        >
          <TrackList tracks={draft.tracks} />
        </div>
      </div>

      {!created && (
        <>
          <form onSubmit={applyEdit} className="mt-4 rounded-2xl border border-line bg-panel p-4">
            <label htmlFor="edit" className="sr-only">
              Describe a change to the playlist
            </label>
            <textarea
              id="edit"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Want changes? e.g. “swap the slow songs for something upbeat”"
              rows={2}
              maxLength={1000}
              disabled={busy !== null}
              className="w-full resize-none bg-transparent placeholder:text-zinc-600 focus:outline-none disabled:opacity-60"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={busy !== null || instruction.trim().length < 2}
                className="rounded-full border border-line px-4 py-1.5 text-sm text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "editing" ? "Editing…" : "Edit"}
              </button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={startOver}
              disabled={busy !== null}
              aria-label="Delete this draft and start over"
              title="Delete draft"
              className="rounded-full border border-line p-2.5 text-zinc-400 hover:border-red-400/60 hover:text-red-400 disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="size-4"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={create}
              disabled={busy !== null}
              className="rounded-full bg-accent px-6 py-2.5 font-medium text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "creating" ? "Creating…" : "Create in Spotify"}
            </button>
          </div>
        </>
      )}

      {status}
    </section>
  );
}
