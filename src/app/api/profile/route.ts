import { NextResponse } from "next/server";
import { errorResponse, fail } from "@/lib/api";
import { getFreshAccessToken, getSession } from "@/lib/session";
import { avatarUrl, getProfile } from "@/lib/spotify";

/**
 * Re-reads the user's Spotify profile (name and picture) into the session.
 * The header calls this once for sessions that have not looked up a picture
 * yet, so nobody has to log out and in again to get theirs.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session.userId) return fail(401, "Log in with Spotify first.");

    const token = await getFreshAccessToken(session);
    if (!token) return fail(401, "Your Spotify session expired. Log in again.");

    const profile = await getProfile(token);
    session.displayName = profile.display_name || profile.id;
    session.avatarUrl = avatarUrl(profile);
    session.avatarChecked = true;
    await session.save();

    return NextResponse.json({ avatarUrl: session.avatarUrl ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
