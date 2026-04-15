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
const OUT_PUAMAP  = path.join(OUT_DIR, "plastic-mono.pua-map.ts");

// 각 제어 문자 glyph 에 부여할 Private Use Area alias 의 시작 코드포인트.
// 브라우저가 C0 제어 문자를 폰트 cmap 조회 없이 렌더 스킵 하기 때문에,
// 동일 glyph 를 PUA 에도 매핑해 두고 렌더 시점에 치환한다.
const PUA_BASE = 0xE100;

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

  const g = new opentype.Glyph({
    name: `mnemonic_${mnemonic}_${codepoint.toString(16)}`,
    unicode: codepoint,
    advanceWidth: slotWidth,
    path: outPath,
  });
  return g;
}

/** Duplicate an existing synthesized glyph under a different unicode (PUA alias).
 *  opentype.js's cmap writer only honors `glyph.unicode`, so aliasing requires
 *  a separate glyph entry that shares the same path + advance. */
function aliasGlyph(src, aliasCodepoint, suffix) {
  const g = new opentype.Glyph({
    name: `${src.name}_alias_${suffix}`,
    unicode: aliasCodepoint,
    advanceWidth: src.advanceWidth,
    path: new opentype.Path(),
  });
  for (const c of src.path.commands) g.path.commands.push({ ...c });
  return g;
}

async function main() {
  await ensureBaseFont();
  const base = opentype.loadSync(BASE_TTF);
  console.log("→ base font loaded", base.names.fontFamily?.en, "UPM=", base.unitsPerEm);

  const zeroAdv = base.charToGlyph("0").advanceWidth;
  console.log("  '0' advance =", zeroAdv, "UPM units");

  // 베이스 폰트의 모든 테이블(OS/2, name, hhea, post 등) 을 그대로 유지해
  // Chrome OpenType Sanitizer(OTS) 가 검증하는 메타데이터 무결성을 보장한다.
  // 여기에 synthesized glyph 만 append 한다.
  // 모든 글리프를 lazy-resolve 해 이후 재직렬화가 올바르게 작동하도록 한다.
  for (let i = 0; i < base.glyphs.length; i++) base.glyphs.get(i);

  const slotWidth = zeroAdv * 3;
  const manifest = [];
  const puaPairs = [];
  const entries = Object.entries(MNEMONICS)
    .map(([cpStr, mnemonic]) => [Number(cpStr), mnemonic])
    .sort((a, b) => a[0] - b[0]);

  let nextIdx = base.glyphs.length;
  // 베이스 폰트의 일부 테이블(post 등)은 font.familyName/styleName 에서
  // 이름을 구성하므로, 우리 커스텀 표식으로 덮는다.
  if (base.names && base.names.fontFamily) {
    const newFamily = "PlasticMono";
    for (const langKey of Object.keys(base.names.fontFamily)) {
      base.names.fontFamily[langKey] = newFamily;
    }
  }
  if (base.names && base.names.fullName) {
    for (const langKey of Object.keys(base.names.fullName)) {
      base.names.fullName[langKey] = "PlasticMono Regular";
    }
  }
  if (base.names && base.names.postScriptName) {
    for (const langKey of Object.keys(base.names.postScriptName)) {
      base.names.postScriptName[langKey] = "PlasticMono-Regular";
    }
  }

  entries.forEach(([cp, mnemonic], idx) => {
    const puaCp = PUA_BASE + idx;
    const g = buildMnemonicGlyph(base, cp, mnemonic, slotWidth);
    // 베이스 폰트에 이미 해당 codepoint 용 glyph 가 있으면(예: U+00A0 NBS,
    // U+00AD SHY, U+200B ZWS 등) 그 자리를 교체해 cmap 중복 엔트리를 피한다.
    // C0 제어 문자 대다수는 base 에 없으므로 append 한다.
    const existing = base.charToGlyph(String.fromCodePoint(cp));
    if (existing && existing.index && existing.index !== 0) {
      g.index = existing.index;
      base.glyphs.glyphs[existing.index] = g;
    } else {
      g.index = nextIdx;
      base.glyphs.glyphs[nextIdx] = g;
      nextIdx++;
    }
    // PUA alias 는 항상 append (PUA U+E100–U+E131 은 base 에 없음).
    const aliasG = aliasGlyph(g, puaCp, "pua" + puaCp.toString(16));
    aliasG.index = nextIdx;
    base.glyphs.glyphs[nextIdx] = aliasG;
    nextIdx++;
    manifest.push({
      codepoint: "U+" + cp.toString(16).toUpperCase().padStart(4, "0"),
      pua:       "U+" + puaCp.toString(16).toUpperCase().padStart(4, "0"),
      mnemonic,
      advance: slotWidth,
    });
    puaPairs.push([cp, puaCp, mnemonic]);
  });
  base.glyphs.length = nextIdx;

  // Export ttf then convert to woff2.
  const ttfBuffer = Buffer.from(base.toArrayBuffer());
  const woff2Buffer = Buffer.from(await wawoff2.compress(ttfBuffer));
  fs.writeFileSync(OUT_WOFF2, woff2Buffer);
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify({ glyphs: manifest, zeroAdvance: zeroAdv, slotWidth }, null, 2));

  // Emit a TS module with the woff2 as base64 so the asset travels with the
  // JS bundle (no separate static file handling required in consumers).
  const b64 = woff2Buffer.toString("base64");
  // 콘텐츠 기반 버전 — HMR / 브라우저 폰트 캐시 무효화에 사용.
  const crypto = await import("node:crypto");
  const version = crypto.createHash("sha1").update(woff2Buffer).digest("hex").slice(0, 8);
  fs.writeFileSync(
    OUT_BASE64,
    `// AUTO-GENERATED by scripts/build-invisibles-font.mjs. DO NOT EDIT.\n` +
    `// Source: JetBrains Mono NL Regular (Apache-2.0) with synthesized\n` +
    `// mnemonic glyphs for ASCII control characters + Unicode invisibles.\n` +
    `export const PLASTIC_MONO_WOFF2_BASE64 = ${JSON.stringify(b64)};\n` +
    `export const PLASTIC_MONO_VERSION = ${JSON.stringify(version)};\n`,
  );

  // Emit PUA substitution maps consumed by CodeView runtime.
  const hex = (n) => "\\u" + n.toString(16).toUpperCase().padStart(4, "0");
  const c0ToPua = puaPairs
    .map(([cp, pua]) => `  "${hex(cp)}": "${hex(pua)}",`)
    .join("\n");
  const puaToC0 = puaPairs
    .map(([cp, pua]) => `  "${hex(pua)}": "${hex(cp)}",`)
    .join("\n");
  const minPua = Math.min(...puaPairs.map(([, p]) => p));
  const maxPua = Math.max(...puaPairs.map(([, p]) => p));
  const c0CharClass = puaPairs
    .map(([cp]) => hex(cp))
    .join("");
  fs.writeFileSync(
    OUT_PUAMAP,
    `// AUTO-GENERATED by scripts/build-invisibles-font.mjs. DO NOT EDIT.\n` +
    `// Maps between original control / invisible codepoints and the PUA\n` +
    `// aliases baked into PlasticMono. 1:1 substitution (same string length)\n` +
    `// guarantees caret/selection offsets remain valid under substitution.\n\n` +
    `export const C0_TO_PUA: Readonly<Record<string, string>> = {\n${c0ToPua}\n};\n\n` +
    `export const PUA_TO_C0: Readonly<Record<string, string>> = {\n${puaToC0}\n};\n\n` +
    `/** Matches any control / invisible codepoint that has a PUA alias. */\n` +
    `export const C0_REGEX = /[${c0CharClass}]/g;\n\n` +
    `/** Matches any PUA alias used by PlasticMono. */\n` +
    `export const PUA_REGEX = /[${hex(minPua)}-${hex(maxPua)}]/g;\n`,
  );

  console.log("→ wrote", OUT_WOFF2, `(${woff2Buffer.length} bytes)`);
  console.log("  mnemonic glyphs:", manifest.length, "total glyphs:", nextIdx);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
