# HexView 컴포넌트 설계문서

## Context

plastic 라이브러리에 바이너리 데이터를 헥사덤프 형식으로 시각화하는 `HexView` 컴포넌트를 추가한다. 역할은 CodeView의 바이너리 판본 — CodeView가 텍스트/코드를 렌더한다면, HexView는 `Uint8Array` 를 offset · hex bytes · ASCII 3컬럼 레이아웃으로 렌더한다.

참고:
- [jmswrnr.com — React Hex Viewer for Cosmoflow](https://jmswrnr.com/artifacts/react-hex-viewer) (virtualized scrolling · hover/focus/selection · JetBrains Mono)
- 본 레포의 `src/components/CodeView/CodeView.tsx` — theme 토큰, 행 렌더 구조, sticky gutter, copy 버튼, alternating row 패턴을 차용.
- 본 레포의 `src/components/DataTable/useVirtualList.ts` — 행 가상화 훅(기존 구현을 참고하여 `HexView` 내부에서 재사용).

---

## 0. TL;DR (한 페이지 요약)

```
<HexView
  data={uint8Array}           // 필수. Uint8Array | ArrayBuffer | number[]
  bytesPerRow={16}            // 4 | 8 | 16 | 32 | 64
  groupSize={4}               // 1 | 2 | 4 | 8  (그룹(word) 크기)
  endian="big"                // "big" | "little"  (그룹 내 바이트 순서)
  showAscii={true}
  showOffsetColumn={true}     // 좌측 주소 컬럼
  showOffsetHeader={true}     // 상단 offset 헤더 (00 01 02 ... 0F)
  theme="light"
  baseOffset={0}              // 주소 표시 시작값 (기본 0)
  highlightRanges={[{ start: 0x10, end: 0x20, color: "#fde68a" }]}
  ...
/>
```

렌더 결과:
```
         00 01 02 03  04 05 06 07  08 09 0A 0B  0C 0D 0E 0F   ASCII
00000000 7F 45 4C 46  02 01 01 00  00 00 00 00  00 00 00 00   .ELF............
00000010 02 00 3E 00  01 00 00 00  50 0B 40 00  00 00 00 00   ..>.....P.@.....
...
```

핵심 설계 원칙:
- **읽기 전용**. 편집 모드(CodeView의 editable)는 이번 범위에서 생략.
- **가상 스크롤 필수**. 수 MB ~ 수십 MB 바이너리도 부드럽게 스크롤되어야 한다.
- **hover 링크**. hex 한 바이트에 hover 하면 대응 ASCII 셀이 강조되고, 역도 성립.
- **선택 + 복사**. 연속된 바이트 범위를 드래그로 선택, Cmd+C 로 hex / ASCII / byte-array 중 하나로 복사.
- **접근성**. 키보드 화살표로 "focused byte" 이동, ARIA role 명시.

---

## 1. Goals / Non-goals

### Goals (v1)
1. `Uint8Array` 하나를 받아 offset · hex · ASCII 3컬럼 그리드로 렌더.
2. 사용자 요구사항 5종:
   - ASCII 열 show/hide.
   - bytesPerRow: 4 / 8 / 16 / 32 / 64 중 선택.
   - groupSize (몇 바이트씩 묶어서 띄어 보여줄지) + groupSize > 1 일 때 endian ("big" | "little") 에 따른 그룹 내 바이트 렌더 순서.
   - offset 좌측 컬럼 show/hide.
   - offset 상단 헤더 show/hide.
3. 가상 스크롤 (1 MB 이상에서 활성화).
4. hex ↔ ASCII hover 동기화 강조.
5. 마우스 드래그로 연속 바이트 선택.
6. Cmd+C / Ctrl+C 로 선택 범위를 **hex 공백 구분 문자열**로 복사 (기본) + 우상단 복사 버튼에 드롭다운으로 "Copy as ASCII" / "Copy as C array" / "Copy as hex" 제공.
7. Light / Dark 테마.
8. `highlightRanges` prop 으로 임의 범위 하이라이트 (레이블 옵션).

### Non-goals (v1 제외)
- 편집 (바이트 쓰기).
- 검색 / 오프셋 점프 (v1.1).
- Diff 모드 (v1.2).
- 해석 패널 (선택한 바이트를 int8/int16/int32/float32/… 로 디코드하여 별도 패널에 표시) — 구조만 열어두고 구현은 후속.
- Infinite/streaming 소스 (앞으로 fetch 하면서 보여주기). 현 범위는 완성된 `Uint8Array`.
- 다중 선택.

---

## 2. 공개 API

### 2.1 `src/components/HexView/HexView.types.ts`

```ts
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
   * 그룹 사이엔 1~2 ch 공백이 들어간다. 기본 1 (매 바이트 사이 공백).
   * bytesPerRow 의 약수여야 함. 위배 시 dev 에서 console.warn + 가장 가까운 약수로 fallback.
   */
  groupSize?: HexViewGroupSize;

  /**
   * groupSize > 1 일 때 그룹 내 바이트 렌더 순서.
   *   - "big":    메모리 순서 그대로 (byte0 byte1 byte2 byte3)
   *   - "little": 역순 (byte3 byte2 byte1 byte0)
   * 기본 "big". groupSize === 1 이면 무의미 (무시).
   */
  endian?: HexViewEndian;

  /** ASCII 컬럼 표시 여부. 기본 true. */
  showAscii?: boolean;

  /** 좌측 offset 컬럼 표시 여부. 기본 true. */
  showOffsetColumn?: boolean;

  /** 상단 offset 헤더 (00 01 02 ... 0F) 표시 여부. 기본 true. */
  showOffsetHeader?: boolean;

  /**
   * 주소 표시 기준 오프셋. file-absolute 가 아닌 memory base 등으로 쓰일 수 있다.
   * 기본 0.
   */
  baseOffset?: number;

  /**
   * offset 컬럼에 표시할 hex 자리수. 미지정 시 data.length + baseOffset 의
   * 크기에 따라 4 / 6 / 8 / 12 / 16 중 자동 선택.
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
   *   - (char) => string : 사용자 함수
   */
  nonPrintable?: "dot" | "underscore" | "blank" | ((byte: number) => string);

  /** 추가 className. */
  className?: string;
}
```

### 2.2 `index.ts` 배럴

```ts
// src/components/HexView/index.ts
export { HexView } from "./HexView";
export type {
  HexViewProps,
  HexViewTheme,
  HexViewEndian,
  HexViewBytesPerRow,
  HexViewGroupSize,
  HexViewCopyFormat,
  HexViewHighlightRange,
  HexViewSelection,
} from "./HexView.types";
```

그리고 `src/components/index.ts` 에 `export * from "./HexView";` 한 줄 추가.

---

## 3. 데이터 모델

### 3.1 입력 정규화

```ts
function normalizeData(input: Uint8Array | ArrayBuffer | number[]): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return Uint8Array.from(input);
}
```

`useMemo` 로 감싸 `data` prop identity 가 바뀔 때만 정규화. `Uint8Array` 직접 전달이 성능상 권장 (zero-copy).

### 3.2 파생 상수

```ts
const bytes = normalizedData;                      // Uint8Array
const totalRows = Math.ceil(bytes.length / bytesPerRow);
const groupsPerRow = bytesPerRow / groupSize;      // (groupSize 는 bytesPerRow 약수)
const rowPixelHeight = 20;                         // 실측 값 — 아래 §6.1 참조
```

### 3.3 offsetDigits 자동 결정

```ts
function autoOffsetDigits(maxOffset: number): number {
  // maxOffset = baseOffset + bytes.length - 1 (마지막 바이트 주소)
  if (maxOffset <= 0xffff)        return 4;       // 64 KiB
  if (maxOffset <= 0xffffff)      return 6;       // 16 MiB
  if (maxOffset <= 0xffffffff)    return 8;       // 4 GiB
  if (maxOffset <= 0xfffffffffff) return 12;
  return 16;                                       // 최대
}
```

`offsetDigits` prop 이 있으면 그것을 사용. 표시할 때 `offset.toString(16).toUpperCase().padStart(digits, "0")`.

### 3.4 그룹 + endian 렌더 순서

바이트 행을 그룹으로 나누고, 각 그룹 안에서 endian 에 따라 순서를 뒤집는다:

```ts
function renderOrderForRow(rowBytes: Uint8Array, groupSize: number, endian: HexViewEndian): Uint8Array {
  if (groupSize === 1 || endian === "big") return rowBytes;
  // little endian: 각 그룹 안에서 역순
  const out = new Uint8Array(rowBytes.length);
  for (let i = 0; i < rowBytes.length; i += groupSize) {
    const end = Math.min(i + groupSize, rowBytes.length);
    for (let j = 0; j < end - i; j++) {
      out[i + j] = rowBytes[end - 1 - j]!;
    }
  }
  return out;
}
```

**중요**: endian 은 **시각 표시 순서**만 바꾸며, 바이트의 **논리 오프셋(address/offset)** 자체는 변하지 않는다. 즉:
- 메모리 상 offset 0x100 ~ 0x103 = `12 34 56 78`
- big endian 표시: `12 34 56 78` (hover 하면 왼쪽부터 offset 0x100, 0x101, 0x102, 0x103)
- little endian 표시: `78 56 34 12` (hover 하면 왼쪽부터 offset 0x103, 0x102, 0x101, 0x100)

선택 범위 · 하이라이트 등은 모두 논리 오프셋 기준으로 계산하고, 렌더 시에만 endian 매핑을 적용.

ASCII 컬럼은 **항상 big-endian 순서(메모리 순서)** 로 표시. endian 설정은 ASCII 에는 영향을 주지 않는다 (ASCII 는 텍스트이므로).

### 3.5 비인쇄 문자 판정

```ts
function printableAscii(byte: number): boolean {
  return byte >= 0x20 && byte < 0x7f;
}
```

그 외는 `nonPrintable` prop 에 따라 렌더.

---

## 4. 레이아웃

### 4.1 DOM 구조

```
<div ref={rootRef} class="hexview-root" style="position:relative; ...">
  (optional) <CopyButton />  — 우상단 absolute, CodeView 와 동일 위치·스타일

  <div class="hexview-viewport"
       style="max-height: {maxHeight}; overflow: auto;"
       ref={viewportRef}
       onScroll={onScroll}
       onMouseDown/Move/Up={selection handlers}
       onCopy={handleCopy}
       onKeyDown={handleKeyDown}
       role="grid"
       aria-rowcount={totalRows}
       tabIndex={0}>

    (optional) <HeaderRow />            ← sticky top, showOffsetHeader
    <Spacer height={paddingTop} />       ← virtualization
    {visibleRows.map(rowIndex => <Row key={rowIndex} index={rowIndex} />)}
    <Spacer height={paddingBottom} />
  </div>
</div>
```

### 4.2 한 행(Row)의 구조

CSS grid 를 쓴다. 컬럼 템플릿:

```ts
const gridCols = [
  showOffsetColumn ? `minmax(${offsetColWidth}, auto)` : null,
  // hex 영역은 group 단위의 반복. groupsPerRow 개의 그룹 컬럼.
  `repeat(${groupsPerRow}, auto)`,
  showAscii ? `minmax(${asciiColWidth}, auto)` : null,
].filter(Boolean).join(" ");
```

더 단순하게: hex 영역 전체를 **inline flex** 한 컬럼으로 넣고, 내부에서 그룹 간 공백을 `margin-right` 로 처리. 아래 구현은 이 쪽이 덜 틀어지므로 권장.

```tsx
<div data-row={rowIndex} class="hexview-row" style={{
  display: "grid",
  gridTemplateColumns: gridCols,
  columnGap: "1.25rem",        // offset ↔ hex ↔ ASCII 간격
  height: rowPixelHeight,
  alignItems: "center",
  background: rowBg(rowIndex),
}}>
  {showOffsetColumn && <OffsetCell offset={...} />}
  <HexCells rowBytes={...} groupSize={...} endian={...} rowStart={...} />
  {showAscii && <AsciiCells rowBytes={...} rowStart={...} />}
</div>
```

### 4.3 `<OffsetCell>`

```tsx
<span
  data-kind="offset"
  data-row={rowIndex}
  style={{
    fontVariantNumeric: "tabular-nums",
    color: palette.offsetFg,
    userSelect: "none",
    whiteSpace: "nowrap",
    paddingRight: "0.5rem",
    textAlign: "right",
  }}
  aria-hidden="true"
>
  {formatOffset(baseOffset + rowIndex * bytesPerRow)}
</span>
```

### 4.4 `<HexCells>`

```tsx
<div data-kind="hex" style={{ display: "flex", whiteSpace: "nowrap" }}>
  {groups.map((group, gi) => (
    <span key={gi} style={{
      display: "inline-flex",
      marginRight: gi < groupsPerRow - 1 ? "0.5ch" : 0,
    }}>
      {group.map(({ byte, logicalOffset }, bi) => (
        <span
          key={bi}
          data-byte-offset={logicalOffset}
          data-kind="hex-byte"
          onMouseEnter={() => setHoverOffset(logicalOffset)}
          onMouseLeave={() => setHoverOffset(null)}
          style={{
            display: "inline-block",
            width: "2ch",
            textAlign: "center",
            marginRight: bi < group.length - 1 ? "0" : undefined,
            // selection / hover / highlight 배경은 styleForByte(logicalOffset) 로부터
            ...styleForByte(logicalOffset),
          }}
        >
          {byte === undefined ? "  " : hexOf(byte)}
        </span>
      ))}
    </span>
  ))}
</div>
```

- `byte === undefined` 는 마지막 행에서 `bytes.length % bytesPerRow !== 0` 일 때 발생. 공백 두 칸으로 자리만 유지하여 컬럼 정렬을 깨뜨리지 않는다.
- `hexOf(byte)` = `byte.toString(16).padStart(2, "0").toUpperCase()` (대문자 hex).
- 그룹 내에서는 바이트 사이에 공백 없이 이어 붙이고 (`2ch` 고정), 그룹 사이에만 `0.5ch` 마진.

### 4.5 `<AsciiCells>`

```tsx
<div data-kind="ascii" style={{
  display: "inline-flex",
  color: palette.asciiFg,
  whiteSpace: "nowrap",
  borderLeft: `1px solid ${palette.border}`,
  paddingLeft: "0.75rem",
}}>
  {rowBytes.map((byte, bi) => {
    const logicalOffset = rowStart + bi;
    return (
      <span
        key={bi}
        data-byte-offset={logicalOffset}
        data-kind="ascii-cell"
        onMouseEnter={() => setHoverOffset(logicalOffset)}
        onMouseLeave={() => setHoverOffset(null)}
        style={{
          display: "inline-block",
          width: "1ch",
          textAlign: "center",
          ...styleForByte(logicalOffset),
        }}
      >
        {renderAsciiChar(byte)}
      </span>
    );
  })}
</div>
```

ASCII 컬럼은 **논리 순서 그대로** (endian 영향 없음). §3.4 참조.

### 4.6 상단 헤더 (`showOffsetHeader`)

```tsx
<div
  class="hexview-header"
  style={{
    display: "grid",
    gridTemplateColumns: gridCols,  // 본문과 동일해야 정렬 맞음
    columnGap: "1.25rem",
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: palette.headerBg,
    borderBottom: `1px solid ${palette.border}`,
    color: palette.offsetFg,
    fontSize: "0.85em",
    userSelect: "none",
  }}
  aria-hidden="true"
>
  {showOffsetColumn && <span />}              {/* offset 컬럼 자리 유지 */}
  <HexCells                                   /* 헤더도 본문과 같은 HexCells 로 */
    rowBytes={dummyIndexRow}                  /* [0..bytesPerRow-1] */
    groupSize={groupSize}
    endian={endian}                           /* 헤더에도 endian 적용해야 본문과 정렬 */
    renderByte={(b, i) => hexOf(i)}
    interactive={false}                       /* hover/selection 비활성 */
  />
  {showAscii && <span>ASCII</span>}           {/* 또는 빈 자리 */}
</div>
```

**중요**: 헤더의 hex 영역은 본문과 **같은 groupSize + endian** 로 렌더되어야 본문 바이트와 시각적으로 컬럼이 맞는다. 예) `groupSize=4, endian="little"` → 헤더도 `03 02 01 00  07 06 05 04  ...`.

### 4.7 컬럼 폭 산출

- `offsetColWidth`: `${offsetDigits + 1}ch` (여유 1ch).
- ASCII 컬럼 폭: `${bytesPerRow}ch` + 좌측 패딩 `0.75rem` + 보더.
- Hex 영역 폭: `${bytesPerRow * 2 + (groupsPerRow - 1) * 0.5}ch` 근사 (정확한 값은 flex 가 알아서).

컨테이너가 충분히 넓지 않으면 `overflow-x: auto` 로 가로 스크롤 (viewport 요소에 적용).

---

## 5. 색상 팔레트

CodeView 의 토큰 패턴을 그대로 차용.

```ts
const palette: Record<HexViewTheme, {
  bg: string;
  fg: string;
  offsetFg: string;
  asciiFg: string;
  headerBg: string;
  border: string;
  alt: string;
  hoverBg: string;
  selectionBg: string;
  selectionFg: string;
  highlightBg: string;
  nullByteFg: string;     // 0x00 바이트만 약하게 (optional 시각 hierarchy)
  copyBtnBg: string;
  copyBtnFg: string;
}> = {
  light: {
    bg:           "#ffffff",
    fg:           "#1f2937",
    offsetFg:     "rgba(0,0,0,0.40)",
    asciiFg:      "#374151",
    headerBg:     "#f9fafb",
    border:       "rgba(0,0,0,0.08)",
    alt:          "rgba(0,0,0,0.03)",
    hoverBg:      "rgba(59,130,246,0.18)",
    selectionBg:  "rgba(59,130,246,0.30)",
    selectionFg:  "#1e3a8a",
    highlightBg:  "rgba(253,224,71,0.45)",
    nullByteFg:   "rgba(0,0,0,0.25)",
    copyBtnBg:    "rgba(0,0,0,0.06)",
    copyBtnFg:    "rgba(0,0,0,0.55)",
  },
  dark: {
    bg:           "#1e1e1e",
    fg:           "#e5e7eb",
    offsetFg:     "rgba(255,255,255,0.35)",
    asciiFg:      "#d1d5db",
    headerBg:     "#27272a",
    border:       "rgba(255,255,255,0.10)",
    alt:          "rgba(255,255,255,0.04)",
    hoverBg:      "rgba(96,165,250,0.22)",
    selectionBg:  "rgba(96,165,250,0.36)",
    selectionFg:  "#dbeafe",
    highlightBg:  "rgba(253,224,71,0.22)",
    nullByteFg:   "rgba(255,255,255,0.25)",
    copyBtnBg:    "rgba(255,255,255,0.08)",
    copyBtnFg:    "rgba(255,255,255,0.55)",
  },
};
```

`styleForByte(offset)` 우선순위 (아래로 갈수록 우선):
1. alternating row 배경 (`rowIndex % 2 === 1` 이면 `palette.alt`).
2. highlightRange 배경 (해당 range 의 `color` 또는 `palette.highlightBg`).
3. hover 대상 (hoverOffset === offset 이거나, linkHover 이고 ASCII ↔ hex 대응 중이면) → `palette.hoverBg`.
4. selection 범위 (`selStart <= offset < selEnd`) → `palette.selectionBg`, fg `palette.selectionFg`.

hex 컬럼에서 바이트 = 0x00 이면 `color: palette.nullByteFg` 를 덧씌워 시각 잡음을 줄인다 (이건 옵션으로 두지 않고 기본 on).

---

## 6. 가상 스크롤

### 6.1 측정

행 높이는 **고정**. 고정값의 결정은 컨테이너 마운트 시 1 회 실측:

```tsx
const [rowHeight, setRowHeight] = useState<number>(20); // fallback
const measureRef = useRef<HTMLDivElement>(null);
useLayoutEffect(() => {
  const el = measureRef.current;
  if (!el) return;
  const h = el.getBoundingClientRect().height;
  if (h > 0 && Math.abs(h - rowHeight) > 0.5) setRowHeight(h);
}, []);
```

`measureRef` 로는 첫 행 DOM 을 참조. 폰트 로드 후 재측정이 필요하면 `document.fonts.ready` 후 한 번 더 (v1 에서는 생략해도 됨 — monospace 시스템 폰트는 즉시 사용 가능).

### 6.2 `useVirtualList` 재사용

`src/components/DataTable/useVirtualList.ts` 를 **그대로 import 하지 말고**, 동일 로직의 사본을 `src/components/HexView/useHexVirtualList.ts` 로 둔다. 이유:
- `DataTable` 은 `viewportHeight` 를 prop 또는 resize observer 로 받는 반면 HexView 는 내부 viewport 의 `clientHeight` 를 직접 본다. 인터페이스가 미묘하게 다르다.
- 컴포넌트 간 horizontal coupling 최소화.

훅 시그니처:

```ts
interface UseHexVirtualListOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;          // 기본 8
  threshold?: number;         // 기본 512 (totalRows 가 이 이상일 때만 가상화)
}

interface UseHexVirtualListReturn {
  enabled: boolean;
  startIndex: number;
  endIndex: number;           // exclusive
  paddingTop: number;
  paddingBottom: number;
  viewportRef: RefObject<HTMLDivElement | null>;
  onScroll: (e: UIEvent<HTMLElement>) => void;
}
```

스크롤 반응 로직은 `useVirtualList` 와 동일 (scrollTop 상태 + startIndex/endIndex 계산). `viewportHeight` 는 `viewportRef.current.clientHeight` 에서 읽고, `ResizeObserver` 로 관찰.

### 6.3 행 렌더 메모이제이션

각 `<Row>` 는 `React.memo` 로 감싸고, 의존하는 값은 `rowIndex`, `bytes` (slice 결과), `bytesPerRow`, `groupSize`, `endian`, `theme`, `hoverOffset`, `selection`, `highlightRanges (slice 된 부분)` 로 한정. 전역 hover/selection 상태가 바뀔 때마다 모든 행이 리렌더되면 60fps 유지가 힘들다. 그래서:

- `hoverOffset` 은 **전역 상태가 아닌 DOM 속성 토글** 로 처리 (직접 DOM 조작). 아래 §7.1 참조.
- `selection` 도 변경된 행만 리렌더되도록 **행별 selection 요약** (`{ hasSelection: boolean; mask?: number }`) 을 만들고 비교.
- `highlightRanges` 는 prop 단위로 기억; prop 이 안 바뀌면 행도 안 바뀐다.

복잡성이 크다고 판단되면 v1 은 단순하게 전체 리렌더로 가고, 프로파일 후 v1.1 에서 최적화한다. 가이드만 남김.

---

## 7. 인터랙션

### 7.1 Hover 링크 (hex ↔ ASCII)

`linkHover=true` (기본) 일 때, 한 바이트에 hover 하면 hex 셀과 ASCII 셀 둘 다 `palette.hoverBg` 로 강조.

**구현 (DOM 직접 조작, 리렌더 회피)**:

```ts
const hoverOffsetRef = useRef<number | null>(null);
function setHoverClass(rootEl: HTMLElement, offset: number | null) {
  // 이전 offset 해제
  const prev = hoverOffsetRef.current;
  if (prev !== null) {
    rootEl.querySelectorAll(`[data-byte-offset="${prev}"]`).forEach(el => {
      (el as HTMLElement).dataset.hover = "";
    });
  }
  if (offset !== null) {
    rootEl.querySelectorAll(`[data-byte-offset="${offset}"]`).forEach(el => {
      (el as HTMLElement).dataset.hover = "1";
    });
  }
  hoverOffsetRef.current = offset;
}
```

셀의 `style` 에 `data-hover="1"` 일 때 `backgroundColor: palette.hoverBg` 가 적용되도록:
- CSS: 모듈 초기화 시 한 번 주입, `[data-hover="1"] { background: var(--hexview-hover-bg) }` 같은 식. 또는 각 셀의 `style` 에 직접 분기 반영하되 그 분기는 DOM 이벤트 핸들러에서만 발생 (리렌더 X).

이벤트 바인딩은 viewport 루트에 위임 (`mouseover`/`mouseout` 에서 `closest("[data-byte-offset]")`).

### 7.2 선택

마우스 드래그로 시작/끝 바이트를 지정. 구현:

```ts
const [selection, setSelection] = useState<HexViewSelection | null>(null); // controlled 가 있으면 그걸 사용
const dragStartOffsetRef = useRef<number | null>(null);

function onMouseDown(e: ReactMouseEvent<HTMLDivElement>) {
  const target = (e.target as HTMLElement).closest("[data-byte-offset]");
  if (!target) {
    // 빈 공간 클릭 → 선택 해제
    commitSelection(null);
    return;
  }
  const off = Number((target as HTMLElement).dataset.byteOffset);
  dragStartOffsetRef.current = off;
  commitSelection({ start: off, end: off + 1 });
  // pointer capture 로 드래그가 viewport 밖으로 나가도 끊기지 않게
  (e.currentTarget as HTMLElement).setPointerCapture(e.nativeEvent.pointerId);
}

function onMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
  if (dragStartOffsetRef.current === null) return;
  const target = (e.target as HTMLElement).closest("[data-byte-offset]");
  if (!target) return;
  const off = Number((target as HTMLElement).dataset.byteOffset);
  const s0 = dragStartOffsetRef.current;
  const start = Math.min(s0, off);
  const end   = Math.max(s0, off) + 1;
  commitSelection({ start, end });
}

function onMouseUp() {
  dragStartOffsetRef.current = null;
}
```

**auto-scroll during drag**: 마우스가 viewport 상/하단 10px 에 있을 때 `requestAnimationFrame` 루프로 `viewport.scrollTop += sign * speed`. DataTable 에 유사 로직이 있으면 참고. (없으면 간단 구현.)

Shift-Click 확장: 기존 selection 이 있는 상태에서 Shift-Click 하면 `start` 는 유지하고 `end` 만 클릭 위치로 확장. (v1 에 포함.)

### 7.3 키보드

`tabIndex={0}` 로 viewport 가 포커스 수신.

- `ArrowRight` / `ArrowLeft`: focused byte 를 1 바이트 이동.
- `ArrowDown` / `ArrowUp`: focused byte 를 `bytesPerRow` 만큼 이동.
- `Home`: 행 시작으로, `End`: 행 끝으로.
- `PageDown` / `PageUp`: 대략 viewport height / rowHeight 행 만큼.
- `Shift + 위 동작`: selection 확장.
- `Cmd/Ctrl + C`: 복사 (§7.4).
- `Cmd/Ctrl + A`: 전체 선택.

focused byte 는 별도 상태 `focusedOffset: number | null`. 시각적으로 1px outline (CSS `outline: 1px solid currentColor; outline-offset: -1px`) 으로 표현. focusedOffset 이 변경되면 해당 바이트가 viewport 에 보이도록 `scrollIntoView({ block: "nearest" })` 또는 직접 `scrollTop` 조정. 너무 aggressive 한 scrollIntoView 는 UX 를 해치니, 이미 보이는 경우엔 건드리지 않는다.

### 7.4 복사

두 경로:

#### A. 키보드 단축키 (Cmd/Ctrl+C)

viewport 에 `onCopy` 핸들러 부착. 기본 동작:

```ts
function handleCopyEvent(e: React.ClipboardEvent<HTMLDivElement>) {
  const sel = currentSelection;
  if (!sel) return;  // 아무것도 안 함 — 브라우저가 빈 선택 처리
  e.preventDefault();
  const slice = bytes.slice(sel.start, sel.end);
  const text = formatBytes(slice, defaultCopyFormat);
  e.clipboardData.setData("text/plain", text);
}
```

`formatBytes`:
```ts
function formatBytes(slice: Uint8Array, fmt: HexViewCopyFormat): string {
  switch (fmt) {
    case "hex":
      return Array.from(slice, b => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
    case "ascii":
      return Array.from(slice, b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : ".").join("");
    case "c-array": {
      const parts = Array.from(slice, b => "0x" + b.toString(16).padStart(2, "0"));
      // 한 줄 16개씩 줄바꿈
      const lines: string[] = [];
      for (let i = 0; i < parts.length; i += 16) lines.push(parts.slice(i, i + 16).join(", "));
      return "{ " + lines.join(",\n  ") + " }";
    }
  }
}
```

#### B. 복사 버튼 (우상단)

CodeView 의 복사 버튼 레이아웃/위치/색상을 그대로 사용. 단 **드롭다운** 으로 확장:

```
[ Copy ▾ ]   →  Copy as hex / Copy as ASCII / Copy as C array / Copy all hex
```

구현은 `<Popover>` 를 재사용해도 좋고, 단순 `<select>` 로 해도 좋다. **v1 단순화**: 버튼 클릭 시 기본 포맷 복사, Alt-click 또는 우클릭 시 작은 컨텍스트 메뉴 표시. 또는 아예 드롭다운 생략하고 버튼 좌측에 세그먼트 컨트롤 `[HEX] [ASC] [C]` 세 버튼을 둔다 — **권장**:

```tsx
<div style={{ position: "absolute", top: "0.35rem", right: "0.35rem", display: "flex", gap: "0.25rem" }}>
  <SegButton active={fmt === "hex"} onClick={() => setFmt("hex")}>HEX</SegButton>
  <SegButton active={fmt === "ascii"} onClick={() => setFmt("ascii")}>ASC</SegButton>
  <SegButton active={fmt === "c-array"} onClick={() => setFmt("c-array")}>C</SegButton>
  <button onClick={doCopy}>복사</button>
</div>
```

현재 선택이 없으면 **전체 데이터** 를 복사. (CodeView 와 동일한 "copy all" 동작.)

### 7.5 ARIA

- 루트 viewport: `role="grid"` + `aria-rowcount={totalRows}` + `aria-colcount={bytesPerRow + (showOffsetColumn ? 1 : 0) + (showAscii ? 1 : 0)}`.
- 각 `<Row>`: `role="row"` + `aria-rowindex={rowIndex + 1}`.
- offset cell: `role="rowheader"` (단, `aria-hidden="true"` 로 스크린리더에서는 숨겨도 됨 — 반복 노이즈 줄이기).
- hex byte: `role="gridcell"` + `aria-label={\`byte ${offset} = 0x${hex}\`}`. (너무 많으면 성능 저하 가능 — v1 은 루트 `role="grid"` 만 붙이고 셀은 hover/focus 때만 `aria-label` 업데이트하는 경량안 고려.)

v1 의 타협: 루트에 `role="region"` + `aria-label="Hex viewer"`, 개별 셀 ARIA 는 생략. 접근성 개선은 후속.

---

## 8. 파일 구조

```
src/components/HexView/
├── HexView.tsx                 # 조립 + 렌더 (메인)
├── HexView.types.ts            # public types
├── HexView.utils.ts            # formatOffset, hexOf, renderAsciiChar, formatBytes, renderOrderForRow, printableAscii
├── useHexVirtualList.ts        # 가상 스크롤 훅
└── index.ts                    # 배럴
```

`src/components/index.ts` 에 `export * from "./HexView";` 추가.

---

## 9. 구현 단계 (agent 가 순차 실행)

각 단계는 독립 커밋 권장. 각 커밋이 빌드 성공 + typecheck 성공 상태를 유지한다.

### Step 1 — 타입 + 배럴
1. `HexView.types.ts` 생성 (§2.1 전체).
2. `HexView.utils.ts` 생성: `normalizeData`, `autoOffsetDigits`, `formatOffset`, `hexOf`, `renderAsciiChar`, `formatBytes`, `renderOrderForRow`, `printableAscii`.
3. `HexView.tsx` 는 일단 `export function HexView() { return <div /> }` 로 placeholder.
4. `index.ts` 에 export.
5. `src/components/index.ts` 에 `export * from "./HexView";`.
6. `npm run typecheck` 통과.
7. 커밋: `feat(HexView): 타입 + 유틸 함수 + 배럴`.

### Step 2 — 정적 렌더 (가상화 없이, 전체 행)
1. `HexView.tsx` 에 핵심 컴포넌트 작성:
   - props 디스트럭처링 + 기본값.
   - `data` 정규화 (`useMemo`).
   - `totalRows`, `groupsPerRow` 계산.
   - palette 테마 선택.
   - `<div>` 루트 + `<div>` viewport + (header) + rows.
2. alternating row 배경, offset cell, hex cells (group + endian), ASCII cells 까지 렌더.
3. highlightRanges 배경 적용.
4. 데모 페이지 stub (§10) 에 간단 예시 하나 렌더.
5. 시각 확인 (브라우저) + `npm run typecheck`.
6. 커밋: `feat(HexView): 정적 렌더 (가상화 전)`.

### Step 3 — 복사 버튼 + 선택
1. 세그먼트 포맷 선택 버튼 + 복사 버튼 (§7.4 B).
2. `onCopy` 키보드 단축키 (§7.4 A).
3. mouse 드래그 selection (§7.2).
4. selection 배경 적용.
5. 커밋: `feat(HexView): 선택 + 복사 (hex/ASCII/C)`.

### Step 4 — Hover 링크
1. viewport 에 mouseover/mouseout delegation.
2. DOM 직접 조작으로 `data-hover` 토글.
3. CSS 주입 (모듈 초기화 시 1 회).
4. linkHover=false 일 때 경로 분기.
5. 커밋: `feat(HexView): hex ↔ ASCII hover 링크`.

### Step 5 — 가상 스크롤
1. `useHexVirtualList.ts` 작성.
2. `HexView.tsx` 에 훅 통합: `viewportRef`, `onScroll`, `paddingTop/Bottom`, 가시 범위 슬라이싱.
3. 대용량(예: 1 MiB) 데이터로 스크롤 성능 확인.
4. 커밋: `feat(HexView): 가상 스크롤`.

### Step 6 — 키보드 네비게이션 + 접근성
1. `focusedOffset` 상태 + 키보드 핸들러.
2. `tabIndex`, role 부여.
3. 커밋: `feat(HexView): 키보드 네비게이션 + ARIA`.

### Step 7 — 데모 페이지
1. `demo/src/pages/HexViewPage.tsx` 작성 (§10).
2. `demo/src/App.tsx` 의 `NAV` 및 `Page` 타입에 `"hexview"` 추가, `{current === "hexview" && <HexViewPage />}` 라우팅.
3. 시각 확인 (브라우저).
4. 커밋 단위 분리 권장 — 섹션별로 (Basic / Bytes per row / Grouping+Endian / Highlight / Virtualized / Props / Usage / Playground).

---

## 10. 데모 페이지 설계

`demo/src/pages/HexViewPage.tsx`. 다른 페이지(`CodeViewPage`, `CommandPalettePage` 등) 의 구조를 그대로 따른다: 섹션별 `<section id="...">` + 우측 사이드바 연동.

### 10.1 샘플 데이터

```ts
// 재사용을 위해 상단에 상수로
const ELF_HEADER = new Uint8Array([
  0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x3e, 0x00, 0x01, 0x00, 0x00, 0x00,
  0x50, 0x0b, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00,
  // ... 총 128 바이트 정도
]);

const LOREM = new TextEncoder().encode(
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
);

function makeLargeData(sizeInKiB: number): Uint8Array {
  const out = new Uint8Array(sizeInKiB * 1024);
  // PRNG 로 적당한 패턴
  let s = 0x12345678;
  for (let i = 0; i < out.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out[i] = s & 0xff;
  }
  return out;
}
```

### 10.2 섹션 구성

`App.tsx` NAV 에 추가할 섹션:

```ts
{ id: "hexview", label: "HexView", description: "바이너리 hex 뷰어", sections: [
  { label: "Basic",          id: "basic" },
  { label: "Bytes per row",  id: "bytes-per-row" },
  { label: "Grouping + Endian", id: "grouping-endian" },
  { label: "ASCII toggle",   id: "ascii-toggle" },
  { label: "Offset toggle",  id: "offset-toggle" },
  { label: "Highlight",      id: "highlight" },
  { label: "Selection + Copy", id: "selection" },
  { label: "Virtualized",    id: "virtualized" },
  { label: "Dark Theme",     id: "dark" },
  { label: "Props",          id: "props" },
  { label: "Usage",          id: "usage" },
  { label: "Playground",     id: "playground" },
]}
```

### 10.3 Playground

상단 컨트롤 바:
- `bytesPerRow` 라디오 (4 / 8 / 16 / 32 / 64)
- `groupSize` 라디오 (1 / 2 / 4 / 8)
- `endian` 토글 (big / little)
- `showAscii`, `showOffsetColumn`, `showOffsetHeader` 체크박스
- `theme` 토글 (light / dark)
- `data size` 드롭다운 (ELF 128B / Lorem 120B / 4 KiB / 64 KiB / 1 MiB)
- `linkHover` 체크박스

아래에 `<HexView>` 하나.

### 10.4 Props 테이블

CodeViewPage 의 props 테이블 패턴 복사. 각 prop · 타입 · 기본값 · 설명.

---

## 11. 검증 계획

### 11.1 자동화

```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```

- `exactOptionalPropertyTypes: true` 때문에 optional prop 은 항상 `?:` 로 선언하고, 내부에서 `undefined` 를 받아 처리해야 한다. `noUncheckedIndexedAccess: true` 때문에 `bytes[i]!` 로 non-null assertion 이 필요한 부분이 있을 수 있다.

### 11.2 수동 (demo dev server)

```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Basic: ELF 128B 데이터가 offset + hex + ASCII 로 렌더. offset 은 `00000000`, `00000010`, ...
- [ ] bytesPerRow = 4 → 행당 4 바이트, 매우 좁은 hex 컬럼. = 64 → 매우 넓은 컬럼, 가로 스크롤.
- [ ] groupSize=4, endian=big → `7F454C46 02010100 ...`, endian=little → `464C457F 00010102 ...`. ASCII 열은 두 경우 모두 **동일** (`.ELF......`).
- [ ] showAscii false → ASCII 컬럼 사라지고 hex 가 오른쪽까지 확장.
- [ ] showOffsetColumn false → 좌측 주소 사라짐.
- [ ] showOffsetHeader false → 상단 헤더 사라짐.
- [ ] highlightRanges `[{start: 0, end: 4, label: "magic"}]` → 첫 4 바이트가 노란 배경. hover 시 label 이 툴팁으로 (구현 여부는 v1 에서 선택).
- [ ] hover 로 hex 바이트 → ASCII 의 대응 셀도 강조 (linkHover=true). linkHover=false → ASCII 는 변함 없음.
- [ ] 드래그로 범위 선택 → hex + ASCII 양쪽 selectionBg. Cmd+C → 포맷에 따라 복사 (clipboard 확인).
- [ ] 선택 없이 Cmd+C → 아무 동작 안 함 (또는 브라우저 기본). 복사 버튼 클릭 → 전체 복사.
- [ ] `data={makeLargeData(1024)}` (1 MiB) → 스크롤이 부드럽고, DevTools Elements 에서 DOM 노드 수가 `visibleRows` 근방이어야 함 (가상화 확인).
- [ ] Light/Dark 테마 전환 → 색상 전부 바뀜.
- [ ] 키보드: Tab 으로 포커스 진입 → Arrow 키로 focused byte 이동 → outline 표시. Shift+Arrow → selection 확장. Cmd+A → 전체 선택.

### 11.3 엣지 케이스

- [ ] `data.length === 0` → 빈 상태 또는 "0 bytes" 정도의 placeholder. 크래시 없이 렌더.
- [ ] `data.length < bytesPerRow` → 행 1 개, 뒤쪽 hex/ASCII 셀은 공백으로 자리 유지.
- [ ] `data.length % bytesPerRow !== 0` → 마지막 행이 부분적으로 채워지고 나머지 셀은 공백.
- [ ] `groupSize > bytesPerRow` 또는 `bytesPerRow % groupSize !== 0` → dev 에서 `console.warn` + 가장 큰 약수로 fallback.
- [ ] `baseOffset` 이 커서 `offsetDigits` 자동 계산이 8 → 16 으로 넘어가는 경계.
- [ ] 매우 큰 `highlightRanges` 배열 (1000+): 성능 측면에서 O(n*ranges) 검색이 느려지면 interval tree 고려 (v1 은 단순 linear scan, 프로파일 후 결정).
- [ ] `data` 가 매 렌더마다 다른 `Uint8Array` 인스턴스일 때: `useMemo` 가 identity 로 판별하므로 불필요한 리렌더 발생. 문서에 "data 는 안정된 참조로 전달 권장" 명시.

---

## 12. 성능 목표

- `data.length` = 1 MiB (65,536 rows @ 16 bytes): 스크롤 60 fps, 초기 렌더 < 200 ms.
- `data.length` = 10 MiB: 스크롤 30+ fps, 초기 렌더 < 1 s.
- 10 MiB 초과는 "large file mode" 로 ASCII 컬럼을 lazy 렌더하는 등의 추가 최적화가 필요할 수 있음 (후속).

주요 병목 가설:
- **렌더 당 JSX 노드 수**: 행당 `bytesPerRow * 2` 개 내외 span. `bytesPerRow=64` + visible rows=30 → 약 3,840 span. 감당 가능.
- **hover 시 전체 리렌더**: 위 §6.3 참조 — DOM 직접 조작으로 회피.
- **selection 변경 시 리렌더**: 선택 범위에 해당하는 행만 변경되도록 `React.memo` + 얕은 prop 비교.

---

## 13. 알려진 트레이드오프 · 결정

1. **flat 컴포넌트 vs compound**: CodeView 처럼 flat 한 단일 컴포넌트로. 향후 "해석 패널" 등 확장이 필요하면 그때 compound (`HexView.Root` + `HexView.Canvas` + `HexView.Inspector`) 로 분해. 지금은 YAGNI.
2. **data 타입**: `Uint8Array` 를 권장 + `ArrayBuffer`/`number[]` 호환. Node `Buffer` 는 `Uint8Array` 를 상속하므로 자동 호환.
3. **offset 진법**: 10/2/8 진도 표시할 수 있겠으나, v1 은 **16진 고정**. `offsetDigits` 로 자리수만 조절.
4. **alternating row 기준**: 행 단위 (`rowIndex % 2`), 그룹 단위가 아니다 — 가독성 기준. CodeView 와 동일.
5. **선택 모델**: 연속 범위만. 다중 선택(Ctrl+Click)은 v1 제외.
6. **복사 포맷 기본값**: `"hex"` — hexdump 가 하는 동작과 일치.
7. **endian 이 ASCII 에 영향 없음**: ASCII 는 스트림 의미(텍스트) 이므로 endian 무관. 메모리 상 레이아웃과 텍스트 렌더링은 분리.
8. **폰트**: 시스템 기본 monospace 사용 (`ui-monospace, Cascadia Code, Menlo, monospace`). CodeView 의 bundled PlasticMono 는 hex 에는 overkill — 불러오지 않음.
9. **테마 전환**: theme prop. dark 모드 자동 감지(prefers-color-scheme) 는 하지 않음 — 호출자 책임.
10. **nonPrintable 기본**: `"dot"`. hexdump 관례와 일치.

---

## 14. 후속 작업 (v1.1 이상)

- `HexView.findByteSequence(needle: Uint8Array): number[]` 검색 + hit 하이라이트 + 점프.
- 오프셋 입력 점프 (`Cmd+G` → "offset: 0x..." 프롬프트).
- Diff 모드 (`<HexView data={a} diffAgainst={b} />`).
- 해석 패널: 선택된 바이트를 `int8/uint16/int32/float32/float64/utf8` 등으로 디코드하여 사이드에 표시.
- 편집 모드 (바이트 쓰기 + dirty diff + undo/redo).
- 커서 position 보존 ruler (상단에 빨간 세로선 등).
- URL/Hash 연동 (offset 공유).
- Export: "Save as .bin", "Save as .hex (Intel HEX)".
- 접근성 개선 (개별 셀 ARIA label, 스크린리더 네비게이션).

---

## 15. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| theme 토큰 패턴 | `src/components/CodeView/CodeView.tsx` (line 18-41) |
| 행 렌더 구조 | `src/components/CodeView/CodeView.tsx` (line 484-519) |
| copy 버튼 레이아웃 | `src/components/CodeView/CodeView.tsx` (line 426-450) |
| onCopy 커스텀 | `src/components/CodeView/CodeView.tsx` (line 353-393) |
| useControllable (controlled selection) | `src/components/_shared/useControllable.ts` |
| 가상 스크롤 훅 레퍼런스 | `src/components/DataTable/useVirtualList.ts` |
| 데모 페이지 레이아웃 패턴 | `demo/src/pages/CodeViewPage.tsx` |
| 데모 App 라우팅 | `demo/src/App.tsx` (line 14, 128-140, 381-389) |
| tsconfig 제약 | `tsconfig.json` (strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess, verbatimModuleSyntax) |

---

## 16. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/hexview` 라우트 동작.
- [ ] §11.2 체크리스트 항목 전부 눈으로 확인.
- [ ] CodeView / Dialog / Tooltip 등 다른 페이지 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 export 추가됨.
- [ ] Props 문서 섹션이 Props 표로 채워져 있음.

---

**끝.**
