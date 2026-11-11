import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { Generator } from "@/components/Generator";
import { LogoutButton } from "@/components/LogoutButton";
import { getSession } from "@/lib/session";

const LOGIN_ERRORS: Record<string, string> = {
  config:
    "The app isn't configured yet. Fill in the Spotify values in .env.local and restart the server.",
  denied: "Spotify login was cancelled.",
  state: "The login attempt expired or didn't start here. Please try again.",
  spotify:
    "Spotify login failed. Check the client ID, secret and redirect URI, and that your account is allowed to use the app.",
};

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-10">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <Home searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Home({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  // Decrypting the session checks its expiry against the clock, so this must
  // run for a real request and never as part of a prerender or prefetch.
  await connection();
  const [session, params] = await Promise.all([getSession(), searchParams]);

  if (!session.userId) {
    const error = typeof params.error === "string" ? LOGIN_ERRORS[params.error] : undefined;
    return <Landing error={error} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Spotrec</h1>
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <Avatar url={session.avatarUrl} lookUp={!session.avatarChecked} />
          <span className="truncate text-zinc-400">{session.displayName}</span>
          <LogoutButton />
        </div>
      </header>

      {/* Centred in the space below the header; a long draft simply grows downwards. */}
      <div className="flex flex-1 flex-col justify-center py-6">
        <Generator />
      </div>
    </div>
  );
}

function Landing({ error }: { error?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Describe a playlist.
        <br />
        <span className="text-accent">Find it in your Spotify.</span>
      </h1>
      <p className="mt-5 max-w-md text-zinc-400">
        Write what you want to hear. Spotrec picks the songs, creates the playlist in your
        account and fills it for you.
      </p>
      <a
        href="/api/auth/login"
        className="mt-8 rounded-full bg-accent px-6 py-3 font-medium text-black hover:brightness-110"
      >
        Log in with Spotify
      </a>
      {error && (
        <p role="alert" className="mt-6 max-w-md text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
