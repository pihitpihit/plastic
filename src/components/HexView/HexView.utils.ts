import type {
  HexViewCopyFormat,
  HexViewEndian,
  HexViewGroupSize,
  HexViewNonPrintable,
} from "./HexView.types";

export function normalizeData(
  input: Uint8Array | ArrayBuffer | number[],
): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return Uint8Array.from(input);
}

export function autoOffsetDigits(maxOffset: number): number {
  if (maxOffset <= 0xffff) return 4;
  if (maxOffset <= 0xffffff) return 6;
  if (maxOffset <= 0xffffffff) return 8;
  if (maxOffset <= 0xfffffffffff) return 12;
  return 16;
}

export function formatOffset(offset: number, digits: number): string {
  return offset.toString(16).toUpperCase().padStart(digits, "0");
}

export function hexOf(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, "0");
}

export function printableAscii(byte: number): boolean {
  return byte >= 0x20 && byte < 0x7f;
}

export function renderAsciiChar(
  byte: number,
  nonPrintable: HexViewNonPrintable,
): string {
  if (printableAscii(byte)) return String.fromCharCode(byte);
  if (typeof nonPrintable === "function") return nonPrintable(byte);
  if (nonPrintable === "dot") return ".";
  if (nonPrintable === "underscore") return "_";
  return " ";
}

/**
 * 한 행의 바이트를 endian 에 맞춰 재배치. 논리 오프셋은 변하지 않음 —
 * 이 함수는 "렌더 순서" 만을 계산하기 위한 보조.
 *
 * 반환: `renderPositions[i]` = i번째 렌더 슬롯이 참조하는 논리 오프셋의 row 내 인덱스
 *   - big:    [0, 1, 2, 3, 4, 5, 6, 7, ...]
 *   - little, groupSize=4: [3, 2, 1, 0, 7, 6, 5, 4, ...]
 */
export function renderOrderForRow(
  rowLength: number,
  groupSize: HexViewGroupSize,
  endian: HexViewEndian,
): number[] {
  const out: number[] = new Array(rowLength);
  if (groupSize === 1 || endian === "big") {
    for (let i = 0; i < rowLength; i++) out[i] = i;
    return out;
  }
  for (let i = 0; i < rowLength; i += groupSize) {
    const groupEnd = Math.min(i + groupSize, rowLength);
    const len = groupEnd - i;
    for (let j = 0; j < len; j++) {
      out[i + j] = groupEnd - 1 - j;
    }
  }
  return out;
}

export function formatBytes(
  slice: Uint8Array,
  fmt: HexViewCopyFormat,
): string {
  switch (fmt) {
    case "hex":
      return Array.from(slice, (b) => hexOf(b)).join(" ");
    case "ascii":
      return Array.from(slice, (b) =>
        printableAscii(b) ? String.fromCharCode(b) : ".",
      ).join("");
    case "c-array": {
      const parts = Array.from(slice, (b) => "0x" + hexOf(b).toLowerCase());
      const lines: string[] = [];
      for (let i = 0; i < parts.length; i += 16) {
        lines.push(parts.slice(i, i + 16).join(", "));
      }
      return "{ " + lines.join(",\n  ") + " }";
    }
  }
}

/**
 * bytesPerRow 의 가장 큰 약수 중 요청된 groupSize 이하인 값을 반환.
 * groupSize 가 이미 약수면 그대로 반환.
 */
export function resolveGroupSize(
  bytesPerRow: number,
  requested: HexViewGroupSize,
): HexViewGroupSize {
  if (bytesPerRow % requested === 0) return requested;
  const candidates: HexViewGroupSize[] = [8, 4, 2, 1];
  for (const c of candidates) {
    if (c <= requested && bytesPerRow % c === 0) return c;
  }
  return 1;
}
