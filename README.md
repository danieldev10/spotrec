# Spotrec

Log in with Spotify, describe the playlist you want, and it is created and filled in your account.

## How it works

1. You log in with Spotify (OAuth authorization code flow).
2. You write a prompt. Claude picks specific songs for it (title + artist) and works out how
   long the playlist should run: the length in your prompt if you gave one ("a 2 hour drive"),
   otherwise between one and two hours. The cap is 5 hours.
3. Each song is looked up on Spotify and added in order until the playlist reaches that length,
   measured from the real track durations (or until it has the number of songs you asked
   for). Songs that can't be found are replaced with other songs that fit.
4. You see the result as a draft. Nothing is in Spotify yet. You can ask for changes in plain
   words ("fewer slow songs", "make it 3 hours", "drop the Drake tracks") as many times as you
   like; each edit keeps the rest of the draft as it is.
5. When you are happy, **Create in Spotify** makes a private playlist in your account, adds the
   songs and gives you the link.

There is no database. The app keeps no record of you or your playlists; past playlists are
simply in your Spotify account.

## Setup

You need Node 20.9+ and two sets of credentials.

### 1. Spotify app

1. Go to the [Spotify developer dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Add this Redirect URI exactly: `http://127.0.0.1:3000/api/auth/callback`
   (Spotify does not accept `localhost`.)
3. Tick **Web API** as the API used.
4. Copy the Client ID and Client Secret.

While the app is in development mode, Spotify requires the app owner to have Premium, and
only accounts you add under **User Management** (up to 5) can log in.

### 2. Claude API key

Create one at [platform.claude.com](https://platform.claude.com/settings/keys).

### 3. Environment

Create `.env.local` in the project root with:

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
ANTHROPIC_API_KEY=...
SESSION_SECRET=...
```

`SESSION_SECRET` encrypts the login cookie. Use any random string of 32+ characters
(`openssl rand -hex 32` generates one).

### 4. Run

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:3000** (not `localhost`, or the login cookie won't match).

## Project layout

| Path | What it does |
| --- | --- |
| `src/app/page.tsx` | Landing page, or the generator when logged in |
| `src/components/Generator.tsx` | The prompt form, the draft with its edit box, and the Create button |
| `src/app/api/auth/*` | Spotify login, callback and logout |
| `src/app/api/draft/route.ts` | Prompt (or an edit to a draft) → songs → draft playlist |
| `src/app/api/playlists/route.ts` | Creates a finished draft in Spotify |
| `src/lib/curator.ts` | The Claude calls that pick songs and apply edits |
| `src/lib/spotify.ts` | Spotify OAuth and Web API calls |
| `src/lib/session.ts` | Encrypted cookie session (holds the Spotify tokens) |

## Notes

- The model and effort level are set in `src/lib/curator.ts`.
