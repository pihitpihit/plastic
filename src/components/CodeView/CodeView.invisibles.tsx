/**
 * Internal — not exported from the package.
 *
 * Renders invisible characters as visual markers:
 *   - Tab (U+0009)          → arrow (→) with tab-width inline-block
 *   - Space (U+0020)        → middle dot (·)
 *   - ASCII control chars   → 3-char uppercase mnemonic chip
 *   - Unicode invisible     → 3-char uppercase mnemonic chip
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

/**
 * Invisible / non-printing characters → 3-char uppercase mnemonic.
 *
 * U+0009 (HT) and U+0020 (SP) are handled separately before this map
 * and must NOT be added here.
 */
const MNEMONICS: Readonly<Record<string, string>> = {
  // ── ASCII control characters U+0000–U+001F ──────────────────────────────
  "\u0000": "NUL", // Null
  "\u0001": "SOH", // Start of Heading
  "\u0002": "STX", // Start of Text
  "\u0003": "ETX", // End of Text
  "\u0004": "EOT", // End of Transmission
  "\u0005": "ENQ", // Enquiry
  "\u0006": "ACK", // Acknowledge
  "\u0007": "BEL", // Bell
  "\u0008": "BSP", // Backspace
  // U+0009 HT — handled as → (tab arrow), not here
  "\u000A": "LFD", // Line Feed
  "\u000B": "VTB", // Vertical Tab
  "\u000C": "FFD", // Form Feed
  "\u000D": "CRT", // Carriage Return
  "\u000E": "SFO", // Shift Out
  "\u000F": "SFI", // Shift In
  "\u0010": "DLE", // Data Link Escape
  "\u0011": "DC1", // Device Control 1 (XON)
  "\u0012": "DC2", // Device Control 2
  "\u0013": "DC3", // Device Control 3 (XOFF)
  "\u0014": "DC4", // Device Control 4
  "\u0015": "NAK", // Negative Acknowledge
  "\u0016": "SYN", // Synchronous Idle
  "\u0017": "ETB", // End of Transmission Block
  "\u0018": "CAN", // Cancel
  "\u0019": "EOM", // End of Medium
  "\u001A": "SUB", // Substitute
  "\u001B": "ESC", // Escape
  "\u001C": "FSP", // File Separator
  "\u001D": "GSP", // Group Separator
  "\u001E": "RSP", // Record Separator
  "\u001F": "USP", // Unit Separator
  // ── ASCII delete ────────────────────────────────────────────────────────
  "\u007F": "DEL", // Delete
  // ── Unicode invisible / formatting characters ───────────────────────────
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
