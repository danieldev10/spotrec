import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { CuratorError } from "./curator";
import { ConfigError } from "./env";
import { SpotifyError } from "./spotify";

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** Turns anything thrown while building or creating a playlist into a message for the user. */
export function errorResponse(error: unknown) {
  console.error("Playlist request failed:", error);

  if (error instanceof ConfigError) return fail(500, error.message);
  if (error instanceof CuratorError) return fail(422, error.message);

  if (error instanceof SpotifyError) {
    if (error.status === 401) {
      return fail(401, "Your Spotify session expired. Log out and log in again.");
    }
    if (error.status === 403) {
      return fail(
        403,
        "Spotify refused the request. While the app is in development mode, its owner needs Spotify Premium and your account must be added under User Management in the Spotify developer dashboard.",
      );
    }
    if (error.status === 429) return fail(429, "Spotify is rate limiting us. Try again in a minute.");
    return fail(502, "Spotify returned an error. Please try again.");
  }

  if (error instanceof Anthropic.AuthenticationError) {
    return fail(500, "The Claude API key was rejected. Check ANTHROPIC_API_KEY in .env.local.");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return fail(429, "Claude is rate limiting us. Try again in a minute.");
  }
  if (error instanceof Anthropic.APIError) {
    return fail(502, "Claude returned an error. Please try again.");
  }

  return fail(500, "Something went wrong. Please try again.");
}

/** Runs `task` over `items` with at most `limit` in flight, keeping the input order. */
export async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
