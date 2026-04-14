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

// ── 니모닉 칩 카테고리 ────────────────────────────────────────────────────────

type ChipCategory =
  | "null"           // NUL
  | "escape"         // ESC, SUB, CAN
  | "communication"  // 전송 제어 (SOH~ETB, DLE)
  | "device"         // DC1~DC4
  | "format"         // 형식 제어 (BEL, BSP, LFD, CRT, 등)
  | "separator"      // 구분자 (FSP~USP, DEL)
  | "unicode";       // Unicode 불가시 문자

/** 니모닉 문자열 → 카테고리 매핑 */
const MNEMONIC_CATEGORY: Readonly<Record<string, ChipCategory>> = {
  NUL: "null",
  // escape / special
  ESC: "escape", SUB: "escape", CAN: "escape",
  // transmission control
  SOH: "communication", STX: "communication", ETX: "communication",
  EOT: "communication", ENQ: "communication", ACK: "communication",
  DLE: "communication", NAK: "communication", SYN: "communication", ETB: "communication",
  // device control
  DC1: "device", DC2: "device", DC3: "device", DC4: "device",
  // format / whitespace effectors
  BEL: "format", BSP: "format", VTB: "format",
  FFD: "format", CRT: "format", SFO: "format", SFI: "format", EOM: "format",
  // information separators + delete
  FSP: "separator", GSP: "separator", RSP: "separator", USP: "separator", DEL: "separator",
  // Unicode invisible / formatting
  NBS: "unicode", SHY: "unicode", CGJ: "unicode", MVS: "unicode",
  ZWS: "unicode", ZWN: "unicode", ZWJ: "unicode", LRM: "unicode", RLM: "unicode",
  LRE: "unicode", RLE: "unicode", PDF: "unicode", LRO: "unicode", RLO: "unicode",
  WJR: "unicode", FAP: "unicode", ITP: "unicode", ISP: "unicode", IPL: "unicode", BOM: "unicode",
};

/** 카테고리별 칩 색상 */
const CHIP_CATEGORY_COLORS: Record<ChipCategory, Record<CodeViewTheme, { background: string; color: string }>> = {
  null: {
    light: { background: "rgba(100,100,100,0.12)", color: "rgba(70,70,70,0.85)"    },
    dark:  { background: "rgba(150,150,150,0.20)", color: "rgba(190,190,190,0.85)" },
  },
  escape: {
    light: { background: "rgba(220,60,20,0.13)",   color: "rgba(180,40,10,0.90)"   },
    dark:  { background: "rgba(255,110,60,0.20)",  color: "rgba(255,150,100,0.90)" },
  },
  communication: {
    light: { background: "rgba(30,100,220,0.13)",  color: "rgba(20,75,185,0.90)"   },
    dark:  { background: "rgba(70,145,255,0.20)",  color: "rgba(110,175,255,0.90)" },
  },
  device: {
    light: { background: "rgba(130,45,205,0.13)",  color: "rgba(100,25,170,0.90)"  },
    dark:  { background: "rgba(175,105,255,0.20)", color: "rgba(205,145,255,0.90)" },
  },
  format: {
    light: { background: "rgba(0,145,130,0.13)",   color: "rgba(0,105,95,0.90)"    },
    dark:  { background: "rgba(35,185,165,0.20)",  color: "rgba(70,205,185,0.90)"  },
  },
  separator: {
    light: { background: "rgba(175,125,0,0.13)",   color: "rgba(135,95,0,0.90)"    },
    dark:  { background: "rgba(225,175,35,0.20)",  color: "rgba(250,205,75,0.90)"  },
  },
  unicode: {
    light: { background: "rgba(185,35,115,0.13)",  color: "rgba(145,15,85,0.90)"   },
    dark:  { background: "rgba(250,95,155,0.20)",  color: "rgba(255,135,185,0.90)" },
  },
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
  // U+000A LF — 줄바꿈으로 실제 처리되므로 칩 표현 제외
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

// 칩 외곽 컨테이너: 레이아웃상 정확히 1ch를 차지 (textarea와 동일)
const CHIP_OUTER_STYLE = {
  display: "inline-block" as const,
  width: "1ch",
  height: "1em",
  position: "relative" as const,
  verticalAlign: "middle" as const,
  overflow: "visible" as const,
};

// 칩 본체: absolute로 1ch 컨테이너 중앙에 위치, 시각적으로만 오버플로우
const CHIP_BASE_STYLE = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  display: "inline-flex" as const,
  alignItems: "center" as const,
  whiteSpace: "nowrap" as const,
  fontSize: "0.6em",
  fontWeight: 700 as const,
  lineHeight: 1 as const,
  padding: "2px 3px",
  borderRadius: "3px",
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
      const category = MNEMONIC_CATEGORY[mnemonic] ?? "null";
      const chipColors = CHIP_CATEGORY_COLORS[category][theme];
      result.push(
        // 외곽 span: 레이아웃상 정확히 1ch (textarea 문자 너비와 일치)
        <span
          key={key++}
          title={`U+${hex} ${mnemonic}`}
          aria-label={mnemonic}
          style={CHIP_OUTER_STYLE}
        >
          {/* 칩 본체: absolute로 중앙에 위치, 시각적으로만 오버플로우 */}
          <span
            aria-hidden="true"
            style={{
              ...CHIP_BASE_STYLE,
              background: chipColors.background,
              color: chipColors.color,
            }}
          >
            {mnemonic}
          </span>
        </span>
      );
    } else {
      buffer += char;
    }
  }

  flush();
  return result;
}
