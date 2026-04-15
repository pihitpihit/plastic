/**
 * Internal — not exported from the package.
 *
 * Renders invisible characters as visual markers:
 *   - Tab (U+0009)          → arrow (→) with tab-width inline-block
 *   - Space (U+0020)        → middle dot (·)
 *   - ASCII control chars   → 3-char uppercase mnemonic chip
 *   - Unicode invisible     → 3-char uppercase mnemonic chip
 */
import type { ReactNode, CSSProperties } from "react";
import type { CodeViewTheme } from "./CodeView.types";

// tab chip 스타일 주입 (모듈 초기화 1 회).
// 실제 \t 문자를 span 안에 그대로 두어 브라우저의 tab-size CSS 가 자연스럽게
// tab stop 폭을 결정하도록 하고, 화살표는 ::before 로 오버레이한다.
// (width: tabSize*ch 로 고정폭을 강제하면 라인 중간의 tab 에서 textarea 의
// 실제 \t 렌더 폭과 pre 의 chip 폭이 어긋난다.)
const TAB_STYLE_ID = "plastic-cv-tab-style";
if (typeof document !== "undefined" && !document.getElementById(TAB_STYLE_ID)) {
  const s = document.createElement("style");
  s.id = TAB_STYLE_ID;
  s.textContent = `
    .plastic-cv-tab {
      position: relative;
      color: transparent;
    }
    .plastic-cv-tab::before {
      content: "\\2192";
      position: absolute;
      left: 0;
      top: 0;
      color: var(--plastic-cv-inv, rgba(0,0,0,0.22));
      pointer-events: none;
    }
  `;
  document.head.appendChild(s);
}

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

// 니모닉 칩: 자연 폭의 단일 inline-block span.
// 1ch 에 라벨을 우겨넣으려 시도하지 않고 가독성을 우선하여 이웃 문자와의
// 시각적 겹침을 원천 차단한다 (VSCode/Monaco 와 동일한 절충).
// `data-char` + contentEditable=false 로 커서/복사 관점에서는 여전히 1 문자 단위.
const CHIP_STYLE = {
  display: "inline-block" as const,
  verticalAlign: "middle" as const,
  whiteSpace: "nowrap" as const,
  padding: "1px 4px",
  margin: "0 1px",
  borderRadius: "4px",
  fontSize: "0.78em",
  fontWeight: 700 as const,
  lineHeight: 1 as const,
  letterSpacing: "0.03em",
  // 읽기/편집 모두: 드래그 시 칩이 하나의 단위로 선택되도록 강제한다.
  // (읽기 모드에서는 contentEditable=false 가 없어 내부 "ZWS" 같은 3글자가
  //  문자 단위로 선택되던 문제를 해소.)
  userSelect: "all" as const,
};

/**
 * Splits a token's string content into an array of ReactNodes,
 * replacing each invisible character with its visual representation.
 *
 * @param atomic  true = contenteditable 편집 모드용.
 *                모든 칩 span에 `contentEditable="false"` + `data-char` 속성을 추가하여
 *                브라우저가 칩 전체를 하나의 커서 단위로 처리하게 하고,
 *                커스텀 DOM 워커가 실제 문자를 추출할 수 있게 한다.
 */
/**
 * ASCII 제어 문자 → 1 char Unicode Control Picture (U+2400–U+2421).
 * 고정폭 폰트에서 정확히 1ch 를 점유하므로 compact 모드에서 textarea caret
 * 오프셋과 pre chip 위치가 1:1 로 정렬된다.
 */
const PICTO: Readonly<Record<string, string>> = {
  "\u0000": "\u2400", "\u0001": "\u2401", "\u0002": "\u2402", "\u0003": "\u2403",
  "\u0004": "\u2404", "\u0005": "\u2405", "\u0006": "\u2406", "\u0007": "\u2407",
  "\u0008": "\u2408",                     "\u000B": "\u240B", "\u000C": "\u240C",
  "\u000D": "\u240D", "\u000E": "\u240E", "\u000F": "\u240F",
  "\u0010": "\u2410", "\u0011": "\u2411", "\u0012": "\u2412", "\u0013": "\u2413",
  "\u0014": "\u2414", "\u0015": "\u2415", "\u0016": "\u2416", "\u0017": "\u2417",
  "\u0018": "\u2418", "\u0019": "\u2419", "\u001A": "\u241A", "\u001B": "\u241B",
  "\u001C": "\u241C", "\u001D": "\u241D", "\u001E": "\u241E", "\u001F": "\u241F",
  "\u007F": "\u2421",
  // Unicode invisible: 전용 pictogram 이 없으므로 작은 점으로 통일(1ch)
  "\u00A0": "\u2423", // NBS → open box ␣
  "\u00AD": "\u00B7", "\u034F": "\u00B7", "\u180E": "\u00B7",
  "\u200B": "\u00B7", "\u200C": "\u00B7", "\u200D": "\u00B7",
  "\u200E": "\u00B7", "\u200F": "\u00B7",
  "\u202A": "\u00B7", "\u202B": "\u00B7", "\u202C": "\u00B7",
  "\u202D": "\u00B7", "\u202E": "\u00B7",
  "\u2060": "\u00B7", "\u2061": "\u00B7", "\u2062": "\u00B7",
  "\u2063": "\u00B7", "\u2064": "\u00B7",
  "\uFEFF": "\u00B7",
};

/**
 * @param compact  true = 편집 모드용. mnemonic 칩 대신 1ch Unicode Control
 *                 Picture 로 렌더하여 textarea caret 과 시각 정렬을 보장.
 *                 false = 읽기 모드용 3자 니모닉 칩 (가독성 우선).
 */
export function renderWithInvisibles(
  content: string,
  theme: CodeViewTheme,
  tabSize: number,
  compact = false,
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
      // 실제 \t 문자를 content 로 유지. 브라우저의 tab-size CSS 가 현재 열
      // 위치에서 다음 tab stop 까지 자연 폭을 계산하므로 textarea 와 일치.
      // 화살표는 ::before 오버레이.
      result.push(
        <span
          key={key++}
          className="plastic-cv-tab"
          role="presentation"
          aria-label="tab"
          data-char={"\t"}
          style={{ ["--plastic-cv-inv" as unknown as keyof CSSProperties]: INVISIBLE_COLOR[theme] } as CSSProperties}
        >
          {"\t"}
        </span>
      );
    } else if (char === " ") {
      flush();
      result.push(
        <span
          key={key++}
          role="presentation"
          aria-label="space"
          data-char={" "}
          style={{
            color: INVISIBLE_COLOR[theme],
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

      if (compact) {
        // 1ch 고정폭 pictogram. 정확히 1 char 을 점유하므로 textarea 와 정렬.
        const pic = PICTO[char] ?? "\u00B7";
        result.push(
          <span
            key={key++}
            title={`U+${hex} ${mnemonic}`}
            aria-label={mnemonic}
            data-char={char}
            style={{
              display: "inline-block",
              width: "1ch",
              textAlign: "center",
              color: chipColors.color,
              background: chipColors.background,
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            {pic}
          </span>
        );
      } else {
        result.push(
          <span
            key={key++}
            title={`U+${hex} ${mnemonic}`}
            aria-label={mnemonic}
            data-char={char}
            style={{
              ...CHIP_STYLE,
              background: chipColors.background,
              color: chipColors.color,
            }}
          >
            {mnemonic}
          </span>
        );
      }
    } else {
      buffer += char;
    }
  }

  flush();
  return result;
}
