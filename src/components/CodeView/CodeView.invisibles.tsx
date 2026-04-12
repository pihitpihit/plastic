/**
 * Internal — not exported from the package.
 *
 * Renders invisible characters as visual markers:
 *   - Tab        → arrow (→) with tab-width inline-block
 *   - Space      → middle dot (·)
 *   - Known invisible Unicode → 3-char uppercase mnemonic chip
 */
import type { ReactNode } from "react";
import type { CodeViewTheme } from "./CodeView.types";

const INVISIBLE_COLOR: Record<CodeViewTheme, string> = {
  light: "rgba(0,0,0,0.22)",
  dark: "rgba(255,255,255,0.28)",
};

const CHIP_COLORS: Record<CodeViewTheme, { background: string; color: string }> = {
  light: { background: "rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.45)" },
  dark: { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" },
};

/** Unicode invisible characters → 3-char mnemonic */
const MNEMONICS: Readonly<Record<string, string>> = {
  "\u00A0": "NBS", // Non-breaking space
  "\u00AD": "SHY", // Soft hyphen
  "\u034F": "CGJ", // Combining grapheme joiner
  "\u180E": "MVS", // Mongolian vowel separator
  "\u200B": "ZWS", // Zero-width space
  "\u200C": "ZWN", // Zero-width non-joiner
  "\u200D": "ZWJ", // Zero-width joiner
  "\u200E": "LRM", // Left-to-right mark
  "\u200F": "RLM", // Right-to-left mark
  "\u202A": "LRE", // Left-to-right embedding
  "\u202B": "RLE", // Right-to-left embedding
  "\u202C": "PDF", // Pop directional formatting
  "\u202D": "LRO", // Left-to-right override
  "\u202E": "RLO", // Right-to-left override
  "\u2060": "WJR", // Word joiner
  "\u2061": "FAP", // Function application (invisible)
  "\u2062": "ITP", // Invisible times
  "\u2063": "ISP", // Invisible separator
  "\u2064": "IPL", // Invisible plus
  "\uFEFF": "BOM", // Zero-width no-break space / BOM
};

const CHIP_BASE_STYLE = {
  display: "inline-flex" as const,
  alignItems: "center" as const,
  fontSize: "0.6em",
  fontWeight: 700 as const,
  lineHeight: 1 as const,
  padding: "1px 3px",
  borderRadius: "3px",
  verticalAlign: "middle" as const,
  marginInline: "1px",
  letterSpacing: "0.03em",
};

/**
 * Splits a token's string content into an array of ReactNodes,
 * replacing each invisible character with its visual representation.
 */
export function renderWithInvisibles(
  content: string,
  theme: CodeViewTheme,
  tabSize: number
): ReactNode[] {
  const result: ReactNode[] = [];
  let buffer = "";
  let key = 0;

  const flush = () => {
    if (buffer) {
      result.push(buffer);
      buffer = "";
    }
  };

  for (const char of content) {
    if (char === "\t") {
      flush();
      result.push(
        <span
          key={key++}
          role="presentation"
          aria-label="tab"
          style={{
            display: "inline-block",
            width: `${tabSize}ch`,
            color: INVISIBLE_COLOR[theme],
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          →
        </span>
      );
    } else if (char === " ") {
      flush();
      result.push(
        <span
          key={key++}
          role="presentation"
          aria-label="space"
          style={{
            color: INVISIBLE_COLOR[theme],
            userSelect: "none",
          }}
        >
          ·
        </span>
      );
    } else if (char in MNEMONICS) {
      flush();
      const mnemonic = MNEMONICS[char]!;
      const hex = char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
      result.push(
        <span
          key={key++}
          title={`U+${hex} ${mnemonic}`}
          aria-label={mnemonic}
          style={{
            ...CHIP_BASE_STYLE,
            background: CHIP_COLORS[theme].background,
            color: CHIP_COLORS[theme].color,
          }}
        >
          {mnemonic}
        </span>
      );
    } else {
      buffer += char;
    }
  }

  flush();
  return result;
}
