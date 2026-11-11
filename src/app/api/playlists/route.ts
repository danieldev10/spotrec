import { type NextRequest, NextResponse } from "next/server";
import { errorResponse, fail } from "@/lib/api";
import { CreateRequest } from "@/lib/draft";
import { getFreshAccessToken, getSession } from "@/lib/session";
import { addTracks, createPlaylist } from "@/lib/spotify";

/** Creates a finished draft as a private playlist in the user's Spotify account. */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) return fail(401, "Log in with Spotify first.");

    const body = CreateRequest.safeParse(await request.json().catch(() => null));
    if (!body.success) return fail(400, "That playlist can't be created. Generate it again.");
    const { name, description, uris } = body.data;

    const token = await getFreshAccessToken(session);
    if (!token) return fail(401, "Your Spotify session expired. Log in again.");

    const playlist = await createPlaylist(token, name, description.replace(/\s+/g, " ").trim());
    await addTracks(token, playlist.id, [...new Set(uris)]);

    return NextResponse.json({ url: playlist.external_urls.spotify }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
