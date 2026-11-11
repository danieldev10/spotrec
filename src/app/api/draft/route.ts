import { type NextRequest, NextResponse } from "next/server";
import { errorResponse, fail, mapLimit } from "@/lib/api";
import { Assembly, type Pick } from "@/lib/assemble";
import { curateMore, curatePlaylist, MAX_MINUTES, revisePlaylist } from "@/lib/curator";
import { type Draft, DraftRequest, MAX_TRACKS } from "@/lib/draft";
import { getFreshAccessToken, getSession } from "@/lib/session";
import { findTrack, sameSong, type SpotifyTrack } from "@/lib/spotify";

const MIN_MINUTES = 5;

/**
 * Builds a draft playlist from a prompt, or applies an edit to an existing
 * draft. Nothing is created in Spotify here; that happens in /api/playlists
 * once the user is happy with the draft.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) return fail(401, "Log in with Spotify first.");

    const json = await request.json().catch(() => null);
    const body = DraftRequest.safeParse(json);
    if (!body.success) {
      return fail(
        400,
        json?.revision
          ? "That edit couldn't be applied. Describe the change in 2 to 1,000 characters."
          : "Describe the playlist you want in 3 to 1,000 characters.",
      );
    }
    const { prompt, revision } = body.data;

    const token = await getFreshAccessToken(session);
    if (!token) return fail(401, "Your Spotify session expired. Log in again.");

    // 1. Claude picks the songs (new draft) or rewrites the list (edit).
    type Planned = Pick & { kept?: SpotifyTrack };
    let name: string;
    let description: string;
    let targetMinutes: number | null;
    let picks: Planned[];

    if (revision) {
      const current = revision.draft;
      const revised = await revisePlaylist({
        prompt,
        earlierEdits: revision.earlierEdits,
        instruction: revision.instruction,
        current,
      });
      ({ name, description } = revised);
      targetMinutes = revised.target_minutes;
      picks = revised.tracks.map((pick) => {
        // Reuse the Spotify track for a kept song, after checking the number
        // really points at that song. Anything else is looked up afresh.
        const track =
          pick.current_number === null ? undefined : current.tracks[pick.current_number - 1];
        return { title: pick.title, artist: pick.artist, kept: track && sameSong(track, pick) ? track : undefined };
      });
    } else {
      const plan = await curatePlaylist(prompt);
      ({ name, description } = plan);
      targetMinutes = plan.target_minutes;
      picks = plan.tracks;
    }

    if (targetMinutes !== null) {
      targetMinutes = Math.min(Math.max(targetMinutes, MIN_MINUTES), MAX_MINUTES);
    }

    // 2. Look the songs up on Spotify, adding them in order until the target is
    //    reached: a running time, or the number of songs Claude returned when the
    //    listener asked for a count.
    picks = picks.slice(0, MAX_TRACKS);
    const assembly = new Assembly(
      targetMinutes === null ? { count: picks.length } : { ms: targetMinutes * 60_000 },
      MAX_TRACKS,
    );
    const lookUp = async (batch: Planned[]) => {
      const found = await mapLimit(batch, 5, (pick) =>
        pick.kept ? Promise.resolve(pick.kept) : findTrack(token, pick),
      );
      assembly.add(batch, found);
    };
    await lookUp(picks);

    // 3. Short of the target because some songs weren't found (or too few were
    //    picked)? Ask for replacements that fit, up to twice.
    const tried: Pick[] = [...picks];
    for (let round = 0; round < 2; round++) {
      const need = assembly.shortfall;
      if (!need) break;
      const extra = await curateMore({
        prompt,
        edit: revision?.instruction,
        alreadyTried: tried,
        need,
      });
      if (extra.length === 0) break;
      tried.push(...extra);
      await lookUp(extra.slice(0, MAX_TRACKS));
    }

    if (assembly.tracks.length === 0) {
      return fail(502, "None of the suggested songs could be found on Spotify. Try again.");
    }

    const draft: Draft = {
      name: name.trim().slice(0, 100) || prompt.slice(0, 60),
      description: description.replace(/\s+/g, " ").trim().slice(0, 300),
      targetMinutes,
      tracks: assembly.tracks,
    };
    return NextResponse.json({ draft });
  } catch (error) {
    return errorResponse(error);
  }
}
