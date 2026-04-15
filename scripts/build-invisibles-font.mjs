/**
 * Build PlasticMono — a JetBrains Mono NL derivative whose control-character
 * glyphs render as 3ch-wide mnemonic labels ("ESC", "BEL", …).
 *
 * Pipeline:
 *   1. Fetch JetBrains Mono NL Regular.ttf (Apache-2.0) if not cached.
 *   2. Load it with opentype.js.
 *   3. For each target codepoint, synthesize a glyph whose advanceWidth is
 *      exactly 3 × the "0" digit advance, and whose outline is the base
 *      font's uppercase letter paths (e.g., E, S, C) concatenated
 *      horizontally with ~55% scale so three letters fit inside 3ch.
 *   4. Export as .ttf, then convert to .woff2 via wawoff2.
 *
 * Output:
 *   src/components/CodeView/assets/plastic-mono.woff2
 *   src/components/CodeView/assets/plastic-mono.glyphs.json   (debug manifest)
 *
 * Run:
 *   node scripts/build-invisibles-font.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import wawoff2 from "wawoff2";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, "..");

const CACHE_DIR  = path.join(__dirname, ".cache");
const BASE_TTF   = path.join(CACHE_DIR, "JetBrainsMonoNL-Regular.ttf");
const BASE_URL   = "https://github.com/JetBrains/JetBrainsMono/raw/v2.304/fonts/ttf/JetBrainsMonoNL-Regular.ttf";

const OUT_DIR    = path.join(ROOT, "src/components/CodeView/assets");
const OUT_WOFF2  = path.join(OUT_DIR, "plastic-mono.woff2");
const OUT_BASE64 = path.join(OUT_DIR, "plastic-mono.woff2-base64.ts");
const OUT_MANIFEST = path.join(OUT_DIR, "plastic-mono.glyphs.json");

fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR,   { recursive: true });

// ── Target codepoints and their mnemonics ─────────────────────────────────
// Must match CodeView.invisibles.tsx MNEMONICS.
const MNEMONICS = {
  0x0001: "SOH", 0x0002: "STX", 0x0003: "ETX", 0x0004: "EOT",
  0x0005: "ENQ", 0x0006: "ACK", 0x0007: "BEL", 0x0008: "BSP",
  0x000B: "VTB", 0x000C: "FFD", 0x000D: "CRT",
  0x000E: "SFO", 0x000F: "SFI", 0x0010: "DLE", 0x0011: "DC1",
  0x0012: "DC2", 0x0013: "DC3", 0x0014: "DC4", 0x0015: "NAK",
  0x0016: "SYN", 0x0017: "ETB", 0x0018: "CAN", 0x0019: "EOM",
  0x001A: "SUB", 0x001B: "ESC", 0x001C: "FSP", 0x001D: "GSP",
  0x001E: "RSP", 0x001F: "USP", 0x007F: "DEL",
  0x00A0: "NBS", 0x00AD: "SHY", 0x034F: "CGJ", 0x180E: "MVS",
  0x200B: "ZWS", 0x200C: "ZWN", 0x200D: "ZWJ",
  0x200E: "LRM", 0x200F: "RLM",
  0x202A: "LRE", 0x202B: "RLE", 0x202C: "PDF",
  0x202D: "LRO", 0x202E: "RLO",
  0x2060: "WJR", 0x2061: "FAP", 0x2062: "ITP",
  0x2063: "ISP", 0x2064: "IPL",
  0xFEFF: "BOM",
};

async function ensureBaseFont() {
  if (fs.existsSync(BASE_TTF)) return;
  console.log("→ fetching base font:", BASE_URL);
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error(`base font fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(BASE_TTF, buf);
  console.log("  saved", BASE_TTF, `(${buf.length} bytes)`);
}

function cloneGlyph(src, { unicode, name, advanceWidth }) {
  const g = new opentype.Glyph({
    name,
    unicode,
    advanceWidth: advanceWidth ?? src.advanceWidth,
    path: new opentype.Path(),
  });
  // copy path commands
  for (const c of src.path.commands) {
    g.path.commands.push({ ...c });
  }
  return g;
}

/**
 * Build a synthetic glyph for `codepoint` whose outline is the base font's
 * capital letters for `mnemonic`, scaled and laid out inside a slot of
 * `slotWidth` font units. advanceWidth is forced to `slotWidth`.
 */
function buildMnemonicGlyph(base, codepoint, mnemonic, slotWidth) {
  const letters = [...mnemonic].map((ch) => base.charToGlyph(ch));
  const ascender = base.ascender;
  const descender = base.descender; // negative
  const capHeight = (base.tables.os2 && base.tables.os2.sCapHeight) || ascender * 0.7;

  // Stack 3 uppercase letters horizontally; scale so they fit in slotWidth
  // with a bit of padding. Each letter's advanceWidth is ~1ch in the base
  // font (typical UPM=1000, "0" advance=600). 3 letters advance ≈ 3ch.
  // We compress slightly (≈92%) and center vertically near cap-height.
  const letterAdvTotal = letters.reduce((s, g) => s + g.advanceWidth, 0);
  const paddingPerSide = slotWidth * 0.06;
  const availableWidth = slotWidth - paddingPerSide * 2;
  const scale = Math.min(1, availableWidth / letterAdvTotal);

  // Vertical: center capitals around font baseline midline of capHeight.
  const letterHeight = capHeight * scale;
  const yShift = (capHeight - letterHeight) / 2; // keep roughly centered on caps
  const yOffset = yShift; // baseline remains at y=0 (opentype.js convention)

  const outPath = new opentype.Path();
  let x = paddingPerSide;
  for (const g of letters) {
    const adv = g.advanceWidth * scale;
    for (const cmd of g.path.commands) {
      const t = { ...cmd };
      const tx = (v) => x + v * scale;
      const ty = (v) => yOffset + v * scale;
      if (t.type === "M" || t.type === "L") {
        t.x = tx(cmd.x); t.y = ty(cmd.y);
      } else if (t.type === "C") {
        t.x1 = tx(cmd.x1); t.y1 = ty(cmd.y1);
        t.x2 = tx(cmd.x2); t.y2 = ty(cmd.y2);
        t.x  = tx(cmd.x);  t.y  = ty(cmd.y);
      } else if (t.type === "Q") {
        t.x1 = tx(cmd.x1); t.y1 = ty(cmd.y1);
        t.x  = tx(cmd.x);  t.y  = ty(cmd.y);
      } else if (t.type === "Z") {
        // no-op
      }
      outPath.commands.push(t);
    }
    x += adv;
  }

  return new opentype.Glyph({
    name: `mnemonic_${mnemonic}_${codepoint.toString(16)}`,
    unicode: codepoint,
    advanceWidth: slotWidth,
    path: outPath,
  });
}

async function main() {
  await ensureBaseFont();
  const base = opentype.loadSync(BASE_TTF);
  console.log("→ base font loaded", base.names.fontFamily?.en, "UPM=", base.unitsPerEm);

  const zeroAdv = base.charToGlyph("0").advanceWidth;
  console.log("  '0' advance =", zeroAdv, "UPM units");

  // Keep the base font's .notdef so the font is valid
  const glyphs = [base.glyphs.get(0)]; // .notdef

  // Keep the essential ASCII + common invisibles as base glyphs so text
  // rendered with this font is visually identical to JetBrains Mono NL for
  // normal chars (same metrics → 1ch math consistent).
  const keepRanges = [
    [0x0020, 0x007E], // basic latin printable
    [0x00A1, 0x017F], // latin-1 supplement + latin extended-A (common accents)
    [0x2018, 0x201F], // quote marks
    [0x2026, 0x2026], // …
    [0x2190, 0x2193], // arrows (tab arrow fallback)
    [0x00B7, 0x00B7], // middle dot (space visualizer)
  ];
  const included = new Set();
  for (const [lo, hi] of keepRanges) {
    for (let cp = lo; cp <= hi; cp++) {
      const g = base.charToGlyph(String.fromCodePoint(cp));
      if (g && g.index !== 0) {
        glyphs.push(cloneGlyph(g, {
          unicode: cp,
          name: `u${cp.toString(16).padStart(4, "0")}`,
        }));
        included.add(cp);
      }
    }
  }

  const slotWidth = zeroAdv * 3;
  const manifest = [];
  for (const [cpStr, mnemonic] of Object.entries(MNEMONICS)) {
    const cp = Number(cpStr);
    const g = buildMnemonicGlyph(base, cp, mnemonic, slotWidth);
    glyphs.push(g);
    manifest.push({ codepoint: "U+" + cp.toString(16).toUpperCase().padStart(4, "0"), mnemonic, advance: slotWidth });
  }

  const synthesized = new opentype.Font({
    familyName: "PlasticMono",
    styleName: "Regular",
    unitsPerEm: base.unitsPerEm,
    ascender: base.ascender,
    descender: base.descender,
    glyphs,
  });

  // Export ttf then convert to woff2.
  const ttfBuffer = Buffer.from(synthesized.toArrayBuffer());
  const woff2Buffer = Buffer.from(await wawoff2.compress(ttfBuffer));
  fs.writeFileSync(OUT_WOFF2, woff2Buffer);
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify({ glyphs: manifest, zeroAdvance: zeroAdv, slotWidth }, null, 2));

  // Emit a TS module with the woff2 as base64 so the asset travels with the
  // JS bundle (no separate static file handling required in consumers).
  const b64 = woff2Buffer.toString("base64");
  fs.writeFileSync(
    OUT_BASE64,
    `// AUTO-GENERATED by scripts/build-invisibles-font.mjs. DO NOT EDIT.\n` +
    `// Source: JetBrains Mono NL Regular (Apache-2.0) with synthesized\n` +
    `// mnemonic glyphs for ASCII control characters + Unicode invisibles.\n` +
    `export const PLASTIC_MONO_WOFF2_BASE64 = ${JSON.stringify(b64)};\n`,
  );

  console.log("→ wrote", OUT_WOFF2, `(${woff2Buffer.length} bytes)`);
  console.log("  mnemonic glyphs:", manifest.length, "baseline glyphs kept:", included.size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
