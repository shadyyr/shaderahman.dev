/**
 * One-time Spotify authorization. Run once, never again.
 *
 *   npm run spotify:auth
 *
 * Why this exists: as of Spotify's 2026 changes an app token (client
 * credentials) gets 403 on GET /v1/playlists/{id}/tracks, and the playlist
 * object it does return has no `tracks` key at all. Verified against both this
 * playlist and Spotify's own editorial one, so it is the endpoint and not a
 * permission on any particular playlist. Reading a track list now needs a token
 * that belongs to a person.
 *
 * This opens a browser once, catches the callback on 127.0.0.1:4321, trades the
 * code for a refresh token, writes it to .env, and then immediately tries the
 * tracks endpoint so the run tells you whether a user token is actually allowed
 * through. The refresh token does not expire on its own, so scripts/spotify.mjs
 * can mint access tokens from it forever without anyone logging in again.
 */

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import process, { env } from "node:process";

const CLIENT_ID = env.SPOTIFY_CLIENT_ID ?? "5d6dae626d7a41b98f91ad2a5471c203";
const CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET;
const PLAYLIST_ID = "7BuJmt22LfGlNcnHLawnJA";

/* Must match a redirect URI registered on the app, character for character. */
const PORT = 4321;
const REDIRECT = `http://127.0.0.1:${PORT}/`;

/*
  Only what is needed to read a playlist you own. Not requesting anything about
  listening history, playback control, or your profile, so the consent screen
  stays honest about what this is for.
*/
const SCOPES = "playlist-read-private playlist-read-collaborative";

const ENV_PATH = new URL("../.env", import.meta.url);

const page = (title, body) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
  `<body style="background:#0b0906;color:#d9962f;font:16px ui-monospace,monospace;` +
  `display:grid;place-items:center;height:100vh;margin:0;text-align:center">` +
  `<div><h1 style="color:#ffc247;font-size:20px">${title}</h1><p>${body}</p></div>`;

async function main() {
  if (!CLIENT_SECRET) throw new Error("No SPOTIFY_CLIENT_SECRET in .env. See scripts/spotify.mjs.");

  const state = Math.random().toString(36).slice(2);
  const authUrl =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT,
      scope: SCOPES,
      state,
      show_dialog: "true",
    });

  /* Wait for Spotify to redirect back with the code. */
  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, REDIRECT);
      const got = url.searchParams.get("code");
      const err = url.searchParams.get("error");

      if (err) {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(page("Denied", "You can close this tab."));
        server.close();
        reject(new Error(`Spotify returned: ${err}`));
        return;
      }
      if (!got) {
        if (url.pathname !== "/") {
          // The browser also asks for /favicon.ico. Answer and keep waiting.
          res.writeHead(204);
          res.end();
          return;
        }
        /*
          A plain visit to the callback address, which is the reliable way in.
          An OAuth URL is a string of & separated parameters and everything on
          the way to a browser wants to chew on those: cmd splits a command line
          on &, and terminals cut hyperlinks at odd characters. This address has
          none, so it always survives, and the real URL travels inside an anchor
          where nothing can reinterpret it.
        */
        res.writeHead(200, { "content-type": "text/html" });
        res.end(
          page(
            "Authorize Spotify",
            `<a href="${authUrl}" style="color:#48b0f0">Click here to approve</a>` +
              `<br><br><span style="color:#ad7a22;font-size:13px">` +
              `Reads your playlists. Nothing else.</span>`,
          ),
        );
        return;
      }
      if (url.searchParams.get("state") !== state) {
        res.writeHead(200, { "content-type": "text/html" });
        res.end(page("State mismatch", "Request did not come from this run. Close and retry."));
        server.close();
        reject(new Error("state mismatch, possible interference"));
        return;
      }

      res.writeHead(200, { "content-type": "text/html" });
      res.end(page("Authorized", "Done. You can close this tab and go back to the terminal."));
      server.close();
      resolve(got);
    });

    server.on("error", (e) =>
      reject(
        e.code === "EADDRINUSE"
          ? new Error(`Port ${PORT} is busy. Stop \`npm run dev\` and run this again.`)
          : e,
      ),
    );

    server.listen(PORT, "127.0.0.1", () => {
      console.log(
        `\n  Open this and approve:\n\n${authUrl}\n\n` +
          `  Trying to open it for you. If a browser does not appear, copy the\n` +
          `  whole line above, including everything after every &.\n\n` +
          `  Waiting on ${REDIRECT} ...`,
      );
      /*
        rundll32, not `cmd /c start`. cmd treats & as a command separator, and
        an OAuth URL is nothing but & separated parameters, so the browser got
        everything up to the first one and Spotify answered "response_type must
        be code" because that parameter had been cut off. rundll32 takes the URL
        as a single argument and never parses it.
      */
      spawn("rundll32", ["url.dll,FileProtocolHandler", authUrl.toString()], {
        stdio: "ignore",
        detached: true,
      }).unref();
    });
  });

  /* ------------------------------------------------------------- exchange --- */

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed: ${tokenResponse.status}\n${await tokenResponse.text()}`);
  }

  const { access_token: access, refresh_token: refresh } = await tokenResponse.json();

  /* ------------------------------------------------------------- persist ---
     Saved before anything is tested with it, which is the opposite of how this
     was written first. The probe below used to run first and throw on a 403,
     which threw away a refresh token the owner had just clicked through a
     browser to grant, and made a diagnostic result cost a second authorization.
     Persist what you were given, then find out what it can do.
     ------------------------------------------------------------------------ */

  const current = existsSync(ENV_PATH) ? await readFile(ENV_PATH, "utf8") : "";
  const line = `SPOTIFY_REFRESH_TOKEN=${refresh}`;
  const updated = /^SPOTIFY_REFRESH_TOKEN=.*$/m.test(current)
    ? current.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, line)
    : `${current.replace(/\s*$/, "")}\n${line}\n`;
  await writeFile(ENV_PATH, updated);
  console.log("\nRefresh token saved to .env.");

  /* ----------------------------------------------------------- does it work - */

  const probe = await fetch(
    `https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/tracks?limit=3&fields=total,items(track(name,artists(name)))`,
    { headers: { authorization: `Bearer ${access}` } },
  );

  console.log(`GET /playlists/{id}/tracks with a user token: ${probe.status}`);

  if (!probe.ok) {
    console.log(await probe.text());
    console.log(
      "\nA user token is refused too, so the API will not supply this playlist's\n" +
        "tracks at all. The token is still saved and still useful for other\n" +
        "endpoints. Fall back to naming the songs by hand: /search works and can\n" +
        "fill in artwork, canonical titles and links from a plain list.",
    );
    return;
  }

  const sample = await probe.json();
  console.log(`${sample.total} tracks readable. First few:`);
  for (const item of sample.items) {
    console.log(`  ${item.track.name} - ${item.track.artists.map((a) => a.name).join(", ")}`);
  }

  console.log(
    "\nThe refresh token does not expire, so this script never needs running" +
      "\nagain. Put the same SPOTIFY_REFRESH_TOKEN in Vercel if you want deploys" +
      "\nto refetch.\n\nNow run: npm run spotify",
  );
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
