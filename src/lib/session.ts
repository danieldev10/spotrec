import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";
import { env } from "./env";
import { refreshAccessToken } from "./spotify";

export type SessionData = {
  userId?: string;
  displayName?: string;
  /** Spotify profile picture; absent when the account has none. */
  avatarUrl?: string;
  /** True once the profile picture has been looked up (whether or not there was one). */
  avatarChecked?: boolean;
  accessToken?: string;
  refreshToken?: string;
  /** Epoch milliseconds at which the access token stops working. */
  expiresAt?: number;
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), {
    cookieName: "spotrec_session",
    password: env("SESSION_SECRET"),
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    },
  });
}

/**
 * Returns a Spotify access token that is good for at least another minute,
 * refreshing and re-saving the session if needed. Only call this where
 * cookies can be written (route handlers), not during page rendering.
 */
export async function getFreshAccessToken(
  session: IronSession<SessionData>,
): Promise<string | null> {
  if (!session.accessToken || !session.refreshToken) return null;
  if (session.expiresAt && session.expiresAt - Date.now() > 60_000) {
    return session.accessToken;
  }
  const refreshed = await refreshAccessToken(session.refreshToken);
  session.accessToken = refreshed.accessToken;
  session.expiresAt = refreshed.expiresAt;
  if (refreshed.refreshToken) session.refreshToken = refreshed.refreshToken;
  await session.save();
  return session.accessToken;
}
