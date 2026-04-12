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
  /** 라이트 / 다크 테마 (기본값: "light") */
  theme?: CodeViewTheme;
  className?: string;
}
