/**
 * Generates the raster assets from vector sources: the touch icon, the .ico,
 * and the Open Graph card.
 *
 * Run with `npm run assets`. Committed output lives in public/, so a normal
 * build never needs sharp and a deploy never has to rasterize anything.
 */

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = new URL("../public/", import.meta.url);
/** sharp wants a filesystem path, and URL.pathname is wrong on Windows. */
const out = (name) => fileURLToPath(new URL(name, OUT));

/* The lockup carries its own amber now, so the bare AMBER token went with the
   block cursor it used to draw. */
const AMBER_HI = "#ffc247";
const AMBER_DIM = "#ad7a22";
const BLUE = "#48b0f0";
const BG = "#0b0906";
const PANEL = "#141009";
const FAINT = "#5c3f11";

/* ------------------------------------------------------------------ icons - */

const favicon = await readFile(new URL("favicon.svg", OUT));

/*
  Two marks, because one cannot do both jobs.

  favicon.svg is the S alone. It is 26x25 cells, so it fills a square, and its
  strokes still land around 5px at 32px. The full lockup at that size is 78
  cells across, which puts a one-cell stroke under half a pixel and turns the
  tab icon into a smudge.

  logo.svg is the full S / R lockup with the cursor, used everywhere there is
  room for it: the 180px touch icon and the 1200px card.
*/
const logoSvg = await readFile(new URL("logo.svg", OUT), "utf8");
/** Read from the art itself, so redrawing the logo cannot desync these. */
const [, LOGO_CELLS_W, LOGO_CELLS_H] = logoSvg
  .match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  .map(Number);
/** The bare rects, so the lockup can be placed inside a larger SVG. */
const logoInner = logoSvg
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");

/**
 * The lockup is 2.69:1 and a touch icon is square, so it is centred with a
 * margin rather than stretched. iOS gives transparency a white box, which is
 * why this is flattened onto the site ground rather than left transparent.
 */
const touchScale = 156 / LOGO_CELLS_W;
const touch = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" shape-rendering="crispEdges">
  <rect width="180" height="180" fill="${BG}"/>
  <g transform="translate(12 ${(180 - LOGO_CELLS_H * touchScale) / 2}) scale(${touchScale})">${logoInner}</g>
</svg>`;

await sharp(Buffer.from(touch), { density: 384 })
  .resize(180, 180)
  .flatten({ background: BG })
  .png()
  .toFile(out("apple-touch-icon.png"));

/**
 * ICO with a single 32x32 PNG payload. Every browser since IE11 reads
 * PNG-in-ICO, which makes the 6-image ico files of 2010 unnecessary.
 */
const ico32 = await sharp(favicon, { density: 384 }).resize(32, 32).png().toBuffer();

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // one image

const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0); // width
entry.writeUInt8(32, 1); // height
entry.writeUInt8(0, 2); // palette size
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // colour planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(ico32.length, 8);
entry.writeUInt32LE(header.length + entry.length, 12);

await writeFile(new URL("favicon.ico", OUT), Buffer.concat([header, entry, ico32]));

/* --------------------------------------------------------------- og card - */

const escape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const NAME = "Shade Rahman";
/*
  A field, not a job title. This said "Software Engineer" for a while, which
  was wrong twice over: it contradicted SITE.role in src/lib/site.ts, which the
  actual page renders, and a share card is the last place to advertise one lane
  when you are open to several.

  The middle dot is written as an entity rather than a literal, matching the
  nav line further down. librsvg is being handed a bare SVG string with no
  encoding declaration, and the entity cannot be misread whatever it assumes.
  It is therefore interpolated raw, never through escape(), which would turn
  the ampersand into &amp; and print the entity verbatim on the card.
*/
const FIELD = "Computer Engineering &#183; UCF";
const DOMAIN = "shaderahman.dev";

// Courier New is the one monospace present on effectively every machine that
// might rasterize this, including CI. The card is shapes first and type
// second so it survives a font substitution without falling apart.
const MONO = "Courier New, Courier, monospace";

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>

  <!-- window -->
  <rect x="72" y="72" width="1056" height="486" fill="${PANEL}" stroke="${FAINT}" stroke-width="2"/>

  <!-- title bar -->
  <rect x="72" y="72" width="1056" height="52" fill="${BG}" stroke="${FAINT}" stroke-width="2"/>
  <text x="100" y="106" font-family="${MONO}" font-size="22" fill="${AMBER_DIM}" letter-spacing="3">SHADE.OS</text>
  <text x="1100" y="106" font-family="${MONO}" font-size="22" fill="${FAINT}" text-anchor="end" letter-spacing="2">[-][#][x]</text>

  <!--
    Every anchor below is different on purpose, and they are not typos.

    The left margin is 129. Courier carries a left side bearing that scales
    with font size, so a text anchored at 129 does not start its first stroke
    there, and the error differs per line: at 92px the name needs 123, at 34px
    the field line needs 127, at 28px the nav row needs 127. The logo and the
    divider are bare geometry with no bearing at all, so they sit at a true
    129. All five were measured off the rendered PNG until each reported a
    visual left edge of exactly 129.

    Change a font size here and the bearing changes with it, so re-measure
    rather than assuming the anchor still holds.

    Sizes and rhythm both measured off the render rather than guessed.

    The type grew to use the window it sits in: the name 76 to 92, the field
    line 30 to 34, the nav row 26 to 28. At the old sizes the name spanned
    barely half the interior and the card read as a small block in a large
    frame.

    The lockup stays at 170. It was tried at 240 and read as too heavy against
    the name, which is the element that should carry the card. A mark that
    competes with the name for attention is the wrong mark.

    The interior runs 124 to 558. The five blocks total roughly 176px, so the
    air is placed deliberately:

      56  above the logo
      42  logo to name
      20  name to field       tight, the field line is a subtitle of the name
      44  field to divider
      40  divider to nav
      56  below the nav

    Growing type without opening the gaps in step is what would overcrowd it,
    so both moved together.
  -->
  <g transform="translate(129 180) scale(${170 / LOGO_CELLS_W})">${logoInner}</g>

  <text x="123" y="344" font-family="${MONO}" font-size="92" font-weight="bold" fill="${AMBER_HI}">${escape(NAME)}</text>
  <!-- Authored in the casing it renders in. The old .toUpperCase() here was
       the same lossy transform the CSS rule bans everywhere else. -->
  <text x="127" y="386" font-family="${MONO}" font-size="34" fill="${AMBER_DIM}" letter-spacing="4">${FIELD}</text>

  <!-- Geometry, so it takes the optical margin the logo uses, not the text
       anchor. 129 in and 129 out, against a window that spans 72 to 1128. -->
  <line x1="129" y1="436" x2="1071" y2="436" stroke="${FAINT}" stroke-width="2"/>

  <text x="127" y="494" font-family="${MONO}" font-size="28" fill="${AMBER_DIM}">experience &#183; projects &#183; skills</text>
  <text x="1073" y="494" font-family="${MONO}" font-size="28" fill="${BLUE}" text-anchor="end">${DOMAIN}</text>

  <!-- scanlines -->
  <defs>
    <pattern id="scan" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="1" fill="#000" opacity="0.14"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#scan)"/>
</svg>`;

await sharp(Buffer.from(og)).png().toFile(out("og.png"));

console.log("wrote apple-touch-icon.png, favicon.ico, og.png");
