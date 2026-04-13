import type { Language } from "prism-react-renderer";

export type { Language as CodeViewLanguage };

export type CodeViewTheme = "light" | "dark";

export interface CodeViewProps {
  /** 표시할 코드 문자열 */
  code: string;
  /** 문법 강조 언어 (기본값: "typescript") */
  language?: Language;
  /** 라인 번호 표시 여부 (기본값: true) */
  showLineNumbers?: boolean;
  /** 홀짝 라인 배경색 구분 여부 (기본값: true) */
  showAlternatingRows?: boolean;
  /** 탭·공백·불가시 유니코드 문자 시각화 여부 (기본값: false) */
  showInvisibles?: boolean;
  /** 탭 너비 — tab-size CSS 및 showInvisibles 탭 렌더링에 적용 (기본값: 2) */
  tabSize?: number;
  /** 라이트 / 다크 테마 (기본값: "light") */
  theme?: CodeViewTheme;
  /** 편집 가능 여부. true 시 textarea 오버레이로 인라인 편집 활성화 (기본값: false) */
  editable?: boolean;
  /** editable=true 시 코드 변경 콜백 */
  onValueChange?: (value: string) => void;
  /** 강조할 라인 번호 배열 (1-indexed) */
  highlightLines?: number[];
  /** 긴 줄 자동 줄바꿈 여부 (기본값: false) */
  wordWrap?: boolean;
  className?: string;
}
