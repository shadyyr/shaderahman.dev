/**
 * Requests every external link in dist/ and reports anything that does not
 * resolve. Run with `npm run links`.
 *
 * Kept separate from `npm run audit` on purpose: the audit is offline and
 * instant, this one needs the network and takes a few seconds.
 *
 * This exists because GitHub repo metadata happily advertises deployment URLs
 * that no longer exist. Two of the three homepage URLs on this account were
 * dead Vercel deployments returning DEPLOYMENT_NOT_FOUND. Nothing in the HTML
 * can tell you that. You have to ask.
 *
 * Three outcomes, and the distinction matters:
 *
 *   ok      2xx or 3xx. The link works.
 *   DEAD    4xx. The target is genuinely gone. Fails the run.
 *   ?       Network error or 5xx after retries. Could not verify, which is
 *           NOT the same as dead. Does not fail the run.
 *
 * That last case is the important one. GitHub rate-limits aggressively and
 * starts dropping sockets, and a checker that shouts DEAD at a rate-limited
 * host trains you to delete links that were fine.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const ATTEMPTS = 3;

/**
 * Sites that refuse bots but work fine for real people. A failure from one of
 * these says nothing about whether the link is good, so they are reported and
 * not counted against the run.
 */
const BOT_HOSTILE = [
  { host: "linkedin.com", note: "returns 999 to any non-browser client" },
  { host: "instagram.com", note: "login wall for logged-out clients" },
  { host: "x.com", note: "blocks unauthenticated clients" },
  /*
    403s this checker while serving the page normally. Verified by hand at the
    time it was added: the profile returned 200 to a request carrying a real
    browser User-Agent, and the page itself is client-rendered, so there is no
    server-side title to assert against either. Listed here rather than left to
    fail, because a 403 from a host that blocks bots on principle says nothing
    about whether the link is good, and a checker that calls it DEAD is how you
    get trained into deleting working links.
  */
  { host: "tiktok.com", note: "403s non-browser clients" },
];

if (!existsSync(DIST)) {
  console.error("No dist/. Run `npm run build` first.");
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

const urls = new Set();
for (const file of walk(DIST).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  for (const match of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    urls.add(match[1]);
  }
}

// Skip our own canonical/OG URLs, since the site is not deployed while
// building it.
const external = [...urls].filter((u) => !u.startsWith("https://shaderahman.dev"));

console.log(`\nChecking ${external.length} external links\n`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      headers: { "user-agent": UA },
      signal: controller.signal,
    });
    return { status: res.status };
  } catch (error) {
    return { status: 0, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * HEAD first because it is cheap, then GET, because plenty of hosts reject or
 * mishandle HEAD. Retries on transport errors and 5xx, which are the shapes a
 * rate limit takes.
 */
async function check(url) {
  let last = { status: 0, error: "not attempted" };

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    for (const method of ["HEAD", "GET"]) {
      const result = await request(url, method);
      last = result;
      if (result.status >= 200 && result.status < 400) return result;
      // A 4xx is a real answer from a working server. Stop and believe it.
      if (result.status >= 400 && result.status < 500) return result;
    }
    if (attempt < ATTEMPTS) await sleep(attempt * 1500);
  }

  return last;
}

const results = [];
for (const url of external) {
  results.push({ url, ...(await check(url)) });
}

let dead = 0;
let unverified = 0;
let skipped = 0;

for (const { url, status, error } of results.sort((a, b) =>
  a.url.localeCompare(b.url),
)) {
  const hostile = BOT_HOSTILE.find((h) => new URL(url).hostname.endsWith(h.host));

  if (status >= 200 && status < 400) {
    console.log(`  ok    ${status}  ${url}`);
  } else if (hostile) {
    skipped++;
    console.log(`  skip  ${status || "err"}  ${url}\n              ${hostile.note}`);
  } else if (status >= 400 && status < 500) {
    dead++;
    console.log(`  DEAD  ${status}  ${url}`);
  } else {
    unverified++;
    const why = status ? `HTTP ${status}` : error;
    console.log(
      `  ?     ${status || "err"}  ${url}\n              could not verify (${why}); host may be rate-limiting`,
    );
  }
}

const parts = [
  `${dead} dead`,
  `${unverified} unverified`,
  `${skipped} skipped as bot-hostile`,
];
console.log(`\n${dead === 0 ? "PASS" : "FAIL"}, ${parts.join(", ")}\n`);

if (unverified > 0 && dead === 0) {
  console.log(
    "Unverified links are not failures. Re-run later; if one stays unverified\nacross several runs at different times, then go and look at it by hand.\n",
  );
}

process.exit(dead === 0 ? 0 : 1);
