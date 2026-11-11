import { z } from "zod";

/** Hard ceiling on playlist size, whatever the target length. */
export const MAX_TRACKS = 150;

const TrackUri = z.string().regex(/^spotify:track:[A-Za-z0-9]{1,40}$/);

// The draft lives in the browser between requests, so everything in it is
// checked again when it comes back.
const Track = z.object({
  uri: TrackUri,
  name: z.string().max(300),
  artists: z.string().max(300),
  url: z.string().startsWith("https://open.spotify.com/").max(200),
  durationMs: z.number().int().min(0).max(6 * 60 * 60_000),
});

const DraftSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300),
  /** Target running time; null when the listener fixed the number of songs instead. */
  targetMinutes: z.number().min(1).max(1000).nullable(),
  tracks: z.array(Track).min(1).max(MAX_TRACKS),
});

/** A playlist that has been put together but not yet created in Spotify. */
export type Draft = z.infer<typeof DraftSchema>;

const Prompt = z.string().trim().min(3).max(1000);

/** Body of POST /api/draft: a new draft from a prompt, or an edit to an existing draft. */
export const DraftRequest = z.object({
  prompt: Prompt,
  revision: z
    .object({
      draft: DraftSchema,
      instruction: z.string().trim().min(2).max(1000),
      /** Edits already applied to reach `draft`, oldest first. */
      earlierEdits: z.array(z.string().max(1000)).max(30),
    })
    .optional(),
});

/** Body of POST /api/playlists: create the finished draft in Spotify. */
export const CreateRequest = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(300),
  uris: z.array(TrackUri).min(1).max(MAX_TRACKS),
});
