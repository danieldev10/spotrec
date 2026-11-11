"use client";

import { useRef } from "react";

/** A sign-out icon that asks for confirmation before logging the user out. */
export function LogoutButton() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Log out"
        title="Log out"
        className="rounded-full border border-line p-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
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
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      </button>

      {/* A native modal dialog: traps focus, and Esc or a click outside closes it. */}
      <dialog
        ref={dialog}
        aria-labelledby="logout-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-panel p-0 text-zinc-100 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <h2 id="logout-title" className="text-lg font-semibold">
            Log out?
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            A draft you haven&rsquo;t created in Spotify yet will be lost.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-full border border-line px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              Cancel
            </button>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-black hover:brightness-110"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
