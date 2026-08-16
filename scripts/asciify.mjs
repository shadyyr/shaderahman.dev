/**
 * Turns an image into a block of symbol art.
 *
 *   npm run ascii -- art/portrait.png src/assets/portrait.txt --cols 84
 *
 * The output is plain text, committed, and rendered by AsciiArt.astro. A normal
 * build never runs this, the same arrangement generate-assets.mjs uses: the
 * expensive step happens once, by hand, and its result is what ships.
 *
 * Transparent pixels become spaces, so the shape of the subject is carried by
 * the input's alpha channel rather than by anything in here. Cutting a subject
 * out of its background is a separate job with its own tools; this script only
 * needs the result. See HANDOFF section 18 for how the portrait was cut.
 */

import { writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";
import sharp from "sharp";

/* ------------------------------------------------------------------ ramp ---
   Ordered lightest to heaviest by how much ink each glyph actually puts in its
   cell. Measured, not guessed: each glyph was drawn in IBM Plex Mono at 400px
   in Chrome and its coverage read off the canvas as a fraction of the cell,
   which is one advance wide by one em tall. Method and numbers are in HANDOFF
   section 18.

     -  0.0408    /  0.1078    =  0.1101    *  0.1402
     #  0.2301    @  0.2799    $  0.2871

   Two of those are not what the characters look like they should be, and
   guessing got both of them wrong. `$` is the heaviest glyph in the set, ahead
   of `@` and `#`, because a full height bar runs through an already dense S.
   And `/` and `=` are a dead heat, 0.0023 apart, so those two ramp steps read
   as one density in two textures rather than as two steps.

   Space is not one of the ramp's steps, and `--cut` is a separate decision on
   purpose. The ramp says how dense a drawn cell is; the cut says how much of
   the picture is drawn at all.

   Keeping them apart is what lets the same script do two quite different
   things. At `--cut 0` every cell inside the subject gets a glyph and the
   result is a filled halftone whose silhouette can never break, which is what
   you want when the subject's own outline is carrying the picture. At 0.5 half
   of it is left blank and the result is a stencil: only the tones past the cut
   are drawn, and the shape comes from where the drawing stops. That is the
   register this portrait is in, and it is the reason the subject reads as
   something drawn rather than something filled in.
   -------------------------------------------------------------------------- */
const RAMP = "-/=*#@$";

/*
  A monospace cell is taller than it is wide. IBM Plex Mono advances exactly
  0.600 em, measured the same run as the coverages above and agreeing to five
  places between layout and the canvas text metrics, and AsciiArt.astro sets
  line-height to exactly 1, so one cell is 0.6 wide by 1.0 tall. Sampling on a
  square grid and rendering into that cell is the classic way ASCII portraits
  come out stretched vertically; the row count has to carry the same 0.6.
*/
const CELL_ASPECT = 0.6;

const usage = `
usage: node scripts/asciify.mjs <input> <output.txt> [options]

  --cols <n>       width of the grid in characters (default 110)
  --ramp <chars>   lightest to heaviest (default "${RAMP}")
  --equalize <f>   0 keeps the photograph's own tones, 1 spreads the ramp
                   evenly over them, between the two mixes (default 1)
  --local <f>      local contrast, how hard to push a cell away from the
                   average of its neighbourhood (default 0.6)
  --radius <n>     that neighbourhood, in cells (default 5)
  --dither <f>     break flat areas into a mix of neighbouring glyphs rather
                   than one repeated glyph (default 0.7)
  --gamma <f>      <1 lifts the shadows, >1 deepens them (default 1)
  --cut <0..1>     leave this share of the picture open, drawing only the rest
                   (default 0.5, so half the subject is blank)
  --alpha <0..1>   cell is subject when mean alpha is above this (default 0.5)
  --cell <f>       character advance width in ems (default ${CELL_ASPECT})
  --invert         map bright to sparse instead of bright to dense
`;

const args = argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

const [input, output] = positional;
if (!input || !output) {
  console.error(usage);
  exit(1);
}

/*
  The defaults are the values the portrait shipped with, chosen off a contact
  sheet of six parameter sets rendered at the size they ship at, in the real
  font, rather than reasoned about. For a new image, build the same sheet and
  look at it. Reading these numbers off the text in a terminal does not work:
  the question is only ever what the glyphs add up to at 6px.
*/
const cols = Number(flag("cols", 110));
const ramp = flag("ramp", RAMP);
const equalize = Number(flag("equalize", 1));
const local = Number(flag("local", 0.6));
const radius = Number(flag("radius", 5));
const dither = Number(flag("dither", 0.7));
const cut = Number(flag("cut", 0.5));
const gamma = Number(flag("gamma", 1));
const alphaCut = Number(flag("alpha", 0.5));
const cell = Number(flag("cell", CELL_ASPECT));
const invert = args.includes("--invert");

/* ---------------------------------------------------------------- sample --- */

const meta = await sharp(input).metadata();
const rows = Math.round((cols * cell * meta.height) / meta.width);

/*
  sharp's own resize does the box filter, which is the right average for this:
  every output cell is the mean of the source pixels under it, so a cell holding
  one bright highlight in shadow lands mid-ramp rather than snapping to either
  end. `fit: fill` because the grid is already the image's aspect corrected for
  the cell, and letting it letterbox would put transparent bars in the art.

  Alpha has to survive the resize as its own channel, so no flatten anywhere:
  premultiplying against black would drag every edge pixel dark and eat the
  outline of the subject exactly where it matters most.
*/
const { data, info } = await sharp(input)
  .ensureAlpha()
  .resize(cols, rows, { fit: "fill", kernel: "lanczos3" })
  .raw()
  .toBuffer({ resolveWithObject: true });

const channels = info.channels;
const lum = new Float64Array(cols * rows);
const alpha = new Float64Array(cols * rows);

for (let p = 0; p < cols * rows; p++) {
  const i = p * channels;
  lum[p] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  alpha[p] = data[i + 3] / 255;
}

/* --------------------------------------------------------- local contrast -
   A face photographed in a dim room against a pale shirt is the hard case for
   any global tone curve. On this photograph the lit side of the face measures
   0.22 to 0.34 and the shirt measures 0.59 to 0.63, so no curve that keeps the
   shirt bright leaves the face more than about two ramp steps to work with, and
   the eyes, nose and smile all land on the same character.

   So each cell is also pushed away from the average of its neighbourhood, which
   is what actually carries a feature: an eye socket is not dark in absolute
   terms, it is darker than the cheek beside it. The neighbourhood average skips
   cells outside the subject, otherwise every cell near the outline would be
   compared against transparent black and the whole silhouette would gain a
   bright rim.
   -------------------------------------------------------------------------- */
if (local > 0) {
  const mean = new Float64Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= rows) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= cols) continue;
          const q = yy * cols + xx;
          if (alpha[q] < alphaCut) continue;
          sum += lum[q];
          n++;
        }
      }
      mean[y * cols + x] = n ? sum / n : lum[y * cols + x];
    }
  }
  for (let p = 0; p < lum.length; p++) {
    if (alpha[p] < alphaCut) continue;
    lum[p] = Math.min(1, Math.max(0, lum[p] + local * (lum[p] - mean[p])));
  }
}

/*
  Normalise against the subject only. A cut-out sits on transparent black, and
  including that in the range would peg the whole subject into the top half of
  the ramp: the photograph this was written for has hair at luminance 0 and a
  background at luminance 0, and the only reason they are distinguishable at all
  is that one of them is inside the alpha and the other is not.
*/
let min = 1;
let max = 0;
for (let p = 0; p < lum.length; p++) {
  if (alpha[p] < alphaCut) continue;
  if (lum[p] < min) min = lum[p];
  if (lum[p] > max) max = lum[p];
}
const span = max - min || 1;

/*
  Then spread the ramp over the tones the subject actually has, rather than over
  the range they occupy.

  A photograph of a person in a pale shirt is close to two tones: a large flat
  bright area and a much smaller face. Stretched linearly, roughly half the
  cells land in the top ramp step and the shirt renders as one solid block of
  the heaviest glyph while every feature in the face fights over two steps. That
  is what the first render of this portrait did.

  Equalising against the cumulative histogram gives each ramp step about the
  same number of cells, so the shirt collapses into the two or three steps its
  own variation deserves and the face gets the rest. Mixing it back with the
  linear ramp was tried at 0.4, 0.6, 0.75 and 0.9 and every one of them was
  worse than going the whole way: below about 0.9 the face loses the separation
  between a lit cheek and the shadow beside it, which is the thing that makes
  it read as a face at all.
*/
const CDF_BINS = 256;
const hist = new Float64Array(CDF_BINS);
let counted = 0;
for (let p = 0; p < lum.length; p++) {
  if (alpha[p] < alphaCut) continue;
  hist[Math.min(CDF_BINS - 1, Math.floor(((lum[p] - min) / span) * CDF_BINS))]++;
  counted++;
}
const cdf = new Float64Array(CDF_BINS);
let running = 0;
for (let b = 0; b < CDF_BINS; b++) {
  running += hist[b];
  cdf[b] = counted ? running / counted : 0;
}

/*
  Rescale so the darkest tone present still lands at 0.

  A raw cumulative histogram maps the darkest bin to its own share of the
  cells, not to zero, and on this portrait the hair is one flat black mass
  holding well over a seventh of them. That put the floor of the ramp above
  the first step and the lightest glyph never got drawn at all: the art came
  out of `-` entirely, in six characters instead of seven, with the hair a
  step heavier than the photograph says it is.

  Subtracting the floor and rescaling costs nothing when the histogram is
  already spread, since the term goes to zero.
*/
const cdfMin = cdf[hist.findIndex((n) => n > 0)] ?? 0;
const cdfSpan = 1 - cdfMin || 1;

/* ---------------------------------------------------------------- dither ---
   Seven ramp steps is not many, and a region flatter than one step wide comes
   out as one glyph repeated. That is the difference between a dark mass that
   reads as hair and one that reads as a helmet, and on this photograph it is
   unavoidable without dithering: the hair carries no tonal variation at all to
   render, sitting at luminance 0 to 4 across the whole mass.

   An ordered Bayer threshold trades spatial resolution, of which there is
   plenty at 110 columns, for tonal resolution, of which there is almost none.
   A flat area lands between two ramp steps and the matrix decides which of the
   two each cell takes, so the area reads as the average of both and picks up
   the grain a dark region in a photograph actually has.

   Ordered rather than error diffusion on purpose. Floyd-Steinberg pushes its
   error to the right and down, which on a grid this coarse walks visible
   streaks across the face; the Bayer pattern is fixed, so it stays texture.
   -------------------------------------------------------------------------- */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/* ------------------------------------------------------------------ draw --- */

const lines = [];
for (let y = 0; y < rows; y++) {
  let line = "";
  for (let x = 0; x < cols; x++) {
    const p = y * cols + x;
    if (alpha[p] < alphaCut) {
      line += " ";
      continue;
    }
    const linear = (lum[p] - min) / span;
    let level = linear;
    if (equalize > 0) {
      const raw = cdf[Math.min(CDF_BINS - 1, Math.floor(linear * CDF_BINS))];
      const flat = (raw - cdfMin) / cdfSpan;
      level = linear * (1 - equalize) + flat * equalize;
    }
    if (gamma !== 1) level = level ** gamma;
    if (invert) level = 1 - level;
    if (dither > 0) {
      // Offset by up to half a ramp step, so a cell can only ever be nudged
      // into a glyph it was already next to. Applied before the cut, so the
      // edge where the drawing gives out is grained rather than a clean line.
      level += ((BAYER[y % 4][x % 4] + 0.5) / 16 - 0.5) * (dither / ramp.length);
    }
    if (level < cut) {
      line += " ";
      continue;
    }
    const step = Math.floor(((level - cut) / (1 - cut)) * ramp.length);
    line += ramp[Math.min(ramp.length - 1, Math.max(0, step))];
  }
  lines.push(line);
}

/* ------------------------------------------------------------------ crop ---
   Emit the drawn extent, not the sampling grid.

   These are not the same rectangle once anything is cut. The subject fills the
   frame, but this portrait's shirt is the brightest thing in it and the cut
   takes all of it, so the art was drawn in 62 of 110 columns with 21 blank ones
   down the left. AsciiArt.astro reads the column count off the longest line and
   sizes the type so that many columns fill the container, which would have put
   the picture off to the right of its own box at the wrong scale, in a way that
   looks like a layout bug and is not one.

   Cropping here rather than teaching the component to find the ink keeps the
   file honest: what is in it is what gets drawn, and its width and height are
   the picture's own.
   -------------------------------------------------------------------------- */
const inked = lines.map((line) => line.search(/\S/));
const firstRow = inked.findIndex((i) => i !== -1);
const lastRow = inked.findLastIndex((i) => i !== -1);
const left = Math.min(...inked.filter((i) => i !== -1));
const right = Math.max(...lines.map((line) => line.replace(/\s+$/, "").length));

const art = lines
  .slice(firstRow, lastRow + 1)
  // Trailing spaces carry no ink and only cost bytes. Leading ones are cut to
  // the same column on every row, so the grid stays square.
  .map((line) => line.slice(left, right).replace(/\s+$/, ""))
  .join("\n");
await writeFile(output, art + "\n");

const drawn = art.split("\n");
const ink = art.length - (art.match(/[ \n]/g) ?? []).length;
console.log(
  `${output}: sampled ${cols}x${rows}, drawn ${Math.max(...drawn.map((l) => l.length))}x${drawn.length}, ${ink} inked, ` +
    `${(Buffer.byteLength(art) / 1024).toFixed(1)}KB, ramp "${ramp}"`,
);
