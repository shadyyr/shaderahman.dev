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

/*
  Everything below derives from logo.svg, the vectorised S / R lockup. The
  favicon, the touch icon, and the two cursors all use the pointer glyph cut
  out of it; the og card uses the whole lockup. One drawing, one extraction,
  nothing drawn twice.
*/
const logoSvg = await readFile(new URL("logo.svg", OUT), "utf8");
/** Read from the art itself, so redrawing the logo cannot desync these. */
const [, LOGO_CELLS_W] = logoSvg
  .match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  .map(Number);
/** The bare rects, so the lockup can be placed inside a larger SVG. */
const logoInner = logoSvg
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");

/*
  The pointer glyph. The R ends at column 66 and a four-column gap separates
  it from the cursor, so x >= 68 selects exactly the cursor's rects: 7x11
  cells, amber outline, dark interior.
*/
const cursorRects = [...logoInner.matchAll(
  /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="([^"]+)"\/>/g,
)]
  .map(([, x, y, w, h, f]) => ({ x: +x, y: +y, w: +w, h: +h, f }))
  .filter((r) => r.x >= 68);

const cMinX = Math.min(...cursorRects.map((r) => r.x));
const cMinY = Math.min(...cursorRects.map((r) => r.y));
const CURSOR_W = Math.max(...cursorRects.map((r) => r.x + r.w)) - cMinX;
const CURSOR_H = Math.max(...cursorRects.map((r) => r.y + r.h)) - cMinY;

/** The glyph's rects, normalised to origin, optionally recoloured. */
const pointer = (recolor = {}) =>
  cursorRects
    .map((r) => {
      const fill = recolor[r.f] ?? r.f;
      return `<rect x="${r.x - cMinX}" y="${r.y - cMinY}" width="${r.w}" height="${r.h}" fill="${fill}"/>`;
    })
    .join("");

/*
  favicon: the pointer on the site ground. A 16-unit viewBox rasterises at
  exactly 2px per cell in the 32px ico, which keeps the pixel art crisp, and
  the half-unit offsets centre the 7x11 glyph while still landing every edge
  on a whole pixel at 2x.
*/
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16" shape-rendering="crispEdges" role="img" aria-label="Pointer"><title>shaderahman.dev</title><rect width="16" height="16" fill="${BG}"/><g transform="translate(4.5 2.5)">${pointer()}</g></svg>`;
await writeFile(new URL("favicon.svg", OUT), faviconSvg);

/*
  Touch icon: the same glyph at 12x, centred on the 180 canvas. iOS gives
  transparency a white box, so it is flattened onto the site ground.
*/
const touch = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" shape-rendering="crispEdges">
  <rect width="180" height="180" fill="${BG}"/>
  <g transform="translate(${(180 - CURSOR_W * 12) / 2} ${(180 - CURSOR_H * 12) / 2}) scale(12)">${pointer()}</g>
</svg>`;

await sharp(Buffer.from(touch))
  .flatten({ background: BG })
  .png()
  .toFile(out("apple-touch-icon.png"));

/**
 * ICO with a single 32x32 PNG payload. Every browser since IE11 reads
 * PNG-in-ICO, which makes the 6-image ico files of 2010 unnecessary.
 */
const ico32 = await sharp(Buffer.from(faviconSvg)).resize(32, 32).png().toBuffer();

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

/* --------------------------------------------------------------- cursors - */

/*
  The same glyph served as the actual cursor, in two colorways, because the
  cursor obeys the same rule as everything else: amber while you are over
  content, blue the moment you are over something you can act on.

  32x32 is the ceiling browsers respect without side effects; Chrome ignores
  larger cursors near the viewport edge. At scale 2 the 7x11 glyph lands at
  14x22, about the size of a system arrow.
*/
const CURSOR_SCALE = 2;
const CURSOR_PAD = 1;

/*
  The hotspot is the arrow's tip: the leftmost cell of the topmost row, which
  is where a click should land. Computed off the rects rather than assumed,
  then scaled the same way the glyph is.
*/
const tipRow = Math.min(...cursorRects.map((r) => r.y));
const tipX = Math.min(...cursorRects.filter((r) => r.y === tipRow).map((r) => r.x));
const HOTSPOT_X = CURSOR_PAD + (tipX - cMinX) * CURSOR_SCALE;
const HOTSPOT_Y = CURSOR_PAD;

const cursorSvg = (recolor) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges"><g transform="translate(${CURSOR_PAD} ${CURSOR_PAD}) scale(${CURSOR_SCALE})">${pointer(recolor)}</g></svg>`;

// No flatten: a cursor needs its transparency.
await sharp(Buffer.from(cursorSvg({}))).png().toFile(out("cursor-default.png"));
await sharp(Buffer.from(cursorSvg({ "#ffb000": BLUE }))).png().toFile(out("cursor-pointer.png"));

console.log(`cursor glyph ${CURSOR_W}x${CURSOR_H} cells, hotspot ${HOTSPOT_X} ${HOTSPOT_Y}`);

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

    The card sits on a single 56px margin: 56 in from the window on all four
    sides, and every element flush to it. Measured, not assumed.

    Courier carries a left side bearing that scales with font size, so a text
    anchored at 129 does not start its first stroke there, and the error
    differs per line. To land a visual edge on 129 the name needs an anchor of
    124 at 92px, and the field line and nav row need 127 at 34px and 28px. The
    right edge is the same problem mirrored, so the domain ends at 1072 to put
    its last stroke on 1070. The logo and the divider are bare geometry with no
    bearing at all, so they sit at a true 129 and 1070.

    Change a font size here and the bearing changes with it, so re-measure
    rather than assuming an anchor still holds.

    Sizes and rhythm both measured off the render rather than guessed.

    The type grew to use the window it sits in: the name 76 to 92, the field
    line 30 to 34, the nav row 26 to 28. At the old sizes the name spanned
    barely half the interior and the card read as a small block in a large
    frame.

    The lockup stays at 170. It was tried at 240 and read as too heavy against
    the name, which is the element that should carry the card. A mark that
    competes with the name for attention is the wrong mark.

    The interior runs 124 to 556, and the air in it is placed deliberately:

      56  above the logo          equal to the side margins
      44  logo to name
      19  name to field           tight, the field line is a subtitle
      44  field to divider
      42  divider to nav
      56  below the nav           equal to the side margins

    Growing type without opening the gaps in step is what would overcrowd it,
    so both moved together.
  -->
  <g transform="translate(129 180) scale(${170 / LOGO_CELLS_W})">${logoInner}</g>

  <text x="124" y="344" font-family="${MONO}" font-size="92" font-weight="bold" fill="${AMBER_HI}">${escape(NAME)}</text>
  <!-- Authored in the casing it renders in. The old .toUpperCase() here was
       the same lossy transform the CSS rule bans everywhere else. -->
  <text x="127" y="386" font-family="${MONO}" font-size="34" fill="${AMBER_DIM}" letter-spacing="4">${FIELD}</text>

  <!-- Geometry, so it takes the optical margin the logo uses, not the text
       anchor. 129 in and 129 out, against a window that spans 72 to 1128. -->
  <line x1="129" y1="436" x2="1071" y2="436" stroke="${FAINT}" stroke-width="2"/>

  <text x="127" y="496" font-family="${MONO}" font-size="28" fill="${AMBER_DIM}">experience &#183; projects &#183; skills</text>
  <text x="1072" y="496" font-family="${MONO}" font-size="28" fill="${BLUE}" text-anchor="end">${DOMAIN}</text>

  <!-- scanlines -->
  <defs>
    <pattern id="scan" width="3" height="3" patternUnits="userSpaceOnUse">
      <rect width="3" height="1" fill="#000" opacity="0.14"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#scan)"/>
</svg>`;

await sharp(Buffer.from(og)).png().toFile(out("og.png"));

console.log(
  "wrote favicon.svg, favicon.ico, apple-touch-icon.png, cursor-default.png, cursor-pointer.png, og.png",
);
