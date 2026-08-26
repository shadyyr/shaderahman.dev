/**
 * Turns the design sources in art/design/ into the web derivatives the site
 * actually serves, and writes what it measured into src/data/design-assets.json.
 *
 * Same arrangement as `npm run assets` and `npm run ascii`: the output is
 * committed and a normal build never runs this. Rerun it by hand when a piece
 * is added or replaced, and commit the result.
 *
 * The sources are gitignored on purpose. art/design/ is 187MB of print
 * resolution PDF and PNG, Drive is the archive for the originals, and only the
 * derivatives belong in the repository. That means **a fresh clone can build
 * the site without the sources present**, which is why the page reads the
 * committed JSON rather than the folder.
 *
 * PDFs are rendered with mupdf rather than poppler or ImageMagick. Neither is
 * installed on the machine this was written on, and mupdf is WebAssembly, so
 * it needs no native build and no Ghostscript behind it.
 *
 * Two widths per piece, 640 and 1280, and the page hands both to srcset. The
 * grid renders a cover around 300px wide, so 640 covers a 2x display and 1280
 * covers the full-size view without shipping a print-resolution file to a
 * phone.
 */

import * as mupdf from "mupdf";
import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "art/design";
const OUT = "public/design";
const MANIFEST = "src/data/design-assets.json";
const WIDTHS = [640, 1280];
/* Rendered at 2x the largest output width so the downscale has real pixels to
   work from. A 1080px Instagram post is already above that, and a letter page
   at scale 4 lands near 2400px, which is comfortably past 1280. */
const PDF_SCALE = 4;

/* Imported rather than parsed. Node strips the types itself, so the script and
   the page read the exact same array and a field added to one cannot go
   missing from the other. */
const { DESIGN: pieces } = await import("../src/data/design.ts");

if (!pieces.length) {
  console.error("No pieces parsed out of src/data/design.ts");
  process.exit(1);
}
if (!existsSync(SRC)) {
  console.error(`No ${SRC}/. The sources are gitignored; restore them from Drive to rerun this.`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

/** Full-size PNG of a piece's cover, plus how many pages it runs to. */
function coverOf(piece) {
  const path = join(SRC, piece.source);
  if (!existsSync(path)) throw new Error(`missing source: ${piece.source}`);

  if (!/\.pdf$/i.test(path)) {
    return { buffer: readFileSync(path), slides: 1 };
  }
  const doc = mupdf.Document.openDocument(readFileSync(path), "application/pdf");
  const pix = doc
    .loadPage(0)
    .toPixmap(mupdf.Matrix.scale(PDF_SCALE, PDF_SCALE), mupdf.ColorSpace.DeviceRGB, false, true);
  return { buffer: Buffer.from(pix.asPNG()), slides: doc.countPages() };
}

const assets = {};
let bytes = 0;

for (const piece of pieces) {
  const { buffer, slides } = coverOf(piece);
  let image = sharp(buffer);
  const meta = await image.metadata();

  /*
    Redact first, at full page scale, so the fractions in design.ts describe
    the original artwork rather than whatever a crop left behind. Blurred
    rather than boxed over: a solid rectangle on a poster reads as damage,
    while a blur reads as something deliberately withheld, and both are
    equally unrecoverable at this resolution.
  */
  for (const box of piece.redact ?? []) {
    const px = {
      left: Math.round(meta.width * box.left),
      top: Math.round(meta.height * box.top),
      width: Math.round(meta.width * box.width),
      height: Math.round(meta.height * box.height),
    };
    const blurred = await image.clone().extract(px).blur(24).toBuffer();
    image = sharp(
      await image.composite([{ input: blurred, left: px.left, top: px.top }]).toBuffer(),
    );
  }

  /* Crop after, so the kept fraction is of the real page rather than of
     whatever the resize happened to produce. */
  let width = meta.width;
  let height = meta.height;
  if (piece.keepTop) {
    height = Math.round(meta.height * piece.keepTop);
    image = sharp(await image.extract({ left: 0, top: 0, width, height }).toBuffer());
  }

  const files = {};
  for (const w of WIDTHS) {
    /* Never upscale. A 1600x400 banner has no 1280-tall detail to invent, and
       a piece smaller than the target keeps its own width. */
    const target = Math.min(w, width);
    const name = `${piece.slug}-${w}.webp`;
    const info = await image
      .clone()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(join(OUT, name));
    files[w] = { file: `/design/${name}`, width: info.width, height: info.height };
    bytes += info.size;
  }

  assets[piece.slug] = {
    slides,
    width,
    height,
    ratio: Number((width / height).toFixed(4)),
    sources: files,
  };

  console.log(
    `  ${piece.slug.padEnd(38)} ${String(slides).padStart(2)}pp  ${width}x${height}  ->  ` +
      WIDTHS.map((w) => `${files[w].width}x${files[w].height}`).join(", "),
  );
}

writeFileSync(MANIFEST, `${JSON.stringify(assets, null, 2)}\n`);
console.log(
  `\n${Object.keys(assets).length} pieces, ${WIDTHS.length} widths each, ` +
    `${(bytes / 1024 / 1024).toFixed(2)}MB written to ${OUT}/`,
);
console.log(`manifest: ${MANIFEST}`);
