# LineNumbers 컴포넌트 설계문서 (CodeView 추출)

## Context

`CodeView`(이미 구현됨) 내부에서 자체적으로 그리고 있는 **라인번호 컬럼(gutter)**을 단독 컴포넌트 `LineNumbers`로 추출한다. 추출 후 CodeView는 내부에서 이 컴포넌트를 사용하도록 리팩토링되며, 동시에 `LineNumbers`는 public API로 export되어 향후 추가될 라인 단위 표시 컴포넌트(LogView, Terminal, DiffView 등)가 같은 라인번호 어휘를 공유할 수 있게 한다.

본 작업은 **새 컴포넌트 추가 + 기존 컴포넌트 내부 리팩토링**의 두 측면을 가진다. 행동(behavior)·시각(visual)·접근성(a11y) 모두 추출 전과 100% 동일해야 하며, CodeView의 textarea overlay 좌표 정렬, copy 로직(`data-gutter` 속성 의존), sticky 위치, 테마 인식 등 미세 디테일이 깨지지 않아야 한다.

본 작업은 `Calendar`를 `DatePicker`에서 분리하는 것과 동일한 패턴(plan 025 참조). 기존 컴포넌트의 내부 일부를 export 가능한 단독 컴포넌트로 승격하면서, 원래 컴포넌트가 그것의 첫 번째 컨슈머가 되는 구조다.

참고 (prior art — line number gutter):
- **VS Code 에디터** — sticky-left 라인번호, 활성 라인 강조, breakpoint marker, fold marker 통합. 매우 풍부.
- **Monaco editor** — `lineNumbers: "on" | "off" | "relative" | "interval" | function`. relative는 현재 라인 기준 상대 번호.
- **CodeMirror 6** — `lineNumbers()` extension, `gutter()` 일반 시스템(라인번호도 한 종류). marker (브레이크포인트 등) 추가 가능.
- **react-syntax-highlighter** — `showLineNumbers={true}` + `lineNumberStyle={...}`.
- **Prism.js** — `<pre><code class="line-numbers">...` 자동 생성 plugin.
- **GitHub diff/blame** — 라인번호 옆 blame 정보, 라인 클릭 시 URL 해시 변경.
- **Source map navigation** — 라인번호 클릭 → "이 라인으로 이동" 또는 영구 링크.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/CodeView/CodeView.tsx` (653줄) — 추출 대상.
  - `lineNumberColor` 상수 (line 18-41) — 라인번호 텍스트/배경 색상 테마 매핑.
  - `getGutterWidth(lineCount)` (line 43-48) — 자릿수 기반 너비 계산.
  - `walkEffectiveNodes` (line 65-90) — copy 로직, `data-gutter="true"` 속성을 skip 마커로 사용.
  - 렌더 부 (line 467-519) — `gutterStyle` 정의, 행별 `<span data-gutter>` 라인번호 렌더링.
  - 라인번호 컬럼 너비를 textarea overlay의 `paddingLeft`에 반영 (line 521-524, 624).
- `src/components/CodeView/CodeView.types.ts` — `gutterWidth?: string`, `gutterGap?: string`, `showLineNumbers?: boolean` props.
- `src/components/CodeView/index.ts` — public API.
- `src/components/index.ts` — 새 `LineNumbers` 추가 위치.
- `src/components/Icon/` (plan 023) — 향후 LineNumbers의 marker 슬롯에서 사용 가능 (v1 범위 외).

---

## 0. TL;DR (한 페이지 요약)

```tsx
// 1. 단독 사용 — 가장 단순한 형태
<LineNumbers count={20} />
// → 1, 2, 3, ..., 20 의 sticky-left 컬럼 렌더

// 2. 시작 번호 지정 (페이지네이션, diff hunk 등)
<LineNumbers count={50} start={101} />
// → 101 부터 150

// 3. 강조 라인 (활성 라인, 검색 매치 등)
<LineNumbers count={20} highlightLines={[5, 7, 12]} />

// 4. 라인 클릭 핸들러 (영구 링크 등)
<LineNumbers count={20} onLineClick={(n) => location.hash = `#L${n}`} />

// 5. 컨텐츠와 짝으로 사용 — 부모가 grid/flex 로 정렬
<div style={{ display: "flex" }}>
  <LineNumbers count={lines.length} />
  <pre>{lines.join("\n")}</pre>
</div>

// 6. CodeView 내부 사용 (per-line) — single-cell 모드
<LineNumbers.Cell lineNumber={li + 1} highlighted={highlightLines?.includes(li + 1)} />

// 7. relative 라인번호 (현재 라인 기준)
<LineNumbers count={20} relative activeLine={10} />
// → ..., 3, 2, 1, 0(=10), 1, 2, 3, ... 형태
```

핵심 설계 원칙:
- **두 모드 지원**: column 모드(`<LineNumbers count={N} />`)와 cell 모드(`<LineNumbers.Cell lineNumber={N} />`).
  - column 모드: 단순 사용처 (LogView, 정적 코드 표시 등).
  - cell 모드: CodeView처럼 행별로 직접 임베드해야 하는 복잡 레이아웃.
- **CodeView 시각·동작 100% 보존**: 추출 후 CodeView 데모 페이지의 모든 항목이 시각적으로 동일해야 함. textarea overlay 정렬, copy 로직, sticky 위치, 테마, gutter width 자동 계산 모두 유지.
- **`data-gutter="true"` 속성 유지**: CodeView의 copy 로직(`walkEffectiveNodes`)이 의존하므로 cell 모드에서도 이 속성을 출력해야 함.
- **headless / 오버라이드 가능**: width, gap, color, padding 모두 prop 또는 className/style로 override 가능.
- **theme 인식**: `theme="light" | "dark"`로 색상 자동 매핑 (기존 CodeView의 `lineNumberColor` 그대로 추출).
- **width 자동 계산**: `width="auto"` (기본) 시 totalLines 자릿수 기반(`getGutterWidth` 그대로 추출).
- **a11y**: `aria-hidden="true"` 기본 (라인번호는 콘텐츠가 아닌 메타데이터). `clickable` 시 `role="button"` 추가.

---

## 1. Goals / Non-goals

### Goals (v1)
1. `LineNumbers.Column` (또는 그냥 `LineNumbers`) — N개 라인번호를 세로 컬럼으로 렌더.
2. `LineNumbers.Cell` — 단일 라인번호 셀. CodeView 같은 per-row 렌더링용.
3. `count`, `start` (기본 1), `step` (기본 1) — 번호 시퀀스 제어.
4. `width: "auto" | string | number` — 기본 "auto" (자릿수 자동 계산), 또는 명시적 CSS 길이/px.
5. `gap: string | number` — 라인번호와 컨텐츠 사이 간격. 기본 `"1rem"`.
6. `theme: "light" | "dark"` — 색상.
7. `highlightLines: number[]` — 강조할 라인 번호 배열 (1-indexed).
8. `relative: boolean` + `activeLine: number` — relative 모드 (vim 스타일).
9. `onLineClick?: (lineNumber: number) => void` — 클릭 핸들러. 있으면 셀이 `cursor: pointer` + `role="button"` + 키보드 활성.
10. `lineHeight: string | number` — 행 높이 (CodeView가 폰트 line-height inherit하므로 기본은 `"inherit"`).
11. `align: "left" | "center" | "right"` — 라인번호 정렬. 기본 `"right"` (전통적).
12. `sticky: boolean` — sticky-left 위치 (기본 true, CodeView 호환).
13. `bg?: string` — 명시적 배경색 (sticky일 때 행 배경 가림용). 기본 theme 자동.
14. `data-gutter="true"` 속성 출력 — CodeView copy 로직 호환.
15. **CodeView 내부 리팩토링**: 기존 inline 라인번호 렌더링을 `<LineNumbers.Cell />`로 교체. 시각·동작 100% 동일.
16. 배럴 — `export { LineNumbers } from "./LineNumbers"` + `export type { LineNumbersProps, LineNumbersCellProps } from ...`.

### Non-goals (v1 제외)
- **Gutter marker 시스템** — breakpoint/fold/changes 등 라인 옆 아이콘 마커. v1.1+. CodeMirror 6의 `gutter()` extension 같은 일반 시스템.
- **라인 폴딩** (CodeFold 컴포넌트는 별도 후보, 본 plan 외).
- **blame annotation** — 라인 옆 작성자/날짜 표시. 별도 컴포넌트 후보.
- **라인 hover 시 anchor 링크 표시** (GitHub 스타일). v1.1.
- **다중 컬럼 라인번호** (예: 좌측 old 번호 + 우측 new 번호 — DiffView용). DiffView 신설 시 같이 설계.
- **virtualization** (가상 스크롤). 큰 파일은 부모 가상화 사용.
- **자체 keyframes / 애니메이션**.
- **테스트 자동화** — 라이브러리 전체에 없음.

---

## 2. 공개 API

### 2.1 타입 — `src/components/LineNumbers/LineNumbers.types.ts`

```ts
import type { CSSProperties, HTMLAttributes } from "react";

export type LineNumbersTheme = "light" | "dark";

export type LineNumbersAlign = "left" | "center" | "right";

/**
 * Column 모드 props — N개 라인번호를 세로 컬럼으로 렌더.
 */
export interface LineNumbersProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** 렌더할 라인 개수. 필수. */
  count: number;

  /** 시작 번호. 기본 1. */
  start?: number;

  /** 증감 단위. 기본 1. (음수도 허용 — 역순 표시 가능) */
  step?: number;

  /**
   * 컬럼 너비.
   * - "auto" (기본): count + start로 결정되는 최대 자릿수 기반 자동 계산.
   * - string: CSS 길이 그대로 (e.g., "3rem", "48px").
   * - number: px.
   */
  width?: "auto" | string | number;

  /**
   * 라인번호와 컨텐츠 사이 간격.
   * 컬럼 자체의 paddingRight로 적용.
   * 기본 "1rem".
   */
  gap?: string | number;

  /** 테마. 기본 "light". */
  theme?: LineNumbersTheme;

  /** 강조할 라인 번호 배열 (1-indexed, 사용자가 보는 번호). */
  highlightLines?: number[];

  /** relative 모드. 기본 false. true면 activeLine 기준 상대 번호 표시. */
  relative?: boolean;

  /** relative 모드에서 "0"으로 표시될 라인. 기본 1. */
  activeLine?: number;

  /** 행 높이. 기본 "inherit" (부모 line-height 따라감). */
  lineHeight?: string | number;

  /** 라인번호 정렬. 기본 "right". */
  align?: LineNumbersAlign;

  /** sticky-left 위치 활성. 기본 true (가로 스크롤 시 라인번호 고정). */
  sticky?: boolean;

  /** 명시적 배경색. 미지정 시 theme 기반 자동. sticky=true일 때 행 배경 가림 용도. */
  bg?: string;

  /** 라인 클릭 핸들러. 있으면 각 셀이 클릭 가능 (role=button + cursor=pointer). */
  onLineClick?: (lineNumber: number) => void;

  className?: string;
  style?: CSSProperties;
}

/**
 * Cell 모드 props — 단일 라인번호 셀.
 * CodeView처럼 per-row 렌더링하는 컴포넌트가 사용.
 */
export interface LineNumbersCellProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 표시할 라인 번호. */
  lineNumber: number;

  /**
   * 보이는 라벨 override.
   * 기본은 lineNumber 그대로. relative 모드 등에서 "3"처럼 가공된 값 표시 시 사용.
   */
  label?: string | number;

  /** 강조 여부. 기본 false. */
  highlighted?: boolean;

  /**
   * 컬럼 너비. 부모 컴포넌트가 통일 너비 결정해 모든 셀에 동일 값 전달.
   * column 모드와 다르게 "auto" 미지원 (per-cell로는 자릿수 결정 불가).
   * 기본 "1.5rem".
   */
  width?: string | number;

  /** 컨텐츠와의 간격. paddingRight로 적용. 기본 "1rem". */
  gap?: string | number;

  /** 테마. 기본 "light". */
  theme?: LineNumbersTheme;

  /** 행 높이. 기본 "inherit". */
  lineHeight?: string | number;

  /** 정렬. 기본 "right". */
  align?: LineNumbersAlign;

  /** sticky-left. 기본 true. */
  sticky?: boolean;

  /** 명시적 배경색. */
  bg?: string;

  /** 클릭 핸들러. */
  onLineClick?: (lineNumber: number) => void;

  className?: string;
  style?: CSSProperties;
}
```

### 2.2 메인 컴포넌트 — `src/components/LineNumbers/LineNumbers.tsx`

```tsx
import type { CSSProperties, KeyboardEvent } from "react";
import { LineNumbersCell } from "./LineNumbersCell";
import { resolveGutterWidth, themeColors } from "./utils";
import type { LineNumbersProps } from "./LineNumbers.types";

export function LineNumbers(props: LineNumbersProps) {
  const {
    count,
    start = 1,
    step = 1,
    width = "auto",
    gap = "1rem",
    theme = "light",
    highlightLines,
    relative = false,
    activeLine = 1,
    lineHeight = "inherit",
    align = "right",
    sticky = true,
    bg,
    onLineClick,
    className,
    style,
    ...rest
  } = props;

  // 가장 큰 표시 가능 라인번호로 너비 결정
  const maxLine = start + (count - 1) * step;
  const resolvedWidth =
    width === "auto" ? resolveGutterWidth(Math.abs(maxLine)) : typeof width === "number" ? `${width}px` : width;
  const resolvedGap = typeof gap === "number" ? `${gap}px` : gap;

  const colors = themeColors[theme];
  const resolvedBg = bg ?? colors.bg;

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    boxSizing: "content-box",
    minWidth: resolvedWidth,
    paddingRight: resolvedGap,
    color: colors.text,
    background: resolvedBg,
    userSelect: "none",
    pointerEvents: onLineClick ? "auto" : "none",
    ...(sticky ? { position: "sticky", left: 0, zIndex: 1 } : {}),
    ...style,
  };

  const cells: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const realLineNumber = start + i * step;
    const displayedLabel = relative
      ? Math.abs(realLineNumber - activeLine).toString()
      : realLineNumber.toString();

    cells.push(
      <LineNumbersCell
        key={i}
        lineNumber={realLineNumber}
        label={displayedLabel}
        highlighted={highlightLines?.includes(realLineNumber) ?? false}
        width={resolvedWidth}
        gap="0" // 컬럼 자체에 paddingRight 있으므로 셀은 0
        theme={theme}
        lineHeight={lineHeight}
        align={align}
        sticky={false} // 컬럼이 sticky이므로 셀은 false
        bg={resolvedBg}
        {...(onLineClick ? { onLineClick } : {})}
      />,
    );
  }

  return (
    <div
      data-gutter="true"
      aria-hidden={onLineClick ? undefined : true}
      className={className}
      style={containerStyle}
      {...rest}
    >
      {cells}
    </div>
  );
}

LineNumbers.displayName = "LineNumbers";

// Static reference for compound API
LineNumbers.Cell = LineNumbersCell;
```

### 2.3 셀 컴포넌트 — `src/components/LineNumbers/LineNumbersCell.tsx`

```tsx
import type { CSSProperties, KeyboardEvent } from "react";
import { themeColors } from "./utils";
import type { LineNumbersCellProps } from "./LineNumbers.types";

export function LineNumbersCell(props: LineNumbersCellProps) {
  const {
    lineNumber,
    label,
    highlighted = false,
    width = "1.5rem",
    gap = "1rem",
    theme = "light",
    lineHeight = "inherit",
    align = "right",
    sticky = true,
    bg,
    onLineClick,
    className,
    style,
    ...rest
  } = props;

  const colors = themeColors[theme];
  const resolvedWidth = typeof width === "number" ? `${width}px` : width;
  const resolvedGap = typeof gap === "number" ? `${gap}px` : gap;
  const resolvedLineHeight = typeof lineHeight === "number" ? `${lineHeight}px` : lineHeight;
  const resolvedBg = bg ?? colors.bg;

  const isClickable = onLineClick !== undefined;

  const cellStyle: CSSProperties = {
    flexShrink: 0,
    minWidth: resolvedWidth,
    paddingRight: resolvedGap,
    boxSizing: "content-box",
    textAlign: align,
    color: highlighted ? colors.textHighlight : colors.text,
    fontSize: "0.85em",
    lineHeight: resolvedLineHeight,
    userSelect: "none",
    background: resolvedBg,
    cursor: isClickable ? "pointer" : "default",
    pointerEvents: isClickable ? "auto" : "none",
    ...(sticky ? { position: "sticky", left: 0, zIndex: 1 } : {}),
    ...style,
  };

  const handleClick = isClickable ? () => onLineClick(lineNumber) : undefined;

  const handleKeyDown = isClickable
    ? (e: KeyboardEvent<HTMLSpanElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onLineClick(lineNumber);
        }
      }
    : undefined;

  const a11yProps = isClickable
    ? {
        role: "button" as const,
        tabIndex: 0,
        "aria-label": `Line ${lineNumber}`,
      }
    : {
        "aria-hidden": true as const,
      };

  return (
    <span
      data-gutter="true"
      data-line-number={lineNumber}
      data-highlighted={highlighted ? "" : undefined}
      className={className}
      style={cellStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...a11yProps}
      {...rest}
    >
      {label ?? lineNumber}
    </span>
  );
}

LineNumbersCell.displayName = "LineNumbers.Cell";
```

### 2.4 유틸 — `src/components/LineNumbers/utils.ts`

```ts
import type { LineNumbersTheme } from "./LineNumbers.types";

/**
 * 라인 수 기반 gutter 너비 자동 계산.
 * CodeView의 기존 getGutterWidth를 그대로 추출.
 */
export function resolveGutterWidth(maxLine: number): string {
  if (maxLine < 10) return "1.5rem";
  if (maxLine < 100) return "2rem";
  if (maxLine < 1000) return "2.75rem";
  if (maxLine < 10000) return "3.5rem";
  return "4.5rem"; // 5+ 자리
}

/**
 * 테마별 색상.
 * CodeView의 lineNumberColor를 확장:
 * - bg / text: 기존 lineNumberColor 매핑
 * - textHighlight: 강조 라인용 (highlight color, CodeView의 highlightRowColor와 짝)
 */
export const themeColors: Record<
  LineNumbersTheme,
  { bg: string; text: string; textHighlight: string }
> = {
  light: {
    bg: "rgba(0,0,0,0.04)",
    text: "rgba(0,0,0,0.45)",
    textHighlight: "rgba(217,119,6,1)", // amber-600 — CodeView highlight 색상과 매칭
  },
  dark: {
    bg: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.45)",
    textHighlight: "rgba(251,191,36,1)", // amber-400
  },
};
```

### 2.5 배럴 — `src/components/LineNumbers/index.ts`

```ts
export { LineNumbers } from "./LineNumbers";
export type {
  LineNumbersProps,
  LineNumbersCellProps,
  LineNumbersTheme,
  LineNumbersAlign,
} from "./LineNumbers.types";
```

### 2.6 컴포넌트 배럴 추가 — `src/components/index.ts`

```ts
// 기존 export 위에 추가
export * from "./LineNumbers";
```

---

## 3. 파일 구조

```
src/components/LineNumbers/
├── LineNumbers.tsx          ← Column 모드 컴포넌트
├── LineNumbersCell.tsx       ← Cell 모드 컴포넌트
├── LineNumbers.types.ts      ← 타입
├── utils.ts                  ← resolveGutterWidth + themeColors
└── index.ts                  ← 배럴
```

**왜 Cell이 별도 파일인가**: CodeView가 Cell만 import하는 케이스 명확화. 또한 두 컴포넌트가 같은 파일이면 LineNumbers.Cell static assignment 시점에 순환 의존이 미묘해짐.

---

## 4. 동작 명세

### 4.1 Column 모드

**입력:**
- `count = 5`, `start = 10`, `step = 2`

**출력 (라벨):**
```
10
12
14
16
18
```

**자동 너비:**
- `maxLine = 10 + 4*2 = 18` → 2 자리 → `2rem`

### 4.2 Relative 모드

**입력:**
- `count = 7`, `start = 1`, `relative = true`, `activeLine = 4`

**출력 (라벨):**
```
3
2
1
0  ← activeLine
1
2
3
```

**시퀀스:**
- realLineNumber 1, 2, 3, 4, 5, 6, 7
- displayLabel = `|realLineNumber - activeLine|` = 3, 2, 1, 0, 1, 2, 3

### 4.3 강조

```tsx
<LineNumbers count={10} highlightLines={[3, 5, 7]} />
```
- 3, 5, 7번 라인 셀에 `data-highlighted=""` 속성 + `color: textHighlight` (amber).
- 다른 셀과 동일한 너비·정렬·배경 유지.

### 4.4 클릭 핸들러

```tsx
<LineNumbers count={10} onLineClick={(n) => alert(n)} />
```
- 각 셀이 `role="button"`, `tabIndex=0`, `cursor: pointer`.
- 클릭 시 `onLineClick(lineNumber)`.
- Enter/Space 키 시 동일 동작 (a11y).
- onLineClick 미지정 시 `aria-hidden="true"` (장식).

### 4.5 sticky 동작

- `sticky=true` (기본): `position: sticky; left: 0; z-index: 1`. 부모가 가로 스크롤될 때 라인번호가 좌측 고정.
- `sticky=false`: 일반 inline. CodeView 같이 부모가 자체 sticky 처리하는 경우 사용.

### 4.6 컬럼 vs 셀 모드 sticky 충돌 방지

Column 모드 내부에서 Cell들이 렌더될 때:
- 컬럼 자체에 `position: sticky` 적용.
- 자식 셀들의 sticky는 **강제로 false** (props에서 명시 무시) — 중첩 sticky는 컨텍스트에서 작동 안 하므로.

코드:
```tsx
<LineNumbersCell ... sticky={false} bg={resolvedBg} />
```

### 4.7 너비 계산 vs 명시

| width prop | 결과 |
|---|---|
| `"auto"` (기본) | `maxLine` 자릿수 기반: 1자리=1.5rem, 2자리=2rem, 3자리=2.75rem, 4자리=3.5rem, 5자리+=4.5rem |
| `string` (e.g., `"3rem"`) | 그대로 |
| `number` (e.g., `48`) | `"48px"` |

**Cell 모드는 `"auto"` 미지원** (단일 셀로는 자릿수 결정 불가). 부모(예: CodeView)가 미리 계산해 모든 셀에 동일 width 전달.

### 4.8 데이터 속성

모든 셀이 다음 속성 출력:
- `data-gutter="true"` — copy 로직 skip 마커 (CodeView 호환).
- `data-line-number={lineNumber}` — 디버깅·테스트·CSS 셀렉터용.
- `data-highlighted=""` — 강조 라인 표시 (선택자: `[data-highlighted]`).

컬럼 자체도 `data-gutter="true"`.

---

## 5. CodeView 리팩토링

### 5.1 현재 구조 (추출 전)

`CodeView.tsx` line 467-519 발췌:

```tsx
const gutterStyle: React.CSSProperties = {
  flexShrink:    0,
  minWidth:      resolvedGutterWidth,
  paddingRight:  resolvedGutterGap,
  boxSizing:     "content-box",
  textAlign:     "right",
  color:         lineNumberColor[theme],
  fontSize:      "0.85em",
  lineHeight:    "inherit",
  userSelect:    "none",
  pointerEvents: "none",
  position:      "sticky",
  left:          0,
  zIndex:        1,
  backgroundColor: themeBg,
};

// ... 행별 렌더링:
{showLineNumbers && (
  <span data-gutter="true" aria-hidden="true" style={gutterStyle}>
    {li + 1}
  </span>
)}
```

### 5.2 목표 구조 (추출 후)

```tsx
import { LineNumbers } from "../LineNumbers";

// ...

const resolvedGutterWidth = showLineNumbers
  ? (gutterWidthProp ?? undefined) // undefined면 LineNumbers.Cell이 받기 전에 계산
  : "0";

// 행별 렌더링:
{showLineNumbers && (
  <LineNumbers.Cell
    lineNumber={li + 1}
    width={resolvedGutterWidth}  // CodeView가 통일 너비 전달
    gap={resolvedGutterGap}
    theme={theme}
    bg={themeBg}
    sticky
  />
)}
```

### 5.3 변경 사항 상세

**삭제:**
- `lineNumberColor` 상수 (line 18-21) — `LineNumbers/utils.ts`로 이동되므로.
- `getGutterWidth` 함수 (line 43-48) — 동일.
- `gutterStyle` 객체 (line 467-482) — `LineNumbers.Cell`이 자체 생성.

**유지:**
- `walkEffectiveNodes`의 `data-gutter` skip 로직 (line 73) — `LineNumbers.Cell`도 `data-gutter="true"`를 출력하므로 그대로 동작.
- `gutterWidthProp`, `gutterGapProp` 사용자 prop — CodeView가 받아서 LineNumbers.Cell로 전달.
- textarea overlay의 `paddingLeft: gutterTotalWidth` 계산 (line 521-524, 624) — gutterTotalWidth 계산 방식은 유지.

**대체:**
- `lineNumberColor[theme]` 직접 참조 → `themeColors[theme].text` (LineNumbers utils에서 import).
- `getGutterWidth(tokens.length)` 직접 호출 → `resolveGutterWidth(tokens.length)` (LineNumbers utils에서 import).

### 5.4 너비 결정 흐름 (CodeView 내부)

리팩토링 후:
```tsx
import { resolveGutterWidth } from "../LineNumbers/utils";

const resolvedGutterWidth = showLineNumbers
  ? (gutterWidthProp ?? resolveGutterWidth(tokens.length))
  : "0";
const resolvedGutterGap = gutterGapProp ?? "1rem";
```

`gutterWidthProp` (사용자 명시 너비)가 있으면 그것 우선, 없으면 자동 계산.

### 5.5 테마 색상 — bg 전달 주의

CodeView의 `themeBg`은 `style.backgroundColor ?? (theme === "dark" ? "#1e1e1e" : "#fff")` (prism 테마 배경 또는 fallback). LineNumbers.Cell의 `bg` prop으로 그대로 전달:

```tsx
<LineNumbers.Cell
  ...
  bg={themeBg}  // sticky일 때 행 배경 가리는 용도
/>
```

LineNumbers의 자체 `themeColors[theme].bg`는 standalone 사용 시의 기본값일 뿐 — CodeView 내부 사용 시는 `themeBg` (prism 배경)으로 명시 override해야 행과 자연스럽게 연결됨.

### 5.6 walkEffectiveNodes 호환성

기존 코드 (line 73):
```ts
if (el.hasAttribute("data-gutter")) return; // skip line numbers when copying
```

리팩토링 후 `LineNumbers.Cell`도 `data-gutter="true"` 출력하므로 기존 로직 그대로 동작. **테스트 항목**: CodeView 데모 페이지에서 텍스트 선택 + Cmd+C 시 복사 결과에 라인번호가 포함되지 않는지 확인.

### 5.7 회귀 검증 체크리스트

CodeView 데모 페이지(`demo/src/pages/CodeViewPage.tsx`)에서 모든 항목 시각·동작 확인:
- [ ] showLineNumbers=true 기본 표시
- [ ] showLineNumbers=false 라인번호 숨김
- [ ] gutterWidth, gutterGap 명시 시 너비 반영
- [ ] highlightLines 강조
- [ ] 가로 스크롤 시 라인번호 sticky
- [ ] 다크 테마 색상
- [ ] alternating row 배경과 라인번호 정렬
- [ ] copy 시 라인번호 제외 (선택 후 Cmd+C)
- [ ] editable 모드에서 textarea overlay와 라인번호 정렬
- [ ] 한글 IME 입력 시 라인번호 위치 변동 없음

---

## 6. 데모 페이지 — `demo/src/pages/LineNumbersPage.tsx`

```tsx
import { Card, LineNumbers } from "@pihitpihit/plastic";

const SAMPLE_LINES = Array.from({ length: 12 }, (_, i) => `console.log("line ${i + 1}");`);

export function LineNumbersPage() {
  return (
    <div>
      <h1>LineNumbers</h1>

      {/* 섹션 1: 기본 */}
      <Card.Root>
        <Card.Header>Basic — count={12}</Card.Header>
        <Card.Body>
          <div style={{ display: "flex", border: "1px solid #ddd", fontFamily: "monospace" }}>
            <LineNumbers count={SAMPLE_LINES.length} />
            <pre style={{ margin: 0, padding: "0 0 0 0", flex: 1 }}>
              {SAMPLE_LINES.join("\n")}
            </pre>
          </div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 2: start / step */}
      <Card.Root>
        <Card.Header>start={101} step={2}</Card.Header>
        <Card.Body>
          <div style={{ display: "flex", border: "1px solid #ddd", fontFamily: "monospace" }}>
            <LineNumbers count={6} start={101} step={2} />
            <pre style={{ margin: 0, flex: 1 }}>{"a\nb\nc\nd\ne\nf"}</pre>
          </div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 3: 강조 */}
      <Card.Root>
        <Card.Header>highlightLines={[3, 5, 7]}</Card.Header>
        <Card.Body>
          <div style={{ display: "flex", border: "1px solid #ddd", fontFamily: "monospace" }}>
            <LineNumbers count={10} highlightLines={[3, 5, 7]} />
            <pre style={{ margin: 0, flex: 1 }}>
              {Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join("\n")}
            </pre>
          </div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 4: relative 모드 */}
      <Card.Root>
        <Card.Header>relative activeLine={5}</Card.Header>
        <Card.Body>
          <div style={{ display: "flex", border: "1px solid #ddd", fontFamily: "monospace" }}>
            <LineNumbers count={9} relative activeLine={5} highlightLines={[5]} />
            <pre style={{ margin: 0, flex: 1 }}>
              {Array.from({ length: 9 }, (_, i) => `Line ${i + 1}`).join("\n")}
            </pre>
          </div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 5: 클릭 핸들러 */}
      <Card.Root>
        <Card.Header>onLineClick (클릭/Enter로 alert)</Card.Header>
        <Card.Body>
          <div style={{ display: "flex", border: "1px solid #ddd", fontFamily: "monospace" }}>
            <LineNumbers count={5} onLineClick={(n) => alert(`Clicked line ${n}`)} />
            <pre style={{ margin: 0, flex: 1 }}>{"a\nb\nc\nd\ne"}</pre>
          </div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 6: 다크 테마 */}
      <Card.Root>
        <Card.Header>theme="dark"</Card.Header>
        <Card.Body>
          <div style={{ display: "flex", background: "#1e1e1e", color: "#e5e7eb", fontFamily: "monospace" }}>
            <LineNumbers count={6} theme="dark" />
            <pre style={{ margin: 0, flex: 1 }}>{"a\nb\nc\nd\ne\nf"}</pre>
          </div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 7: 큰 라인 수 (자동 너비) */}
      <Card.Root>
        <Card.Header>1000+ lines (자동 너비 확장)</Card.Header>
        <Card.Body>
          <div style={{ display: "flex", border: "1px solid #ddd", maxHeight: 200, overflow: "auto" }}>
            <LineNumbers count={1500} />
            <pre style={{ margin: 0, flex: 1 }}>
              {Array.from({ length: 1500 }, (_, i) => `Line ${i + 1}`).join("\n")}
            </pre>
          </div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 8: cell 모드 (per-row 임베드 예시) */}
      <Card.Root>
        <Card.Header>Cell 모드 — 사용자 정의 행 레이아웃</Card.Header>
        <Card.Body>
          <div style={{ fontFamily: "monospace" }}>
            {SAMPLE_LINES.map((line, i) => (
              <div key={i} style={{ display: "flex" }}>
                <LineNumbers.Cell lineNumber={i + 1} width="2rem" highlighted={i === 4} />
                <span style={{ flex: 1 }}>{line}</span>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card.Root>
    </div>
  );
}
```

데모 라우팅 등록 — `demo/src/App.tsx`의 NAV에 `LineNumbers` 추가.

---

## 7. 접근성 (a11y)

### 7.1 라인번호는 메타데이터 (장식)
기본적으로 라인번호는 콘텐츠가 아니라 위치 메타데이터. 스크린리더가 매번 "1, 2, 3, ..." 을 읽으면 노이즈가 큼.

→ 기본 `aria-hidden="true"` (column 자체 + 모든 셀).

### 7.2 클릭 가능 라인번호는 의미 있음
`onLineClick` prop이 있으면 라인번호가 인터랙티브 요소가 됨 (영구 링크, 라인 점프 등).

→ `role="button"` + `tabIndex=0` + `aria-label="Line {N}"`.

### 7.3 키보드 작동
- Tab: 클릭 가능 셀들로 포커스 이동.
- Enter/Space: 활성 셀 클릭 (`onLineClick(lineNumber)`).
- Esc / 그 외 키: 무시.

### 7.4 강조 라인의 시각 표시
`data-highlighted=""` 속성 + 색상 변경으로 표현. 스크린리더 알림은 부모 컴포넌트(예: 검색 결과 표시)의 책임.

---

## 8. 설계 결정 사항 (rationale)

### 8.1 Column 모드와 Cell 모드 둘 다 제공
**이유**:
- Column 모드: 단순 사용처(LogView, 정적 코드)에서 부모가 한 줄로 끝낼 수 있음. flex/grid 합성 비용 낮음.
- Cell 모드: CodeView처럼 행마다 라인번호 + 컨텐츠를 한 행에 같이 배치하는 복잡 레이아웃이 필수. Column 모드만으로는 행 정렬·hover·selection 처리 불가.

각각이 다른 사용 패턴을 지원해야 라이브러리가 LogView·Terminal·DiffView 같은 미래 컴포넌트를 모두 흡수 가능.

### 8.2 `data-gutter="true"` 강제 출력
**이유**: CodeView의 copy 로직(`walkEffectiveNodes`)이 이 속성에 의존. 추출 후에도 동일 동작 보장 위해 필수. 향후 다른 컴포넌트도 같은 패턴(라인번호 skip)을 쓸 수 있음.

### 8.3 너비 자동 계산 — 자릿수 기반
**이유**: 행 수가 증가해도 라인번호가 잘리거나 정렬 깨지지 않게. CodeView 기존 방식 그대로 보존(시각 회귀 0).

### 8.4 sticky 기본 true
**이유**: 가로 스크롤 시 라인번호가 화면 밖으로 사라지면 "현재 어디 보는지" 인지 곤란. 코드 표시의 표준. CodeView 기본값과 일치.

### 8.5 `onLineClick` 옵셔널 + a11y 분기
**이유**: 클릭 가능 여부에 따라 a11y 시맨틱이 완전히 달라짐 (장식 vs 버튼). prop 유무로 자동 분기하는 게 사용자 인지 부담 가장 작음.

### 8.6 themeColors는 별도 utils 파일
**이유**: CodeView도 사용해야 함 (특히 textarea overlay 색상 매칭). 두 컴포넌트가 같은 토큰 import하면 시각 drift 방지.

### 8.7 Cell 모드에서 width="auto" 미지원
**이유**: 단일 셀로는 totalLineCount 알 수 없음. 부모가 미리 계산해 모든 셀에 통일 너비 전달하는 게 명확.

### 8.8 relative 모드 vim 스타일
**이유**: 키보드 모달 에디터(Vim, Helix) 사용자에게 친숙. 단순 옵션이라 비용 낮음. 기본 false라 일반 사용자에 영향 0.

---

## 9. Edge cases

### 9.1 count = 0
```tsx
<LineNumbers count={0} />
```
- 빈 컬럼 렌더 (자식 0개).
- 컬럼 자체는 paddingRight + minWidth 유지 → 부모 레이아웃에서 의도 안 한 너비 차지 가능.
- 권장 사용 패턴: `count > 0` 일 때만 렌더 (`{count > 0 && <LineNumbers count={count} />}`).

### 9.2 count가 매우 큼 (10만+)
- 가상화 없이 모든 셀을 렌더 → DOM 노드 10만개.
- 성능 저하 — 부모가 가상 스크롤(react-window 등) 사용 권장.
- v1은 가상화 미포함. 문서에 명시.

### 9.3 step = 0
- 모든 라인이 같은 번호 (`start, start, start, ...`).
- 의도된 사용은 아니나 막지 않음. 부모 책임.

### 9.4 step 음수
```tsx
<LineNumbers count={5} start={10} step={-1} />
// → 10, 9, 8, 7, 6
```
- 정상 동작. 너비 계산은 `Math.abs(maxLine)` 기반이라 안전.

### 9.5 highlightLines가 표시 범위 밖
```tsx
<LineNumbers count={10} highlightLines={[15, -3]} />
```
- 매치 안 되는 번호는 무시. 표시 범위(1~10) 안의 매치만 강조.

### 9.6 lineHeight = 숫자(px) vs string(em/rem)
- 숫자 → `"{n}px"`.
- string → 그대로.
- `"inherit"` → 부모 line-height 따라감 (CodeView 시나리오).

### 9.7 sticky=true인데 부모에 `overflow` 설정 없음
- sticky가 작동하지 않음 (브라우저 한계).
- 시각 회귀 없음 (그냥 일반 inline처럼 보임).
- 부모가 `overflow-x: auto` 같은 컨테이닝 블록 만들어야 sticky 활성.

### 9.8 다크 테마 + 사용자 bg override
```tsx
<LineNumbers theme="dark" bg="black" />
```
- bg가 명시 우선. theme의 기본 bg 무시.
- text 색상은 여전히 themeColors.dark.text 사용 → 사용자가 `style.color`로 override 가능.

### 9.9 onLineClick + sticky 동시
- sticky 셀이 클릭되어야 함.
- pointer-events: auto 명시 필요 (코드에 이미 반영).

### 9.10 CodeView 리팩토링 후 textarea 정렬 깨짐
가장 위험한 회귀 케이스. 원인 가능성:
- LineNumbers.Cell의 box-sizing/padding이 미세하게 다름.
- bg color가 prism 테마와 미세하게 다름.

**예방**: 리팩토링 후 모든 CodeView 데모 항목에서 textarea 클릭 → 캐럿 위치가 라인번호 직후 정확한 컬럼에 떨어지는지 확인. 한글 IME 조합 모드도 확인.

---

## 10. 구현 단계 (Phase)

### Phase 1: LineNumbers 신설
1. `src/components/LineNumbers/LineNumbers.types.ts` 작성
2. `src/components/LineNumbers/utils.ts` 작성 (`resolveGutterWidth` + `themeColors`)
3. `src/components/LineNumbers/LineNumbersCell.tsx` 작성
4. `src/components/LineNumbers/LineNumbers.tsx` 작성
5. `src/components/LineNumbers/index.ts` 배럴
6. `src/components/index.ts`에 `export * from "./LineNumbers"` 추가
7. `npm run typecheck` 통과
8. `npm run build` 통과

### Phase 2: 데모 페이지
1. `demo/src/pages/LineNumbersPage.tsx` 작성 (§6 템플릿)
2. `demo/src/App.tsx` NAV 등록
3. 모든 8개 섹션 시각 확인 (light/dark)

### Phase 3: CodeView 리팩토링
1. `CodeView.tsx`에 `import { LineNumbers } from "../LineNumbers"` 추가.
2. `lineNumberColor`, `getGutterWidth` 삭제 (utils로 이동됨).
3. `import { resolveGutterWidth, themeColors } from "../LineNumbers/utils"` 추가.
4. `gutterStyle` 인라인 객체 삭제.
5. 행 렌더링 부에서 `<span data-gutter ...>{li + 1}</span>`을 `<LineNumbers.Cell ... />`로 교체.
6. `themeBg` → `LineNumbers.Cell`의 `bg` prop으로 전달.
7. `npm run typecheck` 통과.

### Phase 4: CodeView 회귀 검증
- [ ] 모든 CodeViewPage 섹션 시각 회귀 없음 (light/dark).
- [ ] 가로 스크롤 sticky 정상.
- [ ] highlightLines 강조 정상.
- [ ] alternating row 정렬 정상.
- [ ] editable 모드 textarea overlay 정렬 정상.
- [ ] 한글 IME 입력 시 정렬 유지.
- [ ] 텍스트 선택 + 복사 시 라인번호 미포함.
- [ ] gutterWidth/gutterGap props 정상 동작.

### Phase 5: 정리
- [ ] `docs/candidates.md`에서 12번 LineNumbers 항목 제거 + 본 plan 링크.
- [ ] README.md에 LineNumbers 섹션 추가.

---

## 11. 향후 확장 (v1.1+)

| 항목 | 설명 |
|---|---|
| Gutter marker 시스템 | breakpoint/changes/folding marker — `<LineNumbers.Marker line={5} type="error" />` |
| Blame annotation | 셀 옆 작성자/날짜 표시 — `<LineNumbers ... blame={blameMap} />` |
| Hover anchor | 호버 시 `#L5` 링크 아이콘 표시 |
| 다중 컬럼 | DiffView용 old/new 두 컬럼 — `<LineNumbers columns={[oldNums, newNums]} />` |
| Virtual scroll 통합 | react-window 등과 자동 호환 |
| 라인 색상별 분류 | type 기반 (`error`/`warning`/`added`/`removed` 등) |

---

## 12. 체크리스트 (작업 완료 기준)

- [ ] `src/components/LineNumbers/` 5개 파일 작성 완료
- [ ] Column 모드와 Cell 모드 모두 데모에서 정상
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 통과
- [ ] `demo/src/pages/LineNumbersPage.tsx` 작성 + NAV 등록
- [ ] CodeView 리팩토링 완료 (`lineNumberColor`/`getGutterWidth`/`gutterStyle` 삭제 + LineNumbers.Cell 사용)
- [ ] CodeView 데모 모든 섹션 시각 회귀 없음 (light/dark)
- [ ] copy 로직(`walkEffectiveNodes`) 정상 (선택+복사 시 라인번호 미포함)
- [ ] textarea overlay 정렬 정상 (editable 모드)
- [ ] 한글 IME 입력 정상
- [ ] README.md 업데이트
- [ ] `docs/candidates.md`에서 12번 항목 제거 + plan 링크 교체
- [ ] PR 디스크립션에 변경 요약 (신규 LineNumbers + CodeView 내부 리팩토링)
