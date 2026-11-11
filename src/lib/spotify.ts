import { env } from "./env";

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";

export const SCOPES = "playlist-modify-private playlist-modify-public";

/** Cookie that carries the OAuth state value between login and callback. */
export const STATE_COOKIE = "spotrec_oauth_state";

export class SpotifyError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Spotify responded ${status}: ${body.slice(0, 300)}`);
  }
}

// ---------- OAuth ----------

export function authorizeUrl(state: string): string {
  const url = new URL(`${ACCOUNTS}/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: env("SPOTIFY_CLIENT_ID"),
    scope: SCOPES,
    redirect_uri: env("SPOTIFY_REDIRECT_URI"),
    state,
  }).toString();
  return url.toString();
}

export type Tokens = {
  accessToken: string;
  /** Absent on a refresh when Spotify keeps the existing refresh token. */
  refreshToken?: string;
  expiresAt: number;
};

async function requestTokens(params: Record<string, string>): Promise<Tokens> {
  const basic = Buffer.from(
    `${env("SPOTIFY_CLIENT_ID")}:${env("SPOTIFY_CLIENT_SECRET")}`,
  ).toString("base64");
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    // The token endpoint answers 400 for a revoked or expired grant; report
    // that as 401 so callers can treat every "log in again" case alike.
    throw new SpotifyError(res.status === 400 ? 401 : res.status, await res.text());
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export function exchangeCode(code: string): Promise<Tokens> {
  return requestTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: env("SPOTIFY_REDIRECT_URI"),
  });
}

export function refreshAccessToken(refreshToken: string): Promise<Tokens> {
  return requestTokens({ grant_type: "refresh_token", refresh_token: refreshToken });
}

// ---------- Web API ----------

async function api<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (res.status === 429 && attempt < 3) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 1, 10);
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
      continue;
    }
    if (!res.ok) throw new SpotifyError(res.status, await res.text());
    return (await res.json()) as T;
  }
}

type Profile = {
  id: string;
  display_name: string | null;
  images?: { url: string; width: number | null; height: number | null }[];
};

export function getProfile(token: string) {
  return api<Profile>(token, "/me");
}

/** The smallest profile picture that still looks sharp as a small avatar, if the account has one. */
export function avatarUrl(profile: Profile): string | undefined {
  const images = (profile.images ?? []).filter((image) => image.url.startsWith("https://"));
  if (images.length === 0) return undefined;
  const bySize = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (bySize.find((image) => (image.width ?? 0) >= 64) ?? bySize[bySize.length - 1]).url;
}

export type SpotifyTrack = {
  uri: string;
  name: string;
  artists: string;
  url: string;
  durationMs: number;
};

type SearchResponse = {
  tracks: {
    items: {
      uri: string;
      name: string;
      artists: { name: string }[];
      external_urls: { spotify: string };
      duration_ms: number;
    }[];
  };
};

/** Lowercase, strip accents and punctuation, so "Beyoncé" matches "beyonce". */
function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function overlaps(a: string, b: string): boolean {
  return a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
}

/** Whether a Spotify track is the song a pick names (loose title match). */
export function sameSong(track: SpotifyTrack, pick: { title: string }): boolean {
  return overlaps(normalize(track.name), normalize(pick.title));
}

async function search(token: string, query: string) {
  const params = new URLSearchParams({ q: query, type: "track", limit: "5" });
  const data = await api<SearchResponse>(token, `/search?${params}`);
  return data.tracks.items;
}

/**
 * Looks up one song by title and artist. Returns null when Spotify has no
 * result whose artist and title both match, so a wrong song is never added.
 */
export async function findTrack(
  token: string,
  wanted: { title: string; artist: string },
): Promise<SpotifyTrack | null> {
  const title = normalize(wanted.title);
  const artist = normalize(wanted.artist);
  const queries = [
    `track:${wanted.title} artist:${wanted.artist}`,
    `${wanted.title} ${wanted.artist}`,
  ];
  for (const query of queries) {
    const items = await search(token, query);
    const match = items.find(
      (item) =>
        item.artists.some((a) => overlaps(normalize(a.name), artist)) &&
        overlaps(normalize(item.name), title),
    );
    if (match) {
      return {
        uri: match.uri,
        name: match.name,
        artists: match.artists.map((a) => a.name).join(", "),
        url: match.external_urls.spotify,
        durationMs: match.duration_ms,
      };
    }
  }
  return null;
}

export function createPlaylist(token: string, name: string, description: string) {
  return api<{ id: string; external_urls: { spotify: string } }>(token, "/me/playlists", {
    method: "POST",
    body: JSON.stringify({ name, description, public: false }),
  });
}

export async function addTracks(token: string, playlistId: string, uris: string[]) {
  // Spotify accepts at most 100 items per request.
  for (let i = 0; i < uris.length; i += 100) {
    await api(token, `/playlists/${playlistId}/items`, {
      method: "POST",
      body: JSON.stringify({ uris: uris.slice(i, i + 100) }),
    });
  }
}
