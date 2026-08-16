/**
 * Resolves src/data/tracks.txt into src/data/playlist.json.
 *
 *   npm run spotify              resolve anything not already cached
 *   npm run spotify -- --force   re-resolve every track
 *
 * Run by hand, like `npm run assets` and `npm run ascii`. A normal build never
 * calls this and never talks to Spotify, so a deploy cannot fail because their
 * API is down and the site still builds with no network at all.
 *
 * ---------------------------------------------------------------------------
 * Why this reads a text file instead of fetching the playlist
 *
 * Because Spotify will not hand over a playlist's contents any more. Measured
 * against this account, in one sitting:
 *
 *   GET /playlists/{id}                 200, but with no `tracks` key at all
 *   GET /playlists/{id}/tracks          403, app token
 *   GET /playlists/{id}/tracks          403, user token, playlist's own owner
 *   GET /playlists/{id}/tracks          403, Spotify's own editorial playlist
 *   GET /tracks?ids=a,b                 403
 *   GET /tracks/{id}                    200
 *   GET /search                         200
 *
 * So the one thing that is closed is asking what is in a playlist, and the one
 * thing still open is asking about a track you can already name. tracks.txt is
 * the list of names, exported by hand from the desktop client. Do not spend an
 * afternoon looking for the endpoint that gets round this; it was looked for.
 * ---------------------------------------------------------------------------
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import process, { argv, env } from "node:process";

const CLIENT_ID = env.SPOTIFY_CLIENT_ID ?? "5d6dae626d7a41b98f91ad2a5471c203";
const CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = env.SPOTIFY_REFRESH_TOKEN;

const PLAYLIST_ID = "7BuJmt22LfGlNcnHLawnJA";
const SOURCE = new URL("../src/data/tracks.txt", import.meta.url);
const OUT = new URL("../src/data/playlist.json", import.meta.url);
const PUBLIC_OUT = new URL("../public/playlist.json", import.meta.url);

const force = argv.includes("--force");

/*
  Spotify allows a burst and then answers 429 with a Retry-After. 120ms between
  calls keeps a 200 track run inside the allowance while still finishing in half
  a minute, and the retry below covers the times it does not.
*/
const GAP_MS = 120;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function accessToken() {
  if (!CLIENT_SECRET) {
    throw new Error(
      "No SPOTIFY_CLIENT_SECRET. Put it in .env at the repo root, which is gitignored.",
    );
  }

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  /*
    A user token when there is a refresh token, an app token otherwise. Right
    now every endpoint this script touches works with either, so the app token
    is a perfectly good fallback and the script stays useful on a machine that
    has never run the auth flow.
  */
  const body = REFRESH_TOKEN
    ? new URLSearchParams({ grant_type: "refresh_token", refresh_token: REFRESH_TOKEN })
    : new URLSearchParams({ grant_type: "client_credentials" });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Token request failed: ${response.status}\n${await response.text()}\n\n` +
        "Spotify names which half is wrong: 'Invalid client secret' means the id\n" +
        "is fine. An invalid_grant means the refresh token is stale; delete\n" +
        "SPOTIFY_REFRESH_TOKEN from .env and run npm run spotify:auth again.",
    );
  }

  return (await response.json()).access_token;
}

async function get(url, token, attempt = 0) {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });

  if (response.status === 429 && attempt < 3) {
    const wait = Number(response.headers.get("retry-after") ?? 2) + 1;
    console.log(`  rate limited, waiting ${wait}s`);
    await sleep(wait * 1000);
    return get(url, token, attempt + 1);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`${response.status} on ${url}\n${detail}`);
  }

  return response.json();
}

async function main() {
  if (!existsSync(SOURCE)) throw new Error(`No ${SOURCE.pathname}. Nothing to resolve.`);

  /*
    Accepts anything with a track id in it: full urls with or without a ?si=
    query, spotify:track: uris, or bare ids. The desktop client's copy puts out
    urls with a tracking query attached, and stripping it here means the file
    can just be pasted into rather than cleaned up first.
  */
  const ids = [];
  const seen = new Set();
  let duplicates = 0;

  for (const raw of (await readFile(SOURCE, "utf8")).split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const id = line.match(/(?:track[/:])([A-Za-z0-9]{22})/)?.[1];
    if (!id) {
      console.log(`  skipped, no track id: ${line.slice(0, 60)}`);
      continue;
    }
    if (seen.has(id)) {
      duplicates++;
      continue;
    }
    seen.add(id);
    ids.push(id);
  }

  /*
    Anything already resolved is reused unless --force. Track metadata does not
    move, and re-resolving 200 tracks to add one to the end of the list is both
    slow and a pointless 200 requests at somebody else's expense.
  */
  const cached = new Map();
  if (!force && existsSync(OUT)) {
    for (const track of JSON.parse(await readFile(OUT, "utf8")).tracks ?? []) {
      if (track.id) cached.set(track.id, track);
    }
  }

  const token = await accessToken();
  console.log(
    `${ids.length} tracks${duplicates ? `, ${duplicates} duplicates dropped` : ""}` +
      `, ${cached.size ? `${ids.filter((i) => cached.has(i)).length} cached` : "none cached"}`,
  );

  const tracks = [];
  const missing = [];
  let fetched = 0;

  for (const [index, id] of ids.entries()) {
    if (cached.has(id)) {
      tracks.push(cached.get(id));
      continue;
    }

    let track;
    try {
      track = await get(`https://api.spotify.com/v1/tracks/${id}`, token);
    } catch (error) {
      /*
        One dead track should not cost the other 219. Regional unavailability
        and removed tracks both land here, and both are worth naming at the end
        rather than crashing the run.
      */
      missing.push({ id, why: error.message.split("\n")[0] });
      continue;
    }

    tracks.push({
      id,
      name: track.name,
      // Name and id both, because the panel links each artist to their Spotify
      // page and the id is the only part of that url that varies.
      artists: track.artists.map((artist) => ({ name: artist.name, id: artist.id })),
      album: track.album?.name ?? null,
      // Spotify returns images widest first: 640, 300, 64. The 300 is more than
      // any layout here needs and a quarter of the bytes of the 640.
      art: track.album?.images?.at(1)?.url ?? track.album?.images?.at(0)?.url ?? null,
      durationMs: track.duration_ms,
      uri: track.uri,
      url: track.external_urls?.spotify ?? null,
    });

    fetched++;
    if (fetched % 25 === 0) console.log(`  ${fetched} fetched`);
    await sleep(GAP_MS);
  }

  const playlist = await get(
    `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}` +
      "?fields=name,description,external_urls.spotify,owner.display_name",
    token,
  ).catch(() => null);

  const data = {
    /*
      Stamped because this is a snapshot and not a feed. It only moves when
      someone reruns this and commits, so the page can say when it was taken,
      which is the honest way to render data that is already going stale.
    */
    fetched: new Date().toISOString().slice(0, 10),
    name: playlist?.name ?? null,
    owner: playlist?.owner?.display_name ?? null,
    url: playlist?.external_urls?.spotify ?? `https://open.spotify.com/playlist/${PLAYLIST_ID}`,
    trackCount: tracks.length,
    tracks,
  };

  await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`);

  /*
    A second, smaller copy for the browser.

    The page renders the first track from the file above at build time, and
    fetches this one only when somebody presses play. Most visitors never will,
    and this way they never pay for it: measured, the full file is 106KB on disk
    and 15.8KB gzipped, and this trimmed one is 28.3KB and 11.6KB. Inlining
    either would have put it on every visit to the home page, which is 36.8KB.

    Short keys and stripped prefixes are the difference between the two. Every
    art url starts with the same 24 characters and every uri with the same 14,
    so both are rebuilt on the other side rather than repeated 224 times.
  */
  const compact = tracks.map((track) => ({
    i: track.id,
    a: track.art?.replace("https://i.scdn.co/image/", "") ?? null,
    n: track.name,
    // Pairs rather than a joined string: the panel renders each artist as its
    // own link, so it needs them apart. Arrays rather than objects because 224
    // repetitions of two key names is 4KB of nothing.
    r: track.artists.map((artist) => [artist.name, artist.id]),
    d: track.durationMs,
  }));
  await writeFile(PUBLIC_OUT, `${JSON.stringify(compact)}\n`);

  const bytes = (JSON.stringify(data).length / 1024).toFixed(1);
  const clientBytes = (JSON.stringify(compact).length / 1024).toFixed(1);
  console.log(
    `\nsrc/data/playlist.json: "${data.name}" by ${data.owner}, ` +
      `${data.trackCount} tracks, ${fetched} newly fetched, ${bytes}KB`,
  );
  console.log(`public/playlist.json:   ${clientBytes}KB, fetched only on play`);

  if (missing.length) {
    console.log(`\n${missing.length} could not be resolved:`);
    for (const m of missing) console.log(`  ${m.id}  ${m.why}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
