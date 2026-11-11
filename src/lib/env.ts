export class ConfigError extends Error {}

export function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new ConfigError(`${name} is not set. Add it to .env.local and restart the server.`);
  }
  return value;
}

/** The origin the app must be opened on, taken from the registered Spotify redirect URI. */
export function appOrigin(): string {
  return new URL(env("SPOTIFY_REDIRECT_URI")).origin;
}

/** The origin the browser used for this request (request.url reports the bind host instead). */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${request.headers.get("host") ?? url.host}`;
}
