# CodeView 개선/고도화 계획

## Context

데모 페이지에서 CodeView를 조작하면서 발견된 3건의 시각적/동작 결함을 해결하고, 이 과정에서 드러난 구조적 이원화(읽기 vs 편집 모드)를 통합해 "rich CodeView"의 기반을 다진다.

리포트된 증상:
1. editable 토글 시 gutter 컬럼이 텍스트 영역을 침범해 보인다.
2. 니모닉 칩("NUL", "ESC" 등)이 좌·우 이웃 문자와 겹쳐서 렌더링된다.
3. `showInvisibles=true` 상태에서 텍스트를 드래그해 선택하면 대체 문자(칩·점·화살표)에는 하이라이트가 적용되지 않고, 복사 시에도 "NUL" 같은 니모닉 텍스트가 클립보드로 들어간다.

원인 분석 결과:
- **Bug 1**: `CodeView.tsx:457`의 alternating-row 오버레이 `left` 계산식이 `gutterGap`을 2번 더함(`calc(gutterWidth + gutterGap + gutterGap)`). 또한 편집 모드 gutter는 `position: sticky + backgroundColor + zIndex:1`로 렌더되어, 가로 스크롤 시 코드가 gutter 밑으로 미끄러져 들어가는 시각 효과가 발생. 추가로 editable은 `width`(고정), read는 `minWidth`(탄력) 사용해 대용량 라인 번호에서 거동이 다름.
- **Bug 2**: `CodeView.invisibles.tsx`의 `CHIP_OUTER_STYLE`이 `width:1ch`인데 내부 라벨은 absolute + transform으로 중앙 정렬된 ~1.8ch 폭의 텍스트. 외곽이 1ch만 예약하므로 내부 라벨이 좌우로 각각 약 0.4ch씩 물리적으로 overflow하여 이웃 문자와 겹침.
- **Bug 3**: tab(`→`)·space(`·`) 스팬에 `userSelect: "none"`이 걸려 있어 선택 불가. 니모닉 칩은 외곽이 1ch밖에 되지 않아 선택 사각형이 1ch 폭만 그려지고 실제 라벨은 그 밖으로 튀어나와 하이라이트가 안 된 것처럼 보임. 그리고 `onCopy` 핸들러가 없어 브라우저 기본 복사 로직이 가시 텍스트("NUL")를 그대로 직렬화함. `data-char` 속성은 이미 read/edit 양쪽 모드 모두에 부여되어 있으므로, 이를 이용한 커스텀 직렬화가 가능함.

종합 관찰: 읽기 모드와 편집 모드가 서로 다른 DOM 구조(read=per-line flex div, editable=single gutter column + flat pre with Fragment+"\n")를 쓰기 때문에 같은 개선을 두 경로에서 이중으로 적용해야 하고, Bug 1의 오버레이 수학은 구조 차이에서 파생된 부수 코드다. 두 모드를 동일 DOM 구조로 통일하면 오버레이·복사·칩 로직을 단일 경로로 처리할 수 있다.

---

## 설계 개요

**한 줄 요약**: 읽기/편집 모드를 동일한 "flex 컨테이너 → gutter 컬럼 + pre(라인별 div)" 구조로 통일하고, 칩을 자연 폭 단일 span으로 재설계하며, 커스텀 `onCopy`로 대체 문자를 원본 문자로 역변환한다.

### 1. 렌더 구조 통일

양 모드 모두 다음 구조로 렌더한다.

```
<div class="flex" onCopy={handleCopy}>
  (copy 버튼)
  {showLineNumbers && <div data-gutter="true" style="user-select:none; min-width: gutterWidth; padding-right: gutterGap; flex-shrink:0;">
    {lines.map(i => <div>{i+1}</div>)}
  </div>}
  <pre
    {...(editable ? { contentEditable, onInput, onKeyDown, onPaste, onCompositionStart/End, ref } : {})}
    style="flex:1; margin:0; padding:0; white-space:(pre|pre-wrap); tab-size; overflow:visible;"
  >
    {tokens.map((line, li) => (
      <div key={li} data-line-row="true" style={{ backgroundColor: rowBg(li) }}>
        {line.map((t, ti) => <span {...tokenProps}>...</span>)}
      </div>
    ))}
  </pre>
</div>
```

핵심 변경점:
- **per-line `<div data-line-row="true">`** 를 편집 모드에도 도입. `\n`을 DOM 텍스트 노드로 두지 않고 블록 레벨 개행으로 표현.
- **gutter는 단일 컬럼 `<div data-gutter="true">`**. read 모드의 per-line gutter span을 제거하고 editable의 통합 구조를 따른다. `position: sticky` 와 `backgroundColor`는 **제거**하여 read/edit 거동 통일. (가로 스크롤 시 번호 고정은 별도 향후 enhancement로 prop 토글 가능.)
- **Alternating row / highlightLines 오버레이 제거**. 각 `data-line-row` div에 `backgroundColor`를 직접 부여하여 측정 기반 오버레이(`lineHeightPx`)와 `useLayoutEffect`의 `ResizeObserver`를 전면 삭제. Bug 1의 `+ gutterGap` 중복 계산식이 자연스럽게 사라진다.
- Gutter 폭은 `minWidth: resolvedGutterWidth` 로 통일(편집 모드 `width` 고정 대신). 10k 라인 이상도 안전.

### 2. 니모닉 칩 재설계

`CodeView.invisibles.tsx`의 칩 렌더를 단일 span으로 단순화.

```tsx
<span
  title={`U+${hex} ${mnemonic}`}
  aria-label={mnemonic}
  data-char={char}
  {...atomicProps}
  style={{
    display: "inline-block",
    padding: "0 3px",
    margin: "0 1px",
    borderRadius: "3px",
    fontSize: "0.6em",
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: "0.03em",
    verticalAlign: "middle",
    background: chipColors.background,
    color: chipColors.color,
    whiteSpace: "nowrap",
  }}
>
  {mnemonic}
</span>
```

- `width: 1ch` 외곽 + absolute 내부 2-span 구조 제거. 칩은 자연 폭(약 2–3ch)을 가진다.
- 결과적으로 해당 제어 문자 1개가 컬럼 정렬에서 1 char보다 넓게 자리를 차지한다. VSCode/Monaco와 동일한 절충(가독성 우선).
- `data-char` 속성 + `contentEditable=false` (atomic 모드) 는 그대로 유지 → 커서 원자성/copy 로직 동작 보존.
- `CHIP_OUTER_STYLE` / `CHIP_BASE_STYLE` 상수는 단일 `CHIP_STYLE`로 통합.

### 3. Selection 하이라이트 + 원본 문자 Copy

**`CodeView.invisibles.tsx`**:
- tab/space 스팬의 `userSelect: "none"` 제거(라인 222, 240 부근). 선택은 허용하되, 클립보드 직렬화는 `onCopy`에서 `data-char` 기반으로 치환.
- 단, gutter 번호가 트리플클릭 등에 포함되지 않도록 gutter `<div>` 쪽에는 `userSelect: "none"` 유지.

**`CodeView.tsx`**:
1. `walkEffectiveNodes`를 확장: `data-gutter` 속성이 붙은 서브트리는 walker가 skip. 반환 항목에 `lineRow: Element | null` (가장 가까운 `data-line-row` 조상) 동봉.
2. 신규 `handleCopy(e: ClipboardEvent)`:
   - `window.getSelection()` 의 Range로 시작/끝 effective 오프셋을 구한다.
   - walker 결과를 순회하면서: (a) effective node가 selection range 안에 있는지 판정, (b) `lineRow`가 직전 노드와 달라지면 출력 버퍼에 `"\n"` 삽입, (c) 텍스트 노드는 selection 교집합을 slice, 칩은 `data-char` 값을 그대로 push.
   - 결과 문자열을 `e.clipboardData!.setData("text/plain", out); e.preventDefault();`.
   - 편집 모드/읽기 모드 공통 동일 로직. 루트 컨테이너(`containerRef.current`)에 `onCopy`를 부착한다.
3. 기존 `handleCopy`(복사 버튼 클릭용)는 `navigator.clipboard.writeText(displayCode)` 그대로 유지하고 이름만 `handleCopyAll`로 변경해 `onCopy` 이벤트 핸들러와 구분.

**Safari 보정**: `domPosToOffset`에서 `container` 가 `contentEditable=false` 칩 내부인 경우(칩 안쪽에 endpoint가 떨어지는 Safari 버그) 칩 바로 앞/뒤 경계로 클램프. 기존 구현에 보강 블록 추가.

### 4. 부수 정리

- `lineHeightPx` state / `ResizeObserver` / 오버레이 DOM 완전 삭제.
- Editable 모드 `<pre>`의 `<Fragment>` + `"\n"` 구조는 `<div data-line-row>`로 치환. `handleKeyDown`의 Enter 처리에서 `document.execCommand("insertText", false, "\n" + indent)`는 유지(브라우저가 현재 라인 div 안에서 새 블록을 만들기 시작하므로, `extractCodeFromPre` 가 `data-line-row` 경계를 `\n`으로 조인하도록 동시에 조정 — 아래 5 참고).
- `extractCodeFromPre`: `data-line-row` 경계 인식해 자동으로 `\n` 삽입하는 형태로 재작성. 기존 `.replace(/\r\n|\r/g, "\n")` 정규화는 유지.

### 5. `extractCodeFromPre` / walker 공유

- walker를 `walkEffectiveNodes(root, { skipSelector?: string })` 형태로 일반화.
- `extractCodeFromPre(pre)`: `walkEffectiveNodes(pre)` 결과를 순회하며 `lineRow` 변화 지점에 `\n` 삽입. 기존 로직 호환.
- `handleCopy`: 동일 walker 사용, selection 필터링 + lineRow 경계 `\n` 삽입. 단일 구현.

---

## 수정 대상 파일 및 함수

### `src/components/CodeView/CodeView.tsx`
- `walkEffectiveNodes` (L55-80): `data-gutter` skip, `lineRow` 병기.
- `domPosToOffset` (L88-113): Safari 칩 내부 endpoint 클램프 보강.
- `offsetToDomPos` (L120-151): 변경 없음 (라인 경계는 `data-line-row` 첫 텍스트 노드 시작 offset으로 자연스럽게 매핑).
- `extractCodeFromPre` (L158-168): `lineRow` 기반 `\n` 삽입으로 재작성.
- `handleCopy` 함수명을 `handleCopyAll`로 리네임(L350-355). 새로운 `handleCopy(e)` 이벤트 핸들러 추가(selection 기반).
- `useLayoutEffect` / `lineHeightPx` state 삭제(L191, L202-212).
- 렌더 JSX 전면 재작성:
  - 편집/읽기 공통 래퍼(L358-614).
  - gutter 단일 컬럼화 (sticky 제거).
  - Alternating-row 오버레이(L451-487) 제거, `data-line-row` div의 `backgroundColor`로 대체.
  - Editable `<pre>` (L490-536)과 Read `<pre>` (L550-608) 통합. 차이는 contentEditable 속성과 이벤트 바인딩만.
- 루트 컨테이너에 `onCopy={handleCopy}` 바인딩.

### `src/components/CodeView/CodeView.invisibles.tsx`
- `CHIP_OUTER_STYLE` / `CHIP_BASE_STYLE` (L150-174) → 단일 `CHIP_STYLE`로 통합.
- 니모닉 칩 JSX (L251-271): 단일 span 구조로 재작성.
- tab 스팬(L210-227): `userSelect: "none"` 제거.
- space 스팬(L228-244): `userSelect: "none"` 제거.

### `demo/src/pages/CodeViewPage.tsx`
- 변경 없음. Props 변화 없음.

---

## 미리 결정한 트레이드오프

| 결정 | 대안 | 선택 이유 |
|------|------|-----------|
| Gutter `position: sticky` 제거 | 유지 후 backgroundColor 투명화 | read/editable 거동 일치 우선. 가로 스크롤 시 gutter 고정은 후속 prop `stickyGutter` 로 분리. |
| 칩 폭 1ch 포기, 자연 폭 사용 | 라벨 크기를 1ch에 맞추거나 라벨을 1글자로 축약 | "NUL" 가독성 + 이웃 문자 겹침 방지가 열 정렬 손실보다 중요. Monaco와 동일. |
| Alternating/highlight bg를 per-line div로 이동 | 오버레이 수학 수정만 | 오버레이는 라인 높이 측정·ResizeObserver 의존으로 잠재 버그 다수. 구조 정합성 확보. |
| 편집/읽기 모드 렌더 통합 | 버그 부분만 수정 | 복사/칩/오버레이 로직의 이중 구현 영구 해소. 후속 기능(선택 하이라이트 확장, 접근성) 추가 비용 절감. |

---

## 추가 권고 (별도 PR로 분리 가능)

rich-CodeView로 완성도를 높이기 위해 다음 항목을 제안한다. 이번 PR 범위 밖이며, 각 항목별 별개 이슈/PR을 권장.

1. **접근성**: 편집 모드 `<pre>`에 `role="textbox"`, `aria-multiline="true"`, `aria-label` prop 도입.
2. **읽기 모드 선택 UX**: 라인 번호 gutter를 클릭하면 해당 라인 전체 선택, 드래그로 multi-line 선택(gutter 영역은 `user-select:none` 유지 + 직접 Range 구성).
3. **수평 스크롤 시 sticky gutter 옵션**: `stickyGutter?: boolean` prop.
4. **Undo/Redo**: contenteditable 기본 undo는 DOM 기반이라 chip/토큰 교체 시 불안정. `history: string[]` 상태로 확정 편집 시점 스냅샷 저장.
5. **Bracket auto-close / 자동 들여쓰기 개선**.
6. **Firefox contenteditable 엣지 케이스 테스트 스위트**.
7. **LF/CRLF 시각화 옵션**: 현재 `\n`은 chip으로 렌더하지 않음. prop `showLineEndings` 으로 `¶` 표시.

---

## 검증 방법 (End-to-end)

실행:
```bash
cd /Users/neo/workspace/plastic
npm run dev   # 또는 pnpm dev
```

1. **Gutter parity**: 데모 페이지에서 editable 토글을 on/off 하며 gutter 폭·정렬·라인 번호 위치가 변하지 않는지 확인. 100줄+ 코드에서 라인 번호 클리핑 없음 확인.
2. **Alternating rows**: `showAlternatingRows=true` 상태로 edit/read 전환 시 얼룩말 패턴이 gutter 직후부터 시작하는지(기존 1rem 공백 버그 해소) 확인.
3. **Chip rendering**: `showInvisibles=true` 상태에서 제어 문자가 포함된 테스트 코드(e.g., `"a\u0000b\u001Bc"`) 삽입. 칩이 좌우 글자와 겹치지 않는지 확인.
4. **Selection highlight**: 위 코드에서 전체 선택 시 tab 화살표, space 점, 니모닉 칩 모두 선택 하이라이트가 보이는지 확인.
5. **Copy 정합성**: 위 선택 상태에서 `Cmd+C`/`Ctrl+C` → 외부 텍스트 에디터에 붙여넣어 원본 문자(`\u0000`, `\u001B`, `\t`, 공백)가 복사되는지 확인.
6. **Cross-line copy (read 모드)**: 여러 줄 드래그 → 클립보드에 `\n` 경계가 포함되는지 확인. Gutter 번호 ("1", "2", ...)가 클립보드에 포함되지 않는지 확인.
7. **Cross-line copy (edit 모드)**: 동일 시나리오.
8. **IME (한글 조합)**: editable 모드에서 한글 입력 → 조합 중 선택/복사 이벤트 발생 안 함을 확인. 조합 완료 후 정상 반영.
9. **Tab/Enter 편집**: Tab/Shift+Tab, Enter 시 커서가 올바른 위치로 복원되는지 확인(기존 거동 회귀 방지).
10. **TypeScript/lint**: `npm run typecheck && npm run lint` 통과.
11. **브라우저 매트릭스**: Chrome, Safari, Firefox에서 항목 3–7 재확인. Safari에서 칩 내부 클릭 시 커서가 칩 앞/뒤로 정상 배치되는지 특히 확인.

---

## 구현 순서 제안

1. 칩 JSX 단일화 + `userSelect:none` 제거 (invisibles.tsx) — 단위 작은 변경, 즉시 Bug 2 + Bug 3 일부 해소.
2. `walkEffectiveNodes` 확장 (data-gutter skip, lineRow 동봉).
3. 렌더 구조 통일 + 오버레이 제거.
4. `extractCodeFromPre` 재작성 + 회귀 테스트.
5. `onCopy` 핸들러 구현.
6. 브라우저 수동 테스트.
