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
