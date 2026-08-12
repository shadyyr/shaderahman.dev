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

const AMBER = "#ffb000";
const AMBER_HI = "#ffc247";
const AMBER_DIM = "#ad7a22";
const BLUE = "#48b0f0";
const BG = "#0b0906";
const PANEL = "#141009";
const FAINT = "#5c3f11";

/* ------------------------------------------------------------------ icons - */

const favicon = await readFile(new URL("favicon.svg", OUT));

await sharp(favicon, { density: 384 })
  .resize(180, 180)
  .flatten({ background: BG }) // iOS gives transparency a white box; pre-empt it
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
const ROLE = "Software Engineer";
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

  <!-- cursor mark -->
  <rect x="124" y="176" width="32" height="48" fill="${AMBER}"/>
  <rect x="110" y="238" width="60" height="8" fill="${BLUE}"/>

  <text x="124" y="330" font-family="${MONO}" font-size="76" font-weight="bold" fill="${AMBER_HI}">${escape(NAME)}</text>
  <text x="128" y="386" font-family="${MONO}" font-size="30" fill="${AMBER_DIM}" letter-spacing="4">${escape(ROLE.toUpperCase())}</text>

  <line x1="124" y1="428" x2="1076" y2="428" stroke="${FAINT}" stroke-width="2"/>

  <text x="124" y="478" font-family="${MONO}" font-size="26" fill="${AMBER_DIM}">experience &#183; projects &#183; skills</text>
  <text x="1076" y="478" font-family="${MONO}" font-size="26" fill="${BLUE}" text-anchor="end">${DOMAIN}</text>

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
