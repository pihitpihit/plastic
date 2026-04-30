import type { ChatBubbleTheme } from "./ChatBubble.types";

/** theme 별 기본 배경 / 텍스트 색상. */
export const defaultBubbleColors: Record<
  ChatBubbleTheme,
  { bg: string; fg: string; metaFg: string }
> = {
  light: { bg: "#f3f4f6", fg: "#111827", metaFg: "#6b7280" },
  dark: { bg: "#374151", fg: "#f9fafb", metaFg: "#9ca3af" },
};

/**
 * 배경색의 명도를 보고 자동으로 글자색을 결정.
 *   - 어두운 배경 → 흰 글자
 *   - 밝은 배경 → 검정 글자
 *
 * 사용자 색이 지정됐을 때만 호출. theme 기본 색은 별도 metaFg 와 함께 미리 결정.
 */
export function pickContrastFg(bg: string): string {
  // hex(#abc / #aabbcc) 만 명시적 처리. 그 외 색은 안전하게 검정 fg 반환.
  const hex = parseHex(bg);
  if (!hex) return "#111827";
  const { r, g, b } = hex;
  // sRGB → relative luminance (간이)
  const lum =
    (0.2126 * r) / 255 + (0.7152 * g) / 255 + (0.0722 * b) / 255;
  return lum > 0.55 ? "#111827" : "#ffffff";
}

function parseHex(input: string): { r: number; g: number; b: number } | null {
  const s = input.trim();
  if (!s.startsWith("#")) return null;
  let hex = s.slice(1);
  if (hex.length === 3) {
    const r = hex[0]!;
    const g = hex[1]!;
    const b = hex[2]!;
    hex = r + r + g + g + b + b;
  }
  if (hex.length !== 6) return null;
  const num = parseInt(hex, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}
