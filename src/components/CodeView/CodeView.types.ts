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
  /**
   * editable=true 에서 Tab 키가 삽입할 문자 단위.
   *   - "space": tabSize 만큼의 공백 삽입 (기본값)
   *   - "tab":   \t 문자 하나 삽입 (CSS tab-size 에 따라 시각 폭 결정)
   */
  indentUnit?: "space" | "tab";
  /** 라이트 / 다크 테마 (기본값: "light") */
  theme?: CodeViewTheme;
  /**
   * 편집 모드 (기본값: "disable").
   *   - "disable": 읽기 전용.
   *   - "enable":  상시 편집 가능.
   *   - "click":   클릭 시 편집 모드 진입. Enter 로 편집 종료 (blur),
   *                Shift+Enter 로 줄바꿈. blur 시에도 자동 종료.
   */
  editable?: "disable" | "enable" | "click";
  /** editable !== "disable" 시 코드 변경 콜백 */
  onValueChange?: (value: string) => void;
  /** 강조할 라인 번호 배열 (1-indexed) */
  highlightLines?: number[];
  /** 긴 줄 자동 줄바꿈 여부 (기본값: false) */
  wordWrap?: boolean;
  /** 라인번호 컬럼 너비 명시 (예: "3rem"). 미설정 시 줄 수에 따라 자동 계산 */
  gutterWidth?: string;
  /** 라인번호와 코드 내용 사이 간격 (기본값: "1rem") */
  gutterGap?: string;
  /** 복사 버튼 표시 여부 (기본값: true) */
  showCopyButton?: boolean;
  className?: string;
}
