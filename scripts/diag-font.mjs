// 번들 폰트가 실제로 기대한 glyph 를 품고 있는지 node 에서 검증.
import fs from "node:fs";
import wawoff2 from "wawoff2";
import opentype from "opentype.js";

const woff2 = fs.readFileSync("src/components/CodeView/assets/plastic-mono.woff2");
const ttf = Buffer.from(await wawoff2.decompress(woff2));
const font = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
console.log("family:", font.names.fontFamily?.en, "UPM:", font.unitsPerEm);
for (const cp of [0x001B, 0x0007, 0x00A0, 0x200B, 0xFEFF, 0x0030 /* "0" */]) {
  const g = font.charToGlyph(String.fromCodePoint(cp));
  console.log(
    "U+" + cp.toString(16).padStart(4, "0").toUpperCase(),
    "glyphIndex=", g?.index,
    "advance=", g?.advanceWidth,
    "commands=", g?.path?.commands?.length,
  );
}
