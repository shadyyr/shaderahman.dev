/**
 * Generates the raster assets from vector sources: the touch icon, the .ico,
 * and the Open Graph card.
 *
 * Run with `npm run assets`. Committed output lives in public/, so a normal
 * build never needs sharp and a deploy never has to rasterize anything.
 */

import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = new URL("../public/", import.meta.url);
/** Vector sources live outside public/ so they are not published with the site. */
const SRC = new URL("../art/", import.meta.url);
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
  Everything below derives from logo.svg, the pointer glyph: the favicon, the
  touch icon, the two cursors and the og card all draw that one mark.

  It used to be cut out of a larger S / R lockup, which the og card was the
  only surface still carrying. The pointer is the thing people actually meet,
  as the cursor on every page, so the card leads with that and the lockup is
  retired. The source is now the glyph alone, with nothing to crop.
*/
const logoSvg = await readFile(new URL("logo.svg", SRC), "utf8");
/** The bare rects, which the glyph is assembled from below. */
const logoInner = logoSvg
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");

/* The pointer glyph: 7x11 cells, amber outline, dark interior. */
const cursorRects = [...logoInner.matchAll(
  /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="([^"]+)"\/>/g,
)]
  .map(([, x, y, w, h, f]) => ({ x: +x, y: +y, w: +w, h: +h, f }));

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
  favicon: the pointer on a transparent ground, so it sits on whatever the
  tab bar's own color is in either theme. The amber outline reads on both;
  the dark interior only ever borders amber, so it never disappears into a
  dark tab. A 16-unit viewBox rasterises at exactly 2px per cell in the 32px
  ico, which keeps the pixel art crisp, and the half-unit offsets centre the
  7x11 glyph while still landing every edge on a whole pixel at 2x.
*/
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16" shape-rendering="crispEdges" role="img" aria-label="Pointer"><title>shaderahman.dev</title><g transform="translate(4.5 2.5)">${pointer()}</g></svg>`;
await writeFile(new URL("favicon.svg", OUT), faviconSvg);

/*
  Touch icon: the same glyph at 12x, centred on the 180 canvas, transparent
  like the favicon. Know that iOS does not honour the alpha: home screen
  icons get the system's own backing painted behind any transparency, black
  there and white in some Safari surfaces, so on an iPhone this lands on
  black rather than showing through. It ships transparent anyway because
  every other consumer of the file keeps the alpha, and black is close
  enough to the site's near-black ground to pass.
*/
const touch = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" shape-rendering="crispEdges">
  <g transform="translate(${(180 - CURSOR_W * 12) / 2} ${(180 - CURSOR_H * 12) / 2}) scale(12)">${pointer()}</g>
</svg>`;

await sharp(Buffer.from(touch))
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

/*
  THE MARK SITS BESIDE THE NAME, NOT ABOVE IT.

  The S / R lockup it replaced was 170 wide by 63 tall and stood on its own
  line. The pointer is 7 by 11 cells, so at that same height it is only 40 wide
  and reads as a stray icon in a very large frame. Giving a narrow glyph
  presence means giving it height, and height is the one thing the stacked
  position cannot spare: the name has to have it. Beside the name it costs
  width instead, which this card has plenty of.

  THE MARK IS EXACTLY AS TALL AS THE TWO LINES IT STANDS BESIDE. Its top is
  the name's cap line and its bottom is the field line's descenders, so the
  lockup has one top edge and one bottom edge rather than a mark floating at
  its own size next to some text. That is what makes it read as their mark and
  not as a third element.

  Which means the height is not a number to taste, it is measured off the type,
  and the two offsets below are the measurement. Courier's cap height at 92px
  puts the name's ink 59 above its baseline; "Computer Engineering" has a p and
  a g, so the field's ink runs 6 below its own. 286 - 59 to 328 + 6 is 227 to
  334, and the mark is those 107.

  Change either font size or either baseline and these two offsets are wrong.
  Re-measure the PNG, do not re-derive them from the font's metrics.

  It was drawn at 213 first, which fills the frame but bullies the name, and
  the name is what should carry the card. A mark that competes with the name is
  the wrong mark, which is the same note the old lockup failed at 240 wide.

  The pair sits centred between the title bar and the divider, which is why the
  baselines are 286 and 328: with nothing stacked above the name there is
  nothing to pin the block to the top margin, and pinning it would leave all
  the slack in one gap and bottom the card out empty.

  Also tried, and turned down: centring the name and field in the window and
  putting the pointer at the end of "Rahman" as though clicking it. It reads
  well as an idea and it did not look right on the card, so the mark stays
  where a mark goes.

  MARK_W is derived rather than typed, so redrawing the glyph cannot leave the
  card stretching it.
*/
const NAME_BASELINE = 286;
const FIELD_BASELINE = 328;
/** Ink above the name's baseline, and below the field's. Both measured. */
const CAP_RISE = 59;
const DESCENDER = 6;

const MARK_X = 129;
const MARK_Y = NAME_BASELINE - CAP_RISE;
const MARK_H = FIELD_BASELINE + DESCENDER - MARK_Y;
const MARK_W = (MARK_H * CURSOR_W) / CURSOR_H;
/** Ink left of the text column. 44 is the same gap the rhythm uses elsewhere. */
const COLUMN = MARK_X + MARK_W + 44;

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
    anchored at a number does not start its first stroke there, and the error
    differs per line. The nav row needs 127 to land ink on 129 at 28px, and in
    the text column the name needs COLUMN - 5 at 92px against the field line's
    COLUMN - 2 at 34px: one intended edge, two different anchors, because the
    bearing at 92px is nearly three times the bearing at 34px. The right edge
    is the same problem mirrored, so the domain ends at 1072 to put its last
    stroke on 1070. The mark and the divider are bare geometry with no bearing
    at all, so they sit at a true 129 and 1070.

    Change a font size here and the bearing changes with it, so re-measure
    rather than assuming an anchor still holds.

    Sizes and rhythm both measured off the render rather than guessed.

    The type grew to use the window it sits in: the name 76 to 92, the field
    line 30 to 34, the nav row 26 to 28. At the old sizes the name spanned
    barely half the interior and the card read as a small block in a large
    frame.

    The mark's height, which is measured off the type rather than chosen, is
    argued above the MARK_H constant rather than here.

    The interior runs 124 to 558, and the air in it is placed deliberately:

      103 title bar to the lockup           the slack, split evenly
      44  mark to the text column           horizontal, not vertical
      42  name baseline to field baseline   tight, the field is a subtitle
      101 lockup to divider                 the other half of the slack
      42  divider to nav
      56  below the nav                     equal to the side margins

    The mark and the text share a top edge and a bottom edge, so the lockup
    reads as one object rather than two things that happen to be adjacent.
  -->
  <g transform="translate(${MARK_X} ${MARK_Y}) scale(${MARK_H / CURSOR_H})">${pointer()}</g>

  <text x="${COLUMN - 5}" y="${NAME_BASELINE}" font-family="${MONO}" font-size="92" font-weight="bold" fill="${AMBER_HI}">${escape(NAME)}</text>
  <!-- Authored in the casing it renders in. The old .toUpperCase() here was
       the same lossy transform the CSS rule bans everywhere else. -->
  <text x="${COLUMN - 2}" y="${FIELD_BASELINE}" font-family="${MONO}" font-size="34" fill="${AMBER_DIM}" letter-spacing="4">${FIELD}</text>

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

/* ----------------------------------------------------------------- photo - */

/*
  The home page portrait, cropped and shrunk from the original camera file.

  The source lives in art/ rather than public/ because it is 5712x4284 and
  4.2MB, and everything in public/ is copied verbatim into the build. That
  mistake has already been made once here, with a 2.4MB photograph shipping to
  production that no page referenced.

  Cropped 4:5 around the subject, who sits between about 0.31 and 0.80 across
  the frame, then resized to twice the width the layout gives it so it still
  resolves on a 2x screen.

  PHOTO_TOP is where the crop starts, and it is the number to move if the
  framing needs changing. His hair reaches y=827 in the original, so cropping
  from the top of the frame left 19% of the picture as empty sky and made him
  small in a box whose height is set by the paragraphs beside it. 560 leaves
  267px of headroom, 7.2% of the crop, which is air above his head rather than
  a gap. 700 was tried and sits too close to the top of the frame.
*/
const PHOTO_SOURCE = new URL("../art/IMG_1474.jpeg", import.meta.url);
const PHOTO_TOP = 560;

if (existsSync(PHOTO_SOURCE)) {
  const { width, height } = await sharp(fileURLToPath(PHOTO_SOURCE)).metadata();
  const cropHeight = height - PHOTO_TOP;
  const cropWidth = Math.round(cropHeight * 0.8);

  const photo = await sharp(fileURLToPath(PHOTO_SOURCE))
    .extract({
      left: Math.round(width * 0.5556 - cropWidth / 2),
      top: PHOTO_TOP,
      width: cropWidth,
      height: cropHeight,
    })
    .resize(768, 960)
    .webp({ quality: 82 })
    .toBuffer();

  await writeFile(out("portrait.webp"), photo);
  console.log(`portrait.webp 768x960, ${(photo.length / 1024).toFixed(0)}KB`);
} else {
  console.log("no art/IMG_1474.jpeg, skipping the portrait");
}

console.log(
  "wrote favicon.svg, favicon.ico, apple-touch-icon.png, cursor-default.png, cursor-pointer.png, og.png",
);
