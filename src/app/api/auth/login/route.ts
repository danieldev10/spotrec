import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, ConfigError, requestOrigin } from "@/lib/env";
import { authorizeUrl, STATE_COOKIE } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  try {
    // Cookies are per-host, so the whole login must happen on the host that
    // Spotify redirects back to (127.0.0.1 in development, not localhost).
    const origin = appOrigin();
    if (request.headers.get("host") !== new URL(origin).host) {
      return NextResponse.redirect(`${origin}/api/auth/login`);
    }

    const state = randomBytes(16).toString("hex");
    const response = NextResponse.redirect(authorizeUrl(state));
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.redirect(`${requestOrigin(request)}/?error=config`);
    }
    throw error;
  }
}
