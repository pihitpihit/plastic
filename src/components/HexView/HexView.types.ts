export type HexViewTheme = "light" | "dark";

export type HexViewEndian = "big" | "little";

export type HexViewBytesPerRow = 4 | 8 | 16 | 32 | 64;

export type HexViewGroupSize = 1 | 2 | 4 | 8;

export type HexViewCopyFormat = "hex" | "ascii" | "c-array";

export interface HexViewHighlightRange {
  /** 바이트 시작 오프셋 (inclusive, 0-indexed) */
  start: number;
  /** 바이트 끝 오프셋 (exclusive) */
  end: number;
  /** 배경색 CSS (없으면 theme 기본값 사용) */
  color?: string;
  /** hover 시 툴팁 레이블 */
  label?: string;
}

export interface HexViewSelection {
  /** 바이트 시작 오프셋 (inclusive) */
  start: number;
  /** 바이트 끝 오프셋 (exclusive, start === end 는 "없음") */
  end: number;
}

export type HexViewNonPrintable =
  | "dot"
  | "underscore"
  | "blank"
  | ((byte: number) => string);

export interface HexViewProps {
  /**
   * 표시할 바이너리 데이터. 필수.
   * Uint8Array | ArrayBuffer | number[] 를 모두 받아 내부에서 Uint8Array 로 정규화.
   */
  data: Uint8Array | ArrayBuffer | number[];

  /** 한 줄에 표시할 바이트 수. 기본 16. */
  bytesPerRow?: HexViewBytesPerRow;

  /**
   * 그룹(워드) 크기. 같은 그룹에 속한 바이트 사이엔 공백이 없고,
   * 그룹 사이엔 공백이 들어간다. 기본 1.
   * bytesPerRow 의 약수여야 함. 위배 시 dev 에서 console.warn + fallback.
   */
  groupSize?: HexViewGroupSize;

  /**
   * groupSize > 1 일 때 그룹 내 바이트 렌더 순서.
   *   - "big":    메모리 순서 (byte0 byte1 byte2 byte3)
   *   - "little": 역순 (byte3 byte2 byte1 byte0)
   * 기본 "big". groupSize === 1 이면 무의미.
   */
  endian?: HexViewEndian;

  /** ASCII 컬럼 표시 여부. 기본 true. */
  showAscii?: boolean;

  /** 좌측 offset 컬럼 표시 여부. 기본 true. */
  showOffsetColumn?: boolean;

  /** 상단 offset 헤더 (00 01 02 ... 0F) 표시 여부. 기본 true. */
  showOffsetHeader?: boolean;

  /** 주소 표시 기준 오프셋. 기본 0. */
  baseOffset?: number;

  /**
   * offset 컬럼에 표시할 hex 자리수. 미지정 시 data 크기에 따라 자동 선택
   * (4 / 6 / 8 / 12 / 16).
   */
  offsetDigits?: number;

  /** 라이트/다크 테마. 기본 "light". */
  theme?: HexViewTheme;

  /** 홀짝 행 배경 구분. 기본 true. */
  showAlternatingRows?: boolean;

  /** 임의 범위 하이라이트. 겹칠 경우 뒤 원소가 우선. */
  highlightRanges?: HexViewHighlightRange[];

  /** 컨테이너 최대 높이 (예: "400px"). 기본 "60vh". 내부 스크롤 영역. */
  maxHeight?: string;

  /** 우상단 복사 버튼 표시. 기본 true. */
  showCopyButton?: boolean;

  /** 복사 버튼 기본 포맷. 기본 "hex". */
  defaultCopyFormat?: HexViewCopyFormat;

  /** Controlled selection. 미지정 시 내부 상태. */
  selection?: HexViewSelection | null;
  /** Controlled selection 콜백. */
  onSelectionChange?: (sel: HexViewSelection | null) => void;

  /** hex ↔ ASCII hover 동기화 강조. 기본 true. */
  linkHover?: boolean;

  /**
   * 비인쇄 ASCII (0x00-0x1F, 0x7F-0xFF) 를 ASCII 컬럼에서 어떻게 표시할지.
   *   - "dot"       : "." 한 문자 (기본)
   *   - "underscore": "_" 한 문자
   *   - "blank"     : 공백
   *   - (byte) => string : 사용자 함수
   */
  nonPrintable?: HexViewNonPrintable;

  /** 추가 className. */
  className?: string;
}
