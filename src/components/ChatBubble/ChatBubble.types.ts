import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type ChatBubbleAlign = "start" | "end";
export type ChatBubbleTheme = "light" | "dark";

/**
 * 꼬리 세부 설정. boolean 으로 단순 토글도 가능.
 */
export interface ChatBubbleTailConfig {
  /** 꼬리가 어느 쪽에서 나올지. 기본값: align 따라감. */
  side?: ChatBubbleAlign;
  /** 꼬리 위치(세로축). 기본 "start". */
  align?: "start" | "center" | "end";
  /** 꼬리 크기 (px). 기본 8. */
  size?: number;
}

export type ChatBubbleTimeMode = "absolute" | "relative" | "both";

/**
 * 시간 표시 위치.
 *   - outside-* : 말풍선 바깥(위/아래), align 기준 좌우
 *   - inside-*  : 말풍선 내부(상/하), align 기준 좌우
 *   - inline-after : Content 바로 뒤에 인라인 표기
 *   - side-right-* : 말풍선과 같은 행, 우측 외부 (상/하 정렬)
 *   - side-left-*  : 말풍선과 같은 행, 좌측 외부 (상/하 정렬)
 */
export type ChatBubbleTimePosition =
  | "outside-bottom-start"
  | "outside-bottom-end"
  | "outside-top-start"
  | "outside-top-end"
  | "inside-bottom-start"
  | "inside-bottom-end"
  | "inline-after"
  | "side-right-top"
  | "side-right-bottom"
  | "side-left-top"
  | "side-left-bottom";

export type ChatBubbleAvatarPosition = "outside" | "inside-leading";

export type ChatBubbleActionsPosition = "outside-bottom" | "inline-end";

// ── Root ──────────────────────────────────────────────────────────────────

export interface ChatBubbleRootProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  children: ReactNode;
  /** 좌(start) / 우(end) 정렬. 기본 "start". */
  align?: ChatBubbleAlign;
  /** 배경색 (CSS color). 기본 theme 에 따라 결정. */
  color?: string;
  /** 텍스트 색상. 기본 theme + color 에 따라 결정. */
  textColor?: string;
  /**
   * 말풍선 꼬리 표시.
   *   - false / undefined: 꼬리 없음
   *   - true: 기본 꼬리 (align 따라 좌/우)
   *   - 객체: 세부 설정
   */
  tail?: boolean | ChatBubbleTailConfig;
  /** 말풍선 최대 너비. 기본 "70%". */
  maxWidth?: number | string;
  /** 모서리 둥글기 (px). 기본 12. */
  radius?: number;
  /** 말풍선 내부 패딩 (CSS shorthand). 기본 "0.5rem 0.75rem". */
  padding?: string;
  /** 라이트/다크 테마. 기본 "light". */
  theme?: ChatBubbleTheme;
  /** streaming 점멸 인디케이터 표시. 기본 false. */
  loading?: boolean;
}

// ── Content ───────────────────────────────────────────────────────────────

export interface ChatBubbleContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

// ── Avatar ────────────────────────────────────────────────────────────────

export interface ChatBubbleAvatarProps {
  src?: string;
  alt?: string;
  /** src 가 없거나 로드 실패 시 표시할 fallback (이니셜 등). */
  fallback?: ReactNode;
  /** px. 기본 32. */
  size?: number;
  /** 말풍선 외부(옆) / 내부(좌측 inline). 기본 "outside". */
  position?: ChatBubbleAvatarPosition;
  className?: string;
  style?: CSSProperties;
}

// ── Time ──────────────────────────────────────────────────────────────────

export interface ChatBubbleTimeProps {
  /** 시간 값. epoch ms / Date / ISO string. */
  t: number | Date | string;
  /** 표시 위치. 기본 "outside-bottom-end". */
  position?: ChatBubbleTimePosition;
  /** 표기 모드. 기본 "absolute". */
  mode?: ChatBubbleTimeMode;
  /** 절대 시간 포매터. 기본 toLocaleTimeString. */
  absoluteFormatter?: (d: Date) => string;
  /** 상대 시간 포매터. 기본 ko 내장 ("5분 전" 등). */
  relativeFormatter?: (deltaMs: number) => string;
  /** "both" 모드 구분자. 기본 " · ". */
  separator?: string;
  /** relative/both 자동 갱신 주기 (ms). 0 이면 비활성. 기본 60_000. */
  refreshInterval?: number;
  /**
   * side-* 위치에서 컨테이너 폭이 이 값(px) 미만이면 fallbackPosition으로 자동 전환.
   * 기본 280.
   */
  fallbackWidth?: number;
  /** 폭이 좁아질 때 대체할 위치. 기본 "outside-bottom-end". */
  fallbackPosition?: ChatBubbleTimePosition;
  className?: string;
  style?: CSSProperties;
}

// ── Footer / Actions ──────────────────────────────────────────────────────

export interface ChatBubbleFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface ChatBubbleActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** hover 시에만 표시. 기본 false. */
  showOnHover?: boolean;
  /** 표시 위치. 기본 "outside-bottom". */
  position?: ChatBubbleActionsPosition;
}
