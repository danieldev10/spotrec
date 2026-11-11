import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/lib/env";
import { getSession } from "@/lib/session";
import { avatarUrl, exchangeCode, getProfile, STATE_COOKIE } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const origin = appOrigin();
  const fail = (reason: string) => {
    const response = NextResponse.redirect(`${origin}/?error=${reason}`);
    response.cookies.delete(STATE_COOKIE);
    return response;
  };

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (params.get("error")) return fail("denied");
  if (!code || !state || !expectedState || state !== expectedState) return fail("state");

  try {
    const tokens = await exchangeCode(code);
    const profile = await getProfile(tokens.accessToken);
    const displayName = profile.display_name || profile.id;

    const session = await getSession();
    session.userId = profile.id;
    session.displayName = displayName;
    session.avatarUrl = avatarUrl(profile);
    session.avatarChecked = true;
    session.accessToken = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.expiresAt = tokens.expiresAt;
    await session.save();
  } catch (error) {
    console.error("Spotify login failed:", error);
    return fail("spotify");
  }

  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
