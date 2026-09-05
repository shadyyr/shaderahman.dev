/**
 * Turns the design sources in art/design/ into the web derivatives the site
 * actually serves, and writes what it measured into src/data/design-assets.json.
 *
 * Same arrangement as `npm run assets`: the output is
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
 * Every page ships, not just the cover. The grid gets one 640px thumbnail of
 * page 1 and the lightbox gets every page at 1280px, which is what turned 16
 * covers into 65 pages and is why the privacy review below is a whole-piece
 * job rather than a cover job.
 */

import * as mupdf from "mupdf";
import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const SRC = "art/design";
const OUT = "public/design";
const MANIFEST = "src/data/design-assets.json";
/* The grid renders a cover around 300px wide, so 640 covers a 2x display. The
   lightbox is the full-size view, and 1280 is enough for it without shipping a
   print-resolution page to a phone. */
const THUMB_WIDTH = 640;
const PAGE_WIDTH = 1280;
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
/* Emptied rather than written over. Every file in here is generated, the
   naming scheme has already changed once, and an orphan left behind by a
   rename still gets deployed and still gets served. */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/**
 * A piece's page count, plus a way to render one page at a time.
 *
 * Lazy on purpose: the officer introductions book is eleven 3240x4050 pages,
 * and holding all of them as pixmaps at once costs a few hundred MB to no end.
 */
function open(piece) {
  const path = join(SRC, piece.source);
  if (!existsSync(path)) throw new Error(`missing source: ${piece.source}`);
  const bytes = readFileSync(path);

  if (!/\.pdf$/i.test(path)) return { slides: 1, page: () => bytes };

  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  return {
    slides: doc.countPages(),
    page: (index) =>
      Buffer.from(
        doc
          .loadPage(index)
          .toPixmap(mupdf.Matrix.scale(PDF_SCALE, PDF_SCALE), mupdf.ColorSpace.DeviceRGB, false, true)
          .asPNG(),
      ),
  };
}

/**
 * Fills the given regions with solid black, at full page scale so the
 * fractions in design.ts describe the original artwork.
 *
 * Solid black rather than the blur this used to do, because he asked for it:
 * "id rather you put a black line over the sensitive info and show it all".
 * A blur also invites a viewer to squint at it, and a bar does not.
 */
async function blackOut(image, meta, boxes) {
  if (!boxes.length) return image;

  const bars = boxes.map((box) => {
    /* Clamped to the page. A fraction that runs off an edge is a typo, and
       sharp would throw on it several steps later with no mention of which
       piece it came from. */
    const left = Math.max(0, Math.min(meta.width - 1, Math.round(meta.width * box.left)));
    const top = Math.max(0, Math.min(meta.height - 1, Math.round(meta.height * box.top)));
    return {
      input: {
        create: {
          width: Math.max(1, Math.min(meta.width - left, Math.round(meta.width * box.width))),
          height: Math.max(1, Math.min(meta.height - top, Math.round(meta.height * box.height))),
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        },
      },
      left,
      top,
    };
  });
  return sharp(await image.composite(bars).toBuffer());
}

/** One page out to WebP at `width`, never upscaled past the source. */
async function emit(image, width, name) {
  const info = await image
    .clone()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(join(OUT, name));
  return { file: `/design/${name}`, width: info.width, height: info.height, size: info.size };
}

const assets = {};
let bytes = 0;
let files = 0;

for (const piece of pieces) {
  const source = open(piece);
  const redactions = piece.redact ?? [];

  /* A bar aimed at a page that does not exist is the one failure mode that
     ships the thing it was written to cover, so it stops the run rather than
     warning into a scrollback nobody reads. */
  for (const box of redactions) {
    if (!Number.isInteger(box.page) || box.page < 1 || box.page > source.slides) {
      throw new Error(
        `${piece.slug}: redact page ${box.page} is outside its ${source.slides} page(s)`,
      );
    }
  }

  const pages = [];
  let thumb = null;

  for (let index = 0; index < source.slides; index++) {
    const number = index + 1;
    let image = sharp(source.page(index));
    const meta = await image.metadata();
    image = await blackOut(
      image,
      meta,
      redactions.filter((box) => box.page === number),
    );

    const page = await emit(image, PAGE_WIDTH, `${piece.slug}-${number}.webp`);
    bytes += page.size;
    files++;
    pages.push({
      file: page.file,
      width: page.width,
      height: page.height,
      ratio: Number((page.width / page.height).toFixed(4)),
    });

    /* The grid only ever shows page 1, so only page 1 gets a thumbnail. */
    if (number === 1) {
      const small = await emit(image, THUMB_WIDTH, `${piece.slug}-thumb.webp`);
      bytes += small.size;
      files++;
      thumb = { file: small.file, width: small.width, height: small.height };
    }
  }

  assets[piece.slug] = { slides: source.slides, ratio: pages[0].ratio, thumb, pages };

  console.log(
    `  ${piece.slug.padEnd(38)} ${String(source.slides).padStart(2)}pp  ` +
      `${pages[0].width}x${pages[0].height}  ratio ${pages[0].ratio}` +
      (redactions.length ? `  ${redactions.length} bar(s)` : ""),
  );
}

writeFileSync(MANIFEST, `${JSON.stringify(assets, null, 2)}\n`);
console.log(
  `\n${Object.keys(assets).length} pieces, ${files} files, ` +
    `${(bytes / 1024 / 1024).toFixed(2)}MB written to ${OUT}/`,
);
console.log(`manifest: ${MANIFEST}`);
