/**
 * Audits dist/ against the tells that make a site read as machine-made.
 *
 * Run with `npm run audit` after a build. It reads the shipped HTML, not the
 * source, because the shipped HTML is the only thing anyone will ever judge.
 *
 * Exits non-zero on a FAIL so it can gate a deploy. WARNs are advisory,
 * placeholder content is a warning until you replace it, not a build break.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DIST = "dist";
let failures = 0;
let warnings = 0;

const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};
const warn = (msg) => {
  warnings++;
  console.log(`  WARN  ${msg}`);
};
const pass = (msg) => console.log(`  ok    ${msg}`);

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

if (!existsSync(DIST)) {
  console.error("No dist/. Run `npm run build` first.");
  process.exit(1);
}

const files = walk(DIST);
const pages = files.filter((f) => f.endsWith(".html"));

console.log(`\nAuditing ${pages.length} pages in ${DIST}/\n`);

/* ------------------------------------------------------------- per page --- */

const titles = new Map();
const descriptions = new Map();

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const name = file.replace(/\\/g, "/");
  console.log(name);

  // lang
  if (/<html[^>]*\slang=["'][a-z]{2}/i.test(html)) pass("html[lang]");
  else fail("html is missing a lang attribute");

  // title
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!title) {
    fail("no <title>");
  } else if (
    /^(vite|react|next|astro|create |my )/i.test(title) ||
    /\bapp\b$/i.test(title)
  ) {
    fail(`boilerplate title: "${title}"`);
  } else {
    if (titles.has(title)) fail(`title duplicates ${titles.get(title)}`);
    else titles.set(title, name);
    pass(`title: "${title}"`);
  }

  // description
  const desc = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
  )?.[1];
  if (!desc) {
    fail("no meta description");
  } else {
    if (descriptions.has(desc)) fail(`description duplicates ${descriptions.get(desc)}`);
    else descriptions.set(desc, name);
    if (desc.length > 170) warn(`description is ${desc.length} chars; it will be cut off`);
    pass("meta description");
  }

  // canonical
  if (/<link[^>]+rel=["']canonical["'][^>]+href=["']https?:\/\//i.test(html))
    pass("canonical");
  else fail("no canonical link");

  // og:image, absolute
  const og = html.match(
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
  )?.[1];
  if (!og) fail("no og:image");
  else if (!og.startsWith("http")) fail(`og:image is relative (${og}); unfurls will fail`);
  else pass("og:image (absolute)");

  if (/property=["']og:image:alt["']/i.test(html)) pass("og:image:alt");
  else warn("no og:image:alt");

  // headings
  const headings = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]));
  const h1s = headings.filter((h) => h === 1).length;
  if (h1s === 1) pass("exactly one h1");
  else fail(`${h1s} h1 elements`);

  let skipped = null;
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] - headings[i - 1] > 1) {
      skipped = `h${headings[i - 1]} -> h${headings[i]}`;
      break;
    }
  }
  if (skipped) fail(`heading level skipped: ${skipped}`);
  else pass("heading order");

  // structured data
  const ld = html.match(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i,
  )?.[1];
  if (!ld) {
    fail("no JSON-LD");
  } else {
    try {
      const parsed = JSON.parse(ld);
      const types = (parsed["@graph"] ?? [parsed]).map((n) => n["@type"]);
      pass(`JSON-LD: ${types.join(", ")}`);
    } catch {
      fail("JSON-LD does not parse");
    }
  }

  // favicon
  if (/rel=["']icon["']/i.test(html)) pass("favicon linked");
  else fail("no favicon link");

  // images need alt
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
  const noAlt = imgs.filter((m) => !/\salt=/i.test(m[0]));
  if (imgs.length === 0) pass("no <img> on page");
  else if (noAlt.length) fail(`${noAlt.length} of ${imgs.length} images lack alt`);
  else pass(`${imgs.length} images all have alt`);

  /*
    Anything carrying role="img" must carry an aria-label with it. The home page
    renders a photograph as several thousand punctuation characters inside a
    <pre>, and that pair of attributes is the entire difference between a screen
    reader announcing one described image and it reading the punctuation out
    loud, glyph by glyph, for as long as the listener lets it.

    Losing the label breaks nothing a browser can show you: the art still draws,
    the page still passes every other check here, and the failure only exists
    for the people who cannot see the art in the first place. That is precisely
    the class of defect this file exists to catch.

    The value has to be non-empty, not merely present. role="img" makes the
    element a leaf in the accessibility tree, so an aria-label="" hides the
    art's several thousand characters and puts nothing in their place: the
    listener gets an unnamed image, which is the same loss in a shape that
    looks correct in the markup.
  */
  const roleImgs = [...html.matchAll(/<[a-z][^>]*\brole=["']img["'][^>]*>/gi)];
  const unlabelled = roleImgs.filter((m) => !/\saria-label=["']\s*[^"'\s]/i.test(m[0]));
  if (roleImgs.length === 0) pass('no role="img" on page');
  else if (unlabelled.length)
    fail(`${unlabelled.length} of ${roleImgs.length} role="img" elements lack aria-label`);
  else pass(`${roleImgs.length} role="img" element(s) labelled`);

  // dead links
  const dead = [...html.matchAll(/href=["']#["']/gi)].length;
  if (dead) fail(`${dead} placeholder href="#" links`);
  else pass("no dead links");

  /*
    Astro copies template HTML comments straight into the shipped page, and
    the comments in this repo narrate decisions for whoever edits next,
    sometimes at paragraph length. View-source on a page annotated with its
    own reasoning is as loud a machine-made tell as a leaked agent config
    file, which the build already refuses to ship. Template comments belong
    in the expression form, which the compiler drops; this existed unnoticed
    because nothing looked until a removed sentence survived in a comment.
  */
  const shippedComments = (html.match(/<!--/g) ?? []).length;
  if (shippedComments) fail(`${shippedComments} HTML comment(s) shipped in the page`);
  else pass("no HTML comments shipped");

  // leftovers
  if (/lorem ipsum/i.test(html)) fail("lorem ipsum in output");
  if (/<meta\s+name=["']generator["']/i.test(html))
    warn("generator meta tag present; it names your toolchain");
  if (/TODO:|FIXME:/.test(html)) warn("TODO/FIXME in shipped HTML");

  const placeholders = (html.match(/\[PLACEHOLDER\]/g) ?? []).length;
  if (placeholders) warn(`${placeholders} placeholder blocks still on this page`);

  // banned vocabulary, the words that read as machine-written
  const banned = [
    "delve", "unleash", "empower", "elevate", "leverage", "harness",
    "seamless", "cutting-edge", "game-changer", "revolutioniz",
    "transformative", "robust solution", "passionate about", "tapestry",
    "realm of", "in today's fast-paced", "dive into", "unlock the",
    "best-in-class", "world-class", "synergy", "paradigm", "testament to",
    "embark", "streamline", "supercharge", "get started today",
    // Named explicitly in the original brief and somehow never added.
    "rocket",
  ];
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ");
  const hits = banned.filter((word) => text.toLowerCase().includes(word));
  if (hits.length) fail(`marketing vocabulary: ${hits.join(", ")}`);
  else pass("vocabulary");

  /*
    No em dashes. This is a house rule, not a typographic opinion: dense
    unspaced em dashes are one of the most reliable rhythm tells of generated
    prose, and the fix is always a comma, a colon, or a full stop that reads
    better anyway.

    En dashes (U+2013) are fine and are used for date ranges, where they are
    correct. Only U+2014 is banned.
  */
  /*
    No CSS uppercasing. The transform is lossy: it rendered "Frameworks & APIs"
    as "FRAMEWORKS & APIS" and "cd" as "CD", and nothing in the output tells
    you which casing was meant. Anything that wants capitals is typed that way.
  */
  const shouted = [
    ...html.matchAll(/text-transform:\s*uppercase/gi),
  ].length;
  if (shouted) {
    fail(`${shouted} text-transform: uppercase rule(s); type the capitals instead`);
  } else {
    pass("no CSS uppercasing");
  }

  /*
    Matched via the \u2014 escape rather than a literal character, so that a
    sweep of the repo for it comes back empty including in the file doing the
    sweeping. Otherwise the detector is the only match its own rule can find.
  */
  const emDashes = (text.match(/\u2014/g) ?? []).length;
  if (emDashes) {
    const sample = text.match(/[^.\n]{0,50}\u2014[^.\n]{0,50}/)?.[0]?.trim();
    fail(`${emDashes} em dash(es) in rendered copy: "${sample}"`);
  } else {
    pass("no em dashes");
  }

  console.log("");
}

/* ---------------------------------------------------------- whole build --- */

console.log("build");

const required = [
  "robots.txt",
  "sitemap-index.xml",
  "llms.txt",
  "404.html",
  "favicon.svg",
  "favicon.ico",
  "apple-touch-icon.png",
  "og.png",
];
for (const file of required) {
  if (existsSync(join(DIST, file))) pass(file);
  else fail(`missing ${file}`);
}

const maps = files.filter((f) => f.endsWith(".map"));
if (maps.length) fail(`${maps.length} source maps shipped`);
else pass("no source maps");

const leaked = files.filter((f) =>
  /CLAUDE\.md|AGENTS\.md|HANDOFF\.md|\.cursorrules|\.env$/i.test(f),
);
if (leaked.length) fail(`agent/env files in build: ${leaked.join(", ")}`);
else pass("no agent or env files in build");

/*
  Every root-relative url() in the shipped CSS must resolve to a file in the
  build. Fonts and cursors both load this way, and a missing one fails
  silently: the font stack falls through and the cursor falls back to its
  keyword, so nothing visibly breaks in a quick look while the page quietly
  degrades. Fragment, data:, and absolute urls are out of scope on purpose.
*/
const cssRefs = new Set(
  pages.flatMap((f) => {
    const html = readFileSync(f, "utf8");
    return [...html.matchAll(/url\(["']?(\/[^"')?#]+)/g)].map((m) => m[1]);
  }),
);
const missingRefs = [...cssRefs].filter((ref) => !existsSync(join(DIST, ref)));
if (missingRefs.length)
  fail(`CSS references missing files: ${missingRefs.join(", ")}`);
else pass(`all ${cssRefs.size} CSS url() targets resolve`);

/*
  No ch-based max-width in the shipped CSS. Text fills the box it is in on this
  site, and the mechanism that broke that twice was a cap measured in ch: the
  unit resolves against each element's own font size, so one 68ch rule landed
  at 449px on an 11px label and 694px on 17px prose, and stacked blocks inside
  a single box stopped at different places. The owner asked for full-width text
  twice, on the colophon and again on the gym split copy. This is what stops a
  third time being necessary.

  Deliberately narrow: it bans the mechanism, not the intent. A cap in px or
  rem still passes, and still deserves a conversation rather than a silent
  build failure. The point is that nobody has to remember the rule, because
  adding text now gets full width without opting into anything.

  CSS is inlined into the HTML here, so the pages are the shipped CSS. Any
  emitted .css files are scanned too, in case that ever stops being true.
*/
const styleSources = [...pages, ...files.filter((f) => extname(f) === ".css")];
const chCaps = styleSources.flatMap((f) =>
  [...readFileSync(f, "utf8").matchAll(/max-width\s*:\s*[^;}]*?\d(?:\.\d+)?ch/gi)].map(
    (m) => m[0].replace(/\s+/g, " ").trim(),
  ),
);
if (chCaps.length)
  fail(
    `ch-based max-width in shipped CSS (${chCaps.length}): ` +
      `${[...new Set(chCaps)].join(", ")}. Text fills its box here; drop the cap.`,
  );
else pass("no ch-based max-width");

const js = files.filter((f) => extname(f) === ".js");
const jsBytes = js.reduce((sum, f) => sum + statSync(f).size, 0);
const inlineBytes = pages.reduce((sum, f) => {
  const html = readFileSync(f, "utf8");
  return sum + [...html.matchAll(/<script(?![^>]+ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)]
    .reduce((n, m) => n + m[1].length, 0);
}, 0);
const totalJs = jsBytes + inlineBytes;
if (totalJs > 100_000) fail(`${(totalJs / 1024).toFixed(1)}KB of JavaScript`);
else pass(`JavaScript: ${(totalJs / 1024).toFixed(1)}KB across ${js.length} files + inline`);

const totalBytes = files.reduce((sum, f) => sum + statSync(f).size, 0);
pass(`total build: ${(totalBytes / 1024).toFixed(0)}KB`);

// robots must not shut out the AI crawlers
const robots = readFileSync(join(DIST, "robots.txt"), "utf8");
if (/Disallow:\s*\/\s*$/m.test(robots)) fail("robots.txt disallows everything");
else pass("robots.txt allows crawling");
for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
  if (robots.includes(bot)) pass(`robots.txt names ${bot}`);
  else warn(`robots.txt does not mention ${bot}`);
}

// every sitemap URL must actually resolve to a built page
const sitemaps = files.filter((f) => /sitemap-\d+\.xml$/.test(f));
const urls = sitemaps.flatMap((f) =>
  [...readFileSync(f, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
);
/*
  Every sitemap URL must resolve to a file a static host will actually serve
  for that path. Both build formats are accepted:

    directory  /experience -> experience/index.html
    file       /experience -> experience.html

  Only the first is served by every host without extra configuration, which is
  why the build uses it. A bare `existsSync` on the directory is not enough:
  the directory can exist while the index inside it does not, and that is
  exactly the shape of the bug this check is here to catch.
*/
let broken = 0;
for (const url of urls) {
  const path = new URL(url).pathname;
  const clean = path.replace(/^\/|\/$/g, "");
  const candidates =
    clean === ""
      ? ["index.html"]
      : [join(clean, "index.html"), `${clean}.html`];

  if (!candidates.some((candidate) => existsSync(join(DIST, candidate)))) {
    fail(`sitemap lists ${path}, which no file in the build serves`);
    broken++;
    continue;
  }

  /*
    Resolving only through the flat form means the route depends on the host
    rewriting a bare /experience onto experience.html. Vercel does not do that
    by default, and this is precisely how three of four pages 404'd on the
    first deploy while every local check passed.
  */
  if (
    clean !== "" &&
    !existsSync(join(DIST, clean, "index.html")) &&
    existsSync(join(DIST, `${clean}.html`))
  ) {
    warn(
      `${path} resolves only as ${clean}.html; it needs host-side clean URLs. Prefer build.format: "directory".`,
    );
  }
}
if (urls.length && !broken) pass(`all ${urls.length} sitemap URLs resolve`);

console.log(
  `\n${failures === 0 ? "PASS" : "FAIL"}, ${failures} failures, ${warnings} warnings\n`,
);
process.exit(failures === 0 ? 0 : 1);
