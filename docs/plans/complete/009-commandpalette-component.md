# CommandPalette 컴포넌트 설계문서

## Context

plastic 라이브러리에 6번째 컴포넌트 `CommandPalette`를 추가한다.
모달 형태의 검색/명령 인터페이스로, VS Code의 Cmd+K, Raycast, Linear의 커맨드 메뉴와 유사하다.
키보드 단축키로 열고, 텍스트 입력으로 퍼지 검색하며, 화살표 키로 탐색, Enter로 실행한다.
중첩(nested) 명령, 최근/고정 항목, 비동기 검색, 가상 스크롤을 지원한다.

기존 라이브러리 패턴을 따른다:
- Compound component: `Object.assign(Root, { Sub1, Sub2, ... })`
- 타입: `exactOptionalPropertyTypes: true`, `verbatimModuleSyntax: true`
- 스타일링: 인라인 스타일 + Tailwind 클래스 (외부 CSS 없음)
- 테마: `"light" | "dark"` with `Record<Theme, ...>` 색상 맵
- Controlled/Uncontrolled: `useControllable` 훅 (`src/components/_shared/useControllable.ts`)
- 폴더 구조: `ComponentName/` 하위 `.types.ts`, `Root.tsx`, 서브 컴포넌트, `ComponentName.tsx` (조립), `index.ts` (배럴)

---

## Compound Component 구조

```
CommandPalette.Root          모달 컨테이너, open/close 상태, 키보드 단축키 리스너
CommandPalette.Input         검색 입력 필드 (돋보기 아이콘 포함)
CommandPalette.List          스크롤 가능한 결과 목록 (가상 스크롤)
CommandPalette.Group         그룹 레이블 + 해당 그룹 항목들
CommandPalette.Item          개별 명령/결과 항목
CommandPalette.Empty         검색 결과 없을 때 표시
CommandPalette.Loading       비동기 검색 중 표시
CommandPalette.Footer        키보드 힌트 / 상태 바
```

### 사용 패턴

#### 기본 사용

```tsx
import { CommandPalette } from "plastic";
import type { CommandItem } from "plastic";

const commands: CommandItem[] = [
  {
    id: "new-file",
    label: "New File",
    description: "Create a new file",
    icon: <FileIcon />,
    shortcut: ["Cmd", "N"],
    group: "File",
    keywords: ["create", "add"],
    onSelect: () => createNewFile(),
  },
  {
    id: "open-settings",
    label: "Open Settings",
    description: "Open application settings",
    icon: <SettingsIcon />,
    shortcut: ["Cmd", ","],
    group: "Application",
    onSelect: () => openSettings(),
  },
];

function App() {
  return (
    <CommandPalette.Root items={commands}>
      <CommandPalette.Input placeholder="Type a command..." />
      <CommandPalette.List>
        <CommandPalette.Empty>No results found.</CommandPalette.Empty>
        <CommandPalette.Loading>Searching...</CommandPalette.Loading>
      </CommandPalette.List>
      <CommandPalette.Footer />
    </CommandPalette.Root>
  );
}
```

#### 그룹 사용

```tsx
<CommandPalette.Root items={commands}>
  <CommandPalette.Input placeholder="Search commands..." />
  <CommandPalette.List>
    <CommandPalette.Group heading="File">
      <CommandPalette.Item id="new-file" />
      <CommandPalette.Item id="open-file" />
    </CommandPalette.Group>
    <CommandPalette.Group heading="Edit">
      <CommandPalette.Item id="undo" />
      <CommandPalette.Item id="redo" />
    </CommandPalette.Group>
    <CommandPalette.Empty>No results found.</CommandPalette.Empty>
  </CommandPalette.List>
  <CommandPalette.Footer />
</CommandPalette.Root>
```

#### 비동기 검색

```tsx
<CommandPalette.Root
  onSearch={async (query) => {
    const results = await fetchCommands(query);
    return results;
  }}
  searchDebounce={300}
>
  <CommandPalette.Input placeholder="Search..." />
  <CommandPalette.List>
    <CommandPalette.Loading>
      <Spinner /> Searching...
    </CommandPalette.Loading>
    <CommandPalette.Empty>No results found.</CommandPalette.Empty>
  </CommandPalette.List>
  <CommandPalette.Footer />
</CommandPalette.Root>
```

#### 중첩 명령

```tsx
const commands: CommandItem[] = [
  {
    id: "theme",
    label: "Change Theme",
    icon: <PaletteIcon />,
    onSelect: () => {},  // 자식이 있으면 onSelect 대신 하위 메뉴 진입
    children: [
      { id: "theme-light", label: "Light", onSelect: () => setTheme("light") },
      { id: "theme-dark", label: "Dark", onSelect: () => setTheme("dark") },
      { id: "theme-system", label: "System", onSelect: () => setTheme("system") },
    ],
  },
];

<CommandPalette.Root items={commands}>
  <CommandPalette.Input placeholder="Type a command..." />
  <CommandPalette.List>
    <CommandPalette.Empty>No results found.</CommandPalette.Empty>
  </CommandPalette.List>
  <CommandPalette.Footer />
</CommandPalette.Root>
```

#### 최근/고정 항목

```tsx
<CommandPalette.Root
  items={commands}
  recentItems={recentCommands}
  pinnedItems={pinnedCommands}
>
  <CommandPalette.Input placeholder="Type a command..." />
  <CommandPalette.List>
    <CommandPalette.Empty>No results found.</CommandPalette.Empty>
  </CommandPalette.List>
  <CommandPalette.Footer />
</CommandPalette.Root>
```

#### 커스텀 트리거 (Cmd+K 외)

```tsx
const [open, setOpen] = useState(false);

<CommandPalette.Root
  items={commands}
  open={open}
  onOpenChange={setOpen}
  shortcut={["Ctrl", "P"]}  // 커스텀 단축키
>
  <CommandPalette.Input />
  <CommandPalette.List />
  <CommandPalette.Footer />
</CommandPalette.Root>

<button onClick={() => setOpen(true)}>Open Command Palette</button>
```

---

## TypeScript 인터페이스

### 테마 타입

```typescript
export type CommandPaletteTheme = "light" | "dark";
```

### 명령 아이템

```typescript
export interface CommandItem {
  /** 고유 식별자 */
  id: string;
  /** 표시 레이블 */
  label: string;
  /** 부가 설명 텍스트 */
  description?: string | undefined;
  /** 아이콘 ReactNode */
  icon?: ReactNode | undefined;
  /** 단축키 표시 (각 키를 배열로). 예: ["Cmd", "K"] → 칩으로 렌더 */
  shortcut?: string[] | undefined;
  /** 그룹명. 같은 group 값을 가진 아이템끼리 그룹핑 */
  group?: string | undefined;
  /** 추가 검색 키워드 (label, description 외) */
  keywords?: string[] | undefined;
  /** 선택 시 실행 콜백 */
  onSelect: () => void;
  /** 비활성 여부 */
  disabled?: boolean | undefined;
  /** 중첩 하위 명령 */
  children?: CommandItem[] | undefined;
}
```

### 퍼지 매칭 결과

```typescript
export interface FuzzyMatchResult {
  /** 매칭된 아이템 */
  item: CommandItem;
  /** 매칭 점수 (높을수록 좋음). 0이면 매칭 안 됨 */
  score: number;
  /** label 내 매칭된 문자 인덱스 배열 */
  labelMatches: number[];
  /** description 내 매칭된 문자 인덱스 배열 */
  descriptionMatches: number[];
}
```

### Root Props

```typescript
export interface CommandPaletteRootProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;

  // ── 아이템 ────────────────────────────────────
  /** 전체 명령 목록. onSearch 사용 시 생략 가능 */
  items?: CommandItem[] | undefined;
  /** 입력 비어있을 때 표시할 최근 아이템 */
  recentItems?: CommandItem[] | undefined;
  /** 항상 상단에 고정 표시할 아이템 */
  pinnedItems?: CommandItem[] | undefined;

  // ── Open/Close ────────────────────────────────
  /** 제어 모드: 열림 상태 */
  open?: boolean | undefined;
  /** 제어 모드: 열림 상태 변경 콜백 */
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** 기본 열림 상태 (비제어 모드) */
  defaultOpen?: boolean | undefined;

  // ── 검색 ──────────────────────────────────────
  /** 커스텀 필터 함수. 내장 퍼지 매칭 대신 사용 */
  filter?: ((query: string, items: CommandItem[]) => CommandItem[]) | undefined;
  /** 비동기 검색 함수. 설정 시 items 무시하고 이 함수의 반환값 사용 */
  onSearch?: ((query: string) => Promise<CommandItem[]>) | undefined;
  /** 비동기 검색 디바운스 (ms). 기본 300ms */
  searchDebounce?: number | undefined;
  /** 최대 표시 결과 수. 기본 50 */
  maxResults?: number | undefined;

  // ── 키보드 단축키 ─────────────────────────────
  /** 팔레트 열기 단축키. 기본 ["Cmd", "K"] (Mac) / ["Ctrl", "K"] (Win/Linux) */
  shortcut?: string[] | undefined;

  // ── 테마 ──────────────────────────────────────
  /** 테마. 기본 "light" */
  theme?: CommandPaletteTheme | undefined;

  // ── 콜백 ──────────────────────────────────────
  /** 아이템 선택 시 호출 (아이템의 onSelect와 별도로 호출됨) */
  onSelect?: ((item: CommandItem) => void) | undefined;
}
```

### Input Props

```typescript
export interface CommandPaletteInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** 플레이스홀더. 기본 "Type a command or search..." */
  placeholder?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### List Props

```typescript
export interface CommandPaletteListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Group Props

```typescript
export interface CommandPaletteGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** 그룹 헤더 레이블 */
  heading: string;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Item Props

```typescript
export interface CommandPaletteItemProps extends HTMLAttributes<HTMLDivElement> {
  /** items 배열 내 아이템 id로 참조. 또는 직접 렌더링용 */
  id?: string | undefined;
  /** 직접 렌더링 시 사용 */
  item?: CommandItem | undefined;
  /** 선택 시 추가 콜백 */
  onSelect?: (() => void) | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Empty Props

```typescript
export interface CommandPaletteEmptyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Loading Props

```typescript
export interface CommandPaletteLoadingProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Footer Props

```typescript
export interface CommandPaletteFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  /** 기본 키보드 힌트 표시 여부. 기본 true */
  showKeyboardHints?: boolean | undefined;
}
```

---

## 퍼지 매칭 알고리즘

외부 라이브러리(fuse.js 등)를 사용하지 않고 자체 구현한다. 문자 단위 순서 매칭(substring이 아닌 subsequence)이며, 점수 기반으로 결과를 정렬한다.

### 핵심 원리

1. 쿼리의 각 문자가 대상 문자열에 순서대로 존재해야 매칭 성공
2. 점수는 매칭 품질을 반영: 연속 매칭, 단어 시작 매칭, 문자열 시작 매칭에 가산점
3. label, description, keywords 모두 검색하되 label 매칭에 가중치

### 점수 체계 상수

```typescript
/** 퍼지 매칭 점수 가중치 상수 */
const SCORE = {
  /** 연속된 문자 매칭 보너스 (이전 매칭 바로 다음 위치) */
  SEQUENTIAL: 15,
  /** 구분자(공백, -, _, /) 다음 문자 매칭 보너스 */
  SEPARATOR_BONUS: 10,
  /** camelCase 대문자 시작 매칭 보너스 */
  CAMEL_BONUS: 10,
  /** 문자열 첫 문자 매칭 보너스 */
  FIRST_LETTER_BONUS: 8,
  /** 기본 문자 매칭 점수 */
  MATCH: 1,
  /** 매칭되지 않은 문자 페널티 (건너뛴 문자당) */
  GAP_PENALTY: -1,
  /** 첫 매칭 전 건너뛴 문자 페널티 (더 강함) */
  LEADING_GAP_PENALTY: -3,
  /** label 매칭 가중치 배수 */
  LABEL_WEIGHT: 2.0,
  /** description 매칭 가중치 배수 */
  DESCRIPTION_WEIGHT: 1.0,
  /** keywords 매칭 가중치 배수 */
  KEYWORDS_WEIGHT: 0.8,
} as const;
```

### 단일 문자열 퍼지 매칭 함수

```typescript
/**
 * 단일 문자열에 대해 퍼지 매칭을 수행한다.
 * 쿼리의 모든 문자가 대상 문자열에 순서대로 존재해야 매칭 성공.
 *
 * @returns [score, matchedIndices] 또는 매칭 실패 시 null
 */
function fuzzyMatch(query: string, target: string): [number, number[]] | null {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  const queryLen = queryLower.length;
  const targetLen = targetLower.length;

  if (queryLen === 0) return [0, []];
  if (queryLen > targetLen) return null;

  // --- Phase 1: 매칭 가능 여부 빠른 확인 ---
  // 쿼리의 각 문자가 순서대로 존재하는지 선형 스캔
  let qi = 0;
  for (let ti = 0; ti < targetLen && qi < queryLen; ti++) {
    if (queryLower[qi] === targetLower[ti]) qi++;
  }
  if (qi !== queryLen) return null; // 매칭 불가

  // --- Phase 2: 최적 매칭 위치 탐색 (재귀 + 메모이제이션) ---
  // 여러 매칭 경로 중 최고 점수를 찾는다
  const memo = new Map<string, [number, number[]] | null>();

  function search(qi: number, ti: number, prevMatchIdx: number): [number, number[]] | null {
    const key = `${qi},${ti}`;
    if (memo.has(key)) return memo.get(key)!;

    if (qi === queryLen) {
      memo.set(key, [0, []]);
      return [0, []];
    }
    if (ti === targetLen) {
      memo.set(key, null);
      return null;
    }

    let bestResult: [number, number[]] | null = null;

    for (let i = ti; i < targetLen; i++) {
      if (queryLower[qi] !== targetLower[i]) continue;

      const sub = search(qi + 1, i + 1, i);
      if (sub === null) continue;

      let score = SCORE.MATCH;

      // --- 연속 매칭 보너스 ---
      if (prevMatchIdx !== -1 && i === prevMatchIdx + 1) {
        score += SCORE.SEQUENTIAL;
      }

      // --- 단어 시작 보너스 ---
      if (i === 0) {
        // 문자열 첫 문자
        score += SCORE.FIRST_LETTER_BONUS;
      } else {
        const prev = target[i - 1]!;
        // 구분자 다음 문자
        if (prev === " " || prev === "-" || prev === "_" || prev === "/" || prev === ".") {
          score += SCORE.SEPARATOR_BONUS;
        }
        // camelCase 경계
        else if (
          prev === prev.toLowerCase() &&
          target[i] === target[i]!.toUpperCase() &&
          target[i] !== target[i]!.toLowerCase()
        ) {
          score += SCORE.CAMEL_BONUS;
        }
      }

      // --- 갭 페널티 ---
      const gap = i - (prevMatchIdx === -1 ? 0 : prevMatchIdx + 1);
      if (gap > 0) {
        if (prevMatchIdx === -1) {
          // 첫 매칭 전 갭 (leading gap)
          score += gap * SCORE.LEADING_GAP_PENALTY;
        } else {
          score += gap * SCORE.GAP_PENALTY;
        }
      }

      const totalScore = score + sub[0];
      if (bestResult === null || totalScore > bestResult[0]) {
        bestResult = [totalScore, [i, ...sub[1]]];
      }
    }

    memo.set(key, bestResult);
    return bestResult;
  }

  return search(0, 0, -1);
}
```

### 성능 최적화: 비재귀 2-pass 알고리즘

위 재귀 버전은 이해를 위한 것이다. 실제 구현에서는 아이템이 수백 개일 때 성능을 위해 2-pass 방식을 사용한다.

```typescript
/**
 * 성능 최적화된 2-pass 퍼지 매칭.
 * Pass 1: 앞에서부터 greedy 매칭으로 가능 여부와 기본 위치 확보
 * Pass 2: 뒤에서부터 역방향으로 매칭 위치를 조정하여 최적화
 */
function fuzzyMatchOptimized(query: string, target: string): [number, number[]] | null {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  const qLen = queryLower.length;
  const tLen = targetLower.length;

  if (qLen === 0) return [0, []];
  if (qLen > tLen) return null;

  // --- Pass 1: Forward greedy ---
  const forwardMatches: number[] = [];
  let qi = 0;
  for (let ti = 0; ti < tLen && qi < qLen; ti++) {
    if (queryLower[qi] === targetLower[ti]) {
      forwardMatches.push(ti);
      qi++;
    }
  }
  if (qi !== qLen) return null;

  // --- Pass 2: Backward adjustment ---
  // 마지막 매칭 위치부터 역방향으로 탐색하여 더 좋은 위치 탐색
  const matches: number[] = new Array(qLen);
  qi = qLen - 1;
  let ti = forwardMatches[qLen - 1]!;
  matches[qi] = ti;

  for (qi = qLen - 2; qi >= 0; qi--) {
    ti = matches[qi + 1]! - 1;
    // 이전 매칭 위치(forward)까지 역방향 탐색
    const minPos = forwardMatches[qi]!;
    let bestPos = forwardMatches[qi]!;
    for (let j = ti; j >= minPos; j--) {
      if (queryLower[qi] === targetLower[j]) {
        bestPos = j;
        // 연속 매칭이면 바로 채택
        if (j + 1 === matches[qi + 1]) break;
      }
    }
    matches[qi] = bestPos;
  }

  // --- 점수 계산 ---
  let score = 0;
  for (let i = 0; i < qLen; i++) {
    const idx = matches[i]!;
    score += SCORE.MATCH;

    // 연속 매칭 보너스
    if (i > 0 && idx === matches[i - 1]! + 1) {
      score += SCORE.SEQUENTIAL;
    }

    // 단어 시작/camelCase 보너스
    if (idx === 0) {
      score += SCORE.FIRST_LETTER_BONUS;
    } else {
      const prev = target[idx - 1]!;
      if (prev === " " || prev === "-" || prev === "_" || prev === "/" || prev === ".") {
        score += SCORE.SEPARATOR_BONUS;
      } else if (
        prev === prev.toLowerCase() &&
        target[idx] === target[idx]!.toUpperCase() &&
        target[idx] !== target[idx]!.toLowerCase()
      ) {
        score += SCORE.CAMEL_BONUS;
      }
    }

    // 갭 페널티
    const prevEnd = i === 0 ? 0 : matches[i - 1]! + 1;
    const gap = idx - prevEnd;
    if (gap > 0) {
      score += gap * (i === 0 ? SCORE.LEADING_GAP_PENALTY : SCORE.GAP_PENALTY);
    }
  }

  return [score, matches];
}
```

### CommandItem 전체 매칭 함수

```typescript
/**
 * CommandItem 하나에 대해 쿼리를 label, description, keywords 순서로 매칭한다.
 * 가장 높은 가중 점수를 최종 점수로 사용한다.
 */
function scoreItem(query: string, item: CommandItem): FuzzyMatchResult | null {
  if (item.disabled) return null;

  let bestScore = 0;
  let labelMatches: number[] = [];
  let descriptionMatches: number[] = [];

  // 1. label 매칭
  const labelResult = fuzzyMatchOptimized(query, item.label);
  if (labelResult !== null) {
    const weighted = labelResult[0] * SCORE.LABEL_WEIGHT;
    if (weighted > bestScore) {
      bestScore = weighted;
      labelMatches = labelResult[1];
    }
  }

  // 2. description 매칭
  if (item.description !== undefined) {
    const descResult = fuzzyMatchOptimized(query, item.description);
    if (descResult !== null) {
      const weighted = descResult[0] * SCORE.DESCRIPTION_WEIGHT;
      if (weighted > bestScore) {
        bestScore = weighted;
        descriptionMatches = descResult[1];
        // label 매칭보다 description 매칭이 높으면 label 하이라이트는 비움
        if (labelResult === null || weighted > labelResult[0] * SCORE.LABEL_WEIGHT) {
          labelMatches = [];
        }
      }
    }
  }

  // 3. keywords 매칭
  if (item.keywords !== undefined) {
    for (const kw of item.keywords) {
      const kwResult = fuzzyMatchOptimized(query, kw);
      if (kwResult !== null) {
        const weighted = kwResult[0] * SCORE.KEYWORDS_WEIGHT;
        if (weighted > bestScore) {
          bestScore = weighted;
          // keywords 매칭은 하이라이트 표시 안 함 (label/description에만 하이라이트)
        }
      }
    }
  }

  if (bestScore <= 0 && labelResult === null) return null;

  return {
    item,
    score: bestScore,
    labelMatches,
    descriptionMatches,
  };
}
```

### 필터 + 정렬 엔트리 함수

```typescript
/**
 * 전체 아이템 목록에서 쿼리에 매칭되는 아이템을 점수 내림차순으로 반환한다.
 */
function filterItems(
  query: string,
  items: CommandItem[],
  maxResults: number,
): FuzzyMatchResult[] {
  if (query.trim() === "") {
    // 빈 쿼리: 전체 반환 (점수 0, 하이라이트 없음)
    return items
      .filter((item) => !item.disabled)
      .slice(0, maxResults)
      .map((item) => ({
        item,
        score: 0,
        labelMatches: [],
        descriptionMatches: [],
      }));
  }

  const results: FuzzyMatchResult[] = [];
  for (const item of items) {
    const result = scoreItem(query, item);
    if (result !== null) results.push(result);
  }

  // 점수 내림차순 정렬
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxResults);
}
```

### 매칭 하이라이트 렌더링 유틸

```typescript
/**
 * 텍스트와 매칭 인덱스를 받아 <mark> 태그로 감싼 ReactNode 배열을 반환한다.
 * 연속된 매칭 인덱스는 하나의 <mark>로 합친다.
 */
function renderHighlightedText(
  text: string,
  matchIndices: number[],
  theme: CommandPaletteTheme,
): ReactNode[] {
  if (matchIndices.length === 0) return [text];

  const highlightStyle: CSSProperties = {
    backgroundColor: theme === "light" ? "rgba(59,130,246,0.15)" : "rgba(96,165,250,0.25)",
    color: "inherit",
    borderRadius: "1px",
    padding: 0,
  };

  const set = new Set(matchIndices);
  const parts: ReactNode[] = [];
  let i = 0;

  while (i < text.length) {
    if (set.has(i)) {
      // 연속 매칭 구간 수집
      let end = i;
      while (end < text.length && set.has(end)) end++;
      parts.push(
        <mark key={`m${i}`} style={highlightStyle}>
          {text.slice(i, end)}
        </mark>
      );
      i = end;
    } else {
      // 비매칭 구간
      let end = i;
      while (end < text.length && !set.has(end)) end++;
      parts.push(text.slice(i, end));
      i = end;
    }
  }

  return parts;
}
```

---

## Context 구조

```typescript
interface CommandPaletteContextValue {
  // ── 상태 ──────────────────────────────────────
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  isLoading: boolean;

  // ── 결과 ──────────────────────────────────────
  filteredResults: FuzzyMatchResult[];
  flatItems: CommandItem[];         // 현재 레벨의 전체 아이템 (중첩 탐색 포함)

  // ── 중첩 내비게이션 ─────────────────────────────
  breadcrumb: CommandItem[];        // 현재 탐색 경로 (부모 아이템 스택)
  pushLevel: (item: CommandItem) => void;
  popLevel: () => void;

  // ── 설정 ──────────────────────────────────────
  theme: CommandPaletteTheme;
  maxResults: number;

  // ── 아이템 참조 ────────────────────────────────
  items: CommandItem[];
  recentItems: CommandItem[];
  pinnedItems: CommandItem[];

  // ── 아이템 DOM 참조 (가상 스크롤 + 키보드 스크롤) ──
  listRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;

  // ── 액션 ──────────────────────────────────────
  selectItem: (item: CommandItem) => void;
  close: () => void;
}
```

Context 생성:

```typescript
const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (ctx === null) {
    throw new Error("CommandPalette sub-components must be used within CommandPalette.Root");
  }
  return ctx;
}
```

---

## 상태 머신

### 메인 상태: Open/Closed

```
┌─────────────────────────────────────────────────────────┐
│  CLOSED                                                  │
│    ├─ Cmd+K (또는 커스텀 shortcut) ──→ OPEN              │
│    └─ open prop true로 변경 ─────────→ OPEN              │
└─────────────────────────────────────────────────────────┘
                    ↑                         │
                    │                         ↓
┌─────────────────────────────────────────────────────────┐
│  OPEN                                                    │
│    ├─ Escape ─────────────────────────→ CLOSED            │
│    ├─ 오버레이 클릭 ──────────────────→ CLOSED            │
│    ├─ onOpenChange(false) ────────────→ CLOSED            │
│    └─ 아이템 선택 (리프 노드) ────────→ CLOSED            │
│                                                          │
│    열릴 때:                                               │
│    1. query = "" 로 초기화                                │
│    2. activeIndex = 0 으로 초기화                          │
│    3. breadcrumb = [] 로 초기화                            │
│    4. input에 자동 포커스                                  │
│    5. body scroll 잠금 (overflow: hidden)                  │
│                                                          │
│    닫힐 때:                                               │
│    1. body scroll 복원                                    │
│    2. 이전 포커스 요소로 복원                                │
└─────────────────────────────────────────────────────────┘
```

### 검색 상태

```
┌──────────────────────────────────────────────────────────┐
│  IDLE (query: "", 결과: recentItems/pinnedItems/전체)     │
│    └─ 타이핑 ──────→ FILTERING / SEARCHING                │
└──────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┴──────────────┐
            ↓                            ↓
┌─────────────────────┐    ┌──────────────────────────────┐
│  FILTERING           │    │  SEARCHING (onSearch 모드)    │
│  (동기, 즉시)         │    │  (비동기, 디바운스 대기)       │
│  items + filter/     │    │                              │
│  fuzzyMatch 적용     │    │  디바운스 후:                   │
│  결과 즉시 표시       │    │  isLoading = true             │
│                      │    │  onSearch(query) 호출          │
│  query 비움 → IDLE   │    │                              │
└─────────────────────┘    │  완료: 결과 반영               │
                           │  실패: 빈 결과 + 콘솔 에러      │
                           │  query 비움 → IDLE             │
                           └──────────────────────────────┘

비동기 레이스 컨디션 처리:
  sequenceRef로 이전 요청의 stale 결과 폐기 (PathInput 검증과 동일 패턴)
```

### 내비게이션 상태 (activeIndex)

```
┌───────────────────────────────────────────────────────┐
│  현재 결과 목록: [item0, item1, item2, ..., itemN]     │
│  activeIndex: 현재 강조된 아이템 인덱스                  │
│                                                       │
│  Arrow Down:                                          │
│    activeIndex = (activeIndex + 1) % totalItems       │
│    (마지막에서 첫 번째로 순환)                           │
│                                                       │
│  Arrow Up:                                            │
│    activeIndex = (activeIndex - 1 + totalItems)       │
│                   % totalItems                        │
│    (첫 번째에서 마지막으로 순환)                         │
│                                                       │
│  Enter:                                               │
│    결과[activeIndex]의 onSelect 실행                    │
│    children이 있으면 → pushLevel                       │
│    children이 없으면 → close                           │
│                                                       │
│  쿼리 변경 시:                                         │
│    activeIndex = 0 으로 리셋                            │
│                                                       │
│  결과 목록 변경 시:                                     │
│    activeIndex = min(activeIndex, newLength - 1)       │
│    newLength === 0 이면 activeIndex = -1               │
└───────────────────────────────────────────────────────┘
```

### 중첩 내비게이션 상태

```
┌──────────────────────────────────────────────────────────┐
│  breadcrumb: CommandItem[] (스택)                         │
│  currentItems: 현재 레벨의 아이템 목록                     │
│                                                          │
│  초기 상태:                                               │
│    breadcrumb = []                                       │
│    currentItems = root items                              │
│                                                          │
│  pushLevel(item):                                        │
│    - item.children이 없으면 무시                           │
│    - breadcrumb = [...breadcrumb, item]                   │
│    - currentItems = item.children                         │
│    - query = "" (검색 초기화)                              │
│    - activeIndex = 0                                     │
│                                                          │
│  popLevel():                                             │
│    - breadcrumb가 비어있으면 무시                           │
│    - breadcrumb = breadcrumb.slice(0, -1)                 │
│    - currentItems = breadcrumb 마지막의 children,          │
│      또는 breadcrumb 비었으면 root items                   │
│    - query = ""                                          │
│    - activeIndex = 0                                     │
│                                                          │
│  Backspace when query === "":                            │
│    → popLevel()                                          │
│                                                          │
│  레벨 변경 시 Input 좌측에 breadcrumb 칩 표시:              │
│    "Root > Change Theme > ..."                           │
└──────────────────────────────────────────────────────────┘
```

---

## 키보드 내비게이션

### 글로벌 키보드 리스너 (CommandPaletteRoot에서 등록)

```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    // shortcut 매칭 확인
    const keys = shortcut ?? (isMac() ? ["Meta", "k"] : ["Control", "k"]);

    // 수정키 확인: shortcut에서 "Cmd"/"Meta" → e.metaKey, "Ctrl"/"Control" → e.ctrlKey,
    // "Shift" → e.shiftKey, "Alt"/"Option" → e.altKey
    const modifiers = resolveModifiers(keys);
    const char = keys.find((k) => !isModifierKey(k))?.toLowerCase();

    if (
      e.key.toLowerCase() === char &&
      e.metaKey === modifiers.meta &&
      e.ctrlKey === modifiers.ctrl &&
      e.shiftKey === modifiers.shift &&
      e.altKey === modifiers.alt
    ) {
      e.preventDefault();
      setIsOpen((prev) => !prev);  // 토글
    }
  };

  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [shortcut]);
```

### 모달 내 키보드 핸들러 (Input의 onKeyDown)

```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  switch (e.key) {
    case "ArrowDown": {
      e.preventDefault();
      const total = filteredResults.length;
      if (total === 0) return;
      setActiveIndex((activeIndex + 1) % total);
      scrollActiveIntoView();
      break;
    }

    case "ArrowUp": {
      e.preventDefault();
      const total = filteredResults.length;
      if (total === 0) return;
      setActiveIndex((activeIndex - 1 + total) % total);
      scrollActiveIntoView();
      break;
    }

    case "Enter": {
      e.preventDefault();
      if (activeIndex < 0 || activeIndex >= filteredResults.length) return;
      const selected = filteredResults[activeIndex]!;
      selectItem(selected.item);
      break;
    }

    case "Escape": {
      e.preventDefault();
      close();
      break;
    }

    case "Backspace": {
      if (query === "" && breadcrumb.length > 0) {
        e.preventDefault();
        popLevel();
      }
      // Cmd+Backspace: 입력 전체 삭제
      if ((e.metaKey || e.ctrlKey) && query !== "") {
        e.preventDefault();
        setQuery("");
      }
      break;
    }

    default:
      break;
  }
};
```

### selectItem 로직

```typescript
const selectItem = (item: CommandItem) => {
  if (item.disabled) return;

  // 하위 메뉴가 있으면 진입
  if (item.children !== undefined && item.children.length > 0) {
    pushLevel(item);
    return;
  }

  // 리프 노드: onSelect 실행 + 팔레트 닫기
  item.onSelect();
  onSelect?.(item);  // Root의 onSelect 콜백
  close();
};
```

### 수정키 해석 유틸

```typescript
function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

function isModifierKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower === "cmd" || lower === "meta" || lower === "command" ||
    lower === "ctrl" || lower === "control" ||
    lower === "shift" ||
    lower === "alt" || lower === "option"
  );
}

interface ModifierState {
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

function resolveModifiers(keys: string[]): ModifierState {
  const state: ModifierState = { meta: false, ctrl: false, shift: false, alt: false };
  for (const k of keys) {
    const lower = k.toLowerCase();
    if (lower === "cmd" || lower === "meta" || lower === "command") state.meta = true;
    else if (lower === "ctrl" || lower === "control") state.ctrl = true;
    else if (lower === "shift") state.shift = true;
    else if (lower === "alt" || lower === "option") state.alt = true;
  }
  return state;
}
```

### scrollActiveIntoView 유틸

```typescript
/**
 * 활성 아이템이 스크롤 영역 밖이면 스크롤하여 보이게 한다.
 */
function scrollActiveIntoView() {
  requestAnimationFrame(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>("[data-active='true']");
    if (!active) return;
    active.scrollIntoView({ block: "nearest" });
  });
}
```

---

## DOM 구조

### 전체 구조 (Portal)

```html
<!-- document.body에 Portal -->
{isOpen && createPortal(
  <!-- 오버레이 -->
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      backgroundColor: overlayBg,       // theme별 반투명
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      paddingTop: "min(20vh, 140px)",    // 위쪽 여백
    }}
    onClick={handleOverlayClick}         // 오버레이 클릭 시 닫기
    aria-hidden="true"                   // 오버레이 자체는 접근성 무시
  >
    <!-- 모달 컨테이너 -->
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        width: "100%",
        maxWidth: "640px",
        maxHeight: "min(400px, 60vh)",
        backgroundColor: modalBg,
        borderRadius: "12px",
        boxShadow: modalShadow,
        border: `1px solid ${modalBorder}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        // 애니메이션은 별도 섹션 참고
      }}
      onClick={(e) => e.stopPropagation()}  // 모달 내 클릭은 전파 중단
    >
      <CommandPaletteContext.Provider value={ctx}>
        {children}
      </CommandPaletteContext.Provider>
    </div>
  </div>,
  document.body
)}
```

### Input DOM

```html
<div
  style={{
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: `1px solid ${dividerColor}`,
    gap: "8px",
  }}
>
  <!-- 돋보기 아이콘 -->
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke={iconColor} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>

  <!-- Breadcrumb 칩들 (중첩 내비게이션 시) -->
  {breadcrumb.map((item, i) => (
    <span key={item.id} style={{
      fontSize: "12px",
      padding: "2px 6px",
      borderRadius: "4px",
      backgroundColor: breadcrumbBg,
      color: breadcrumbText,
      flexShrink: 0,
      whiteSpace: "nowrap",
    }}>
      {item.label}
    </span>
  ))}

  <!-- 검색 입력 -->
  <input
    ref={inputRef}
    type="text"
    role="combobox"
    aria-expanded="true"
    aria-controls="commandpalette-listbox"
    aria-activedescendant={activeIndex >= 0
      ? `commandpalette-item-${filteredResults[activeIndex]?.item.id}`
      : undefined}
    aria-autocomplete="list"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder={placeholder}
    style={{
      flex: 1,
      border: "none",
      outline: "none",
      backgroundColor: "transparent",
      color: inputTextColor,
      fontSize: "14px",
      lineHeight: "20px",
    }}
    {...rest}
  />

  <!-- 로딩 스피너 (비동기 검색 중) -->
  {isLoading && <SpinnerIcon />}
</div>
```

### List DOM

```html
<div
  ref={listRef}
  id="commandpalette-listbox"
  role="listbox"
  aria-label="Commands"
  style={{
    flex: 1,
    overflowY: "auto",
    padding: "4px 0",
    maxHeight: "calc(min(400px, 60vh) - 49px - 37px)",  // input높이 - footer높이
  }}
>
  {/* 고정 아이템 (항상 표시) */}
  {pinnedItems.length > 0 && query === "" && (
    <div role="group" aria-label="Pinned">
      <div style={groupHeaderStyle}>Pinned</div>
      {pinnedItems.map(item => <ItemRow item={item} />)}
    </div>
  )}

  {/* 최근 아이템 (쿼리 비어있을 때) */}
  {recentItems.length > 0 && query === "" && (
    <div role="group" aria-label="Recent">
      <div style={groupHeaderStyle}>Recent</div>
      {recentItems.map(item => <ItemRow item={item} />)}
    </div>
  )}

  {/* 검색 결과 */}
  {filteredResults.map((result, idx) => (
    <ItemRow key={result.item.id} result={result} index={idx} />
  ))}

  {/* children (Group, Empty, Loading 등) 은 컨텍스트 기반 조건부 렌더 */}
  {children}
</div>
```

### Item DOM

```html
<div
  id={`commandpalette-item-${item.id}`}
  role="option"
  aria-selected={isActive}
  aria-disabled={item.disabled}
  data-active={isActive}
  tabIndex={-1}
  onClick={() => selectItem(item)}
  onMouseEnter={() => setActiveIndex(index)}
  style={{
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    gap: "10px",
    cursor: item.disabled ? "not-allowed" : "pointer",
    backgroundColor: isActive ? activeBg : "transparent",
    color: item.disabled ? disabledText : textColor,
    opacity: item.disabled ? 0.5 : 1,
    borderRadius: "6px",
    margin: "0 4px",
    transition: "background-color 0s",  // 즉시 변경
  }}
>
  <!-- 아이콘 -->
  {item.icon && (
    <span style={{ flexShrink: 0, width: "20px", height: "20px",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: iconColor }}>
      {item.icon}
    </span>
  )}

  <!-- 라벨 + 설명 -->
  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
    <div style={{
      fontSize: "14px", lineHeight: "20px",
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
      {renderHighlightedText(item.label, labelMatches, theme)}
    </div>
    {item.description && (
      <div style={{
        fontSize: "12px", lineHeight: "16px", color: descriptionColor,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        marginTop: "1px",
      }}>
        {renderHighlightedText(item.description, descriptionMatches, theme)}
      </div>
    )}
  </div>

  <!-- 단축키 칩 -->
  {item.shortcut && (
    <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
      {item.shortcut.map((key, i) => (
        <kbd key={i} style={{
          fontSize: "11px",
          lineHeight: "16px",
          padding: "1px 5px",
          borderRadius: "4px",
          border: `1px solid ${kbdBorder}`,
          backgroundColor: kbdBg,
          color: kbdText,
          fontFamily: "inherit",
          minWidth: "20px",
          textAlign: "center",
        }}>
          {formatShortcutKey(key)}
        </kbd>
      ))}
    </div>
  )}

  <!-- 하위 메뉴 화살표 -->
  {item.children && item.children.length > 0 && (
    <svg width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      style={{ flexShrink: 0, opacity: 0.5 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )}
</div>
```

### Group DOM

```html
<div role="group" aria-labelledby={`commandpalette-group-${headingId}`}>
  <div
    id={`commandpalette-group-${headingId}`}
    aria-hidden="true"
    style={{
      padding: "6px 16px 4px",
      fontSize: "11px",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: groupHeaderColor,
      userSelect: "none",
    }}
  >
    {heading}
  </div>
  {children}
</div>
```

### Empty DOM

```html
<!-- filteredResults.length === 0 && !isLoading && query !== "" 일 때 표시 -->
<div
  role="status"
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    color: emptyTextColor,
    fontSize: "14px",
  }}
>
  {children ?? "No results found."}
</div>
```

### Loading DOM

```html
<!-- isLoading === true 일 때 표시 -->
<div
  role="status"
  aria-live="polite"
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "32px 16px",
    color: loadingTextColor,
    fontSize: "14px",
  }}
>
  <SpinnerIcon />
  {children ?? "Searching..."}
</div>
```

### Footer DOM

```html
<div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    borderTop: `1px solid ${dividerColor}`,
    fontSize: "12px",
    color: footerTextColor,
    userSelect: "none",
    gap: "12px",
  }}
>
  {showKeyboardHints && (
    <div style={{ display: "flex", gap: "12px" }}>
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <kbd style={footerKbdStyle}>↑</kbd>
        <kbd style={footerKbdStyle}>↓</kbd>
        navigate
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <kbd style={footerKbdStyle}>↵</kbd>
        select
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <kbd style={footerKbdStyle}>esc</kbd>
        close
      </span>
    </div>
  )}
  {children}
</div>
```

### 단축키 키 표시 포맷

```typescript
function formatShortcutKey(key: string): string {
  const map: Record<string, string> = {
    cmd: "⌘", meta: "⌘", command: "⌘",
    ctrl: "⌃", control: "⌃",
    alt: "⌥", option: "⌥",
    shift: "⇧",
    enter: "↵", return: "↵",
    backspace: "⌫", delete: "⌦",
    escape: "esc", esc: "esc",
    tab: "⇥",
    up: "↑", down: "↓", left: "←", right: "→",
    space: "␣",
  };
  return map[key.toLowerCase()] ?? key.toUpperCase();
}
```

---

## 테마 색상 맵

```typescript
// 오버레이
const overlayBg: Record<CommandPaletteTheme, string> = {
  light: "rgba(0, 0, 0, 0.4)",
  dark:  "rgba(0, 0, 0, 0.6)",
};

// 모달 배경
const modalBg: Record<CommandPaletteTheme, string> = {
  light: "#ffffff",
  dark:  "#1e1e2e",
};

// 모달 테두리
const modalBorder: Record<CommandPaletteTheme, string> = {
  light: "#e5e7eb",
  dark:  "#313244",
};

// 모달 그림자
const modalShadow: Record<CommandPaletteTheme, string> = {
  light: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  dark:  "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
};

// 구분선 (input 하단, footer 상단)
const dividerColor: Record<CommandPaletteTheme, string> = {
  light: "#e5e7eb",
  dark:  "#313244",
};

// 입력 텍스트
const inputTextColor: Record<CommandPaletteTheme, string> = {
  light: "#111827",
  dark:  "#cdd6f4",
};

// 플레이스홀더 (CSS로 직접 지정 불가 → ::placeholder pseudo 대신 placeholder 속성 사용, 색상은 브라우저 기본)
// Input 컴포넌트에서 style로 color 지정하되 placeholder 색상은 caretColor와 분리

// 아이콘 (돋보기, 아이템 아이콘)
const iconColor: Record<CommandPaletteTheme, string> = {
  light: "#9ca3af",
  dark:  "#6c7086",
};

// 아이템 텍스트
const textColor: Record<CommandPaletteTheme, string> = {
  light: "#111827",
  dark:  "#cdd6f4",
};

// 아이템 설명 텍스트
const descriptionColor: Record<CommandPaletteTheme, string> = {
  light: "#6b7280",
  dark:  "#a6adc8",
};

// 비활성 아이템 텍스트
const disabledText: Record<CommandPaletteTheme, string> = {
  light: "#d1d5db",
  dark:  "#45475a",
};

// 활성(선택) 아이템 배경
const activeBg: Record<CommandPaletteTheme, string> = {
  light: "#eff6ff",       // blue-50
  dark:  "rgba(137,180,250,0.12)",
};

// 활성 아이템 좌측 하이라이트 (선택 사항 - border-left)
const activeAccent: Record<CommandPaletteTheme, string> = {
  light: "#3b82f6",       // blue-500
  dark:  "#89b4fa",
};

// 그룹 헤더 텍스트
const groupHeaderColor: Record<CommandPaletteTheme, string> = {
  light: "#9ca3af",
  dark:  "#6c7086",
};

// 빈 결과 / 로딩 텍스트
const emptyTextColor: Record<CommandPaletteTheme, string> = {
  light: "#9ca3af",
  dark:  "#6c7086",
};

const loadingTextColor: Record<CommandPaletteTheme, string> = {
  light: "#6b7280",
  dark:  "#a6adc8",
};

// 키보드 단축키 칩
const kbdBg: Record<CommandPaletteTheme, string> = {
  light: "#f9fafb",
  dark:  "#313244",
};

const kbdBorder: Record<CommandPaletteTheme, string> = {
  light: "#e5e7eb",
  dark:  "#45475a",
};

const kbdText: Record<CommandPaletteTheme, string> = {
  light: "#6b7280",
  dark:  "#a6adc8",
};

// Breadcrumb 칩
const breadcrumbBg: Record<CommandPaletteTheme, string> = {
  light: "#f3f4f6",
  dark:  "#313244",
};

const breadcrumbText: Record<CommandPaletteTheme, string> = {
  light: "#374151",
  dark:  "#a6adc8",
};

// Footer 텍스트
const footerTextColor: Record<CommandPaletteTheme, string> = {
  light: "#9ca3af",
  dark:  "#6c7086",
};

// Footer kbd 스타일
const footerKbdStyle: Record<CommandPaletteTheme, CSSProperties> = {
  light: {
    fontSize: "11px",
    padding: "0 4px",
    borderRadius: "3px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    color: "#6b7280",
    lineHeight: "18px",
  },
  dark: {
    fontSize: "11px",
    padding: "0 4px",
    borderRadius: "3px",
    border: "1px solid #45475a",
    backgroundColor: "#313244",
    color: "#a6adc8",
    lineHeight: "18px",
  },
};
```

---

## 애니메이션 스펙

### Open 애니메이션 (150ms)

모달이 열릴 때 두 가지 동시 애니메이션:

#### 오버레이 페이드

```typescript
// 오버레이 div에 적용
// 시작: opacity 0
// 끝:   opacity 1
// duration: 150ms
// easing: ease-out

// 구현: state + inline style
const [overlayVisible, setOverlayVisible] = useState(false);

useEffect(() => {
  if (isOpen) {
    // 다음 프레임에서 트랜지션 트리거
    requestAnimationFrame(() => setOverlayVisible(true));
  } else {
    setOverlayVisible(false);
  }
}, [isOpen]);

// 오버레이 스타일
const overlayStyle: CSSProperties = {
  ...baseOverlayStyle,
  opacity: overlayVisible ? 1 : 0,
  transition: isOpen ? "opacity 150ms ease-out" : "opacity 100ms ease-in",
};
```

#### 모달 스케일 + 페이드

```typescript
// 모달 div에 적용
// 시작: opacity 0, transform scale(0.98) translateY(-4px)
// 끝:   opacity 1, transform scale(1) translateY(0)
// duration: 150ms
// easing: cubic-bezier(0.16, 1, 0.3, 1)  (easeOutExpo에 근사)

const modalStyle: CSSProperties = {
  ...baseModalStyle,
  opacity: overlayVisible ? 1 : 0,
  transform: overlayVisible
    ? "scale(1) translateY(0)"
    : "scale(0.98) translateY(-4px)",
  transition: isOpen
    ? "opacity 150ms cubic-bezier(0.16,1,0.3,1), transform 150ms cubic-bezier(0.16,1,0.3,1)"
    : "opacity 100ms ease-in, transform 100ms ease-in",
};
```

### Close 애니메이션 (100ms)

```typescript
// 닫기 시 즉시 isOpen = false 하지 않고, 애니메이션 완료 후 DOM 제거
// 구현: isOpen과 별도로 mounted 상태 관리

const [mounted, setMounted] = useState(false);

useEffect(() => {
  if (isOpen) {
    setMounted(true);
  } else if (mounted) {
    // 애니메이션 완료 대기 후 언마운트
    const timer = setTimeout(() => setMounted(false), 100);
    return () => clearTimeout(timer);
  }
}, [isOpen]);

// Portal은 mounted가 true일 때만 렌더
// overlayVisible은 isOpen에 따라 즉시 변경 → CSS transition이 닫기 애니메이션 처리
```

### 결과 아이템 스태거 애니메이션

```typescript
// 검색 결과가 변경될 때 각 아이템이 순차적으로 fade in
// 딜레이: index * 30ms (최대 5개까지 = 150ms)
// duration: 100ms per item
// easing: ease-out

// 구현: 각 Item 컴포넌트에서 mount 시 애니메이션
const [visible, setVisible] = useState(false);

useEffect(() => {
  const delay = Math.min(index, 5) * 30;
  const timer = setTimeout(() => setVisible(true), delay);
  return () => {
    clearTimeout(timer);
    setVisible(false);  // 결과 변경 시 리셋
  };
}, [index, /* 결과 변경 시 key 리셋으로 재mount */]);

const itemAnimStyle: CSSProperties = {
  opacity: visible ? 1 : 0,
  transform: visible ? "translateY(0)" : "translateY(4px)",
  transition: `opacity 100ms ease-out, transform 100ms ease-out`,
};
```

### 선택 아이템 하이라이트

```typescript
// 활성 아이템의 배경색: 즉시 변경 (transition 없음)
// 마우스 호버 / 키보드 이동 모두 동일
backgroundColor: isActive ? activeBg[theme] : "transparent",
// transition: "background-color 0s"  ← 즉시
```

---

## 가상 스크롤

아이템이 100개를 초과할 경우 가상 스크롤을 적용하여 DOM 노드 수를 제한한다.

### 구현 전략

외부 라이브러리 없이 자체 구현한다. 고정 높이 아이템(40px)을 전제로 한다.

```typescript
interface VirtualScrollState {
  /** 스크롤 컨테이너의 scrollTop */
  scrollTop: number;
  /** 스크롤 컨테이너의 clientHeight */
  clientHeight: number;
  /** 전체 아이템 수 */
  totalItems: number;
  /** 아이템 높이 (px) */
  itemHeight: number;
}

function useVirtualScroll(
  listRef: React.RefObject<HTMLDivElement>,
  totalItems: number,
  itemHeight: number = 40,
  overscan: number = 5,
) {
  const [scrollTop, setScrollTop] = useState(0);
  const clientHeight = useRef(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    clientHeight.current = el.clientHeight;

    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [listRef]);

  const totalHeight = totalItems * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil((clientHeight.current || 400) / itemHeight) + 2 * overscan;
  const endIndex = Math.min(totalItems, startIndex + visibleCount);
  const offsetY = startIndex * itemHeight;

  return {
    totalHeight,
    startIndex,
    endIndex,
    offsetY,
    virtualItems: Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i),
  };
}
```

### 가상 스크롤 List 렌더링

```tsx
// VIRTUAL_THRESHOLD 이상이면 가상 스크롤, 미만이면 일반 렌더
const VIRTUAL_THRESHOLD = 100;

const useVirtual = filteredResults.length >= VIRTUAL_THRESHOLD;

{useVirtual ? (
  <div style={{ height: totalHeight, position: "relative" }}>
    <div style={{ position: "absolute", top: offsetY, left: 0, right: 0 }}>
      {virtualItems.map((idx) => {
        const result = filteredResults[idx]!;
        return <ItemRow key={result.item.id} result={result} index={idx} />;
      })}
    </div>
  </div>
) : (
  filteredResults.map((result, idx) => (
    <ItemRow key={result.item.id} result={result} index={idx} />
  ))
)}
```

### 키보드 이동 시 가상 스크롤 동기화

```typescript
// activeIndex 변경 시 해당 위치가 보이도록 스크롤
useEffect(() => {
  if (activeIndex < 0 || !useVirtual) return;
  const list = listRef.current;
  if (!list) return;

  const itemTop = activeIndex * ITEM_HEIGHT;
  const itemBottom = itemTop + ITEM_HEIGHT;
  const viewTop = list.scrollTop;
  const viewBottom = viewTop + list.clientHeight;

  if (itemTop < viewTop) {
    list.scrollTop = itemTop;
  } else if (itemBottom > viewBottom) {
    list.scrollTop = itemBottom - list.clientHeight;
  }
}, [activeIndex]);
```

---

## 접근성

WAI-ARIA Combobox + Listbox 패턴을 따른다.

| 요소 | 속성 | 값 |
|------|------|---|
| 오버레이 `<div>` | `aria-hidden` | `true` |
| 모달 `<div>` | `role` | `"dialog"` |
| 모달 `<div>` | `aria-modal` | `true` |
| 모달 `<div>` | `aria-label` | `"Command palette"` |
| Input `<input>` | `role` | `"combobox"` |
| Input `<input>` | `aria-expanded` | `"true"` (열려있을 때) |
| Input `<input>` | `aria-controls` | `"commandpalette-listbox"` |
| Input `<input>` | `aria-activedescendant` | 활성 아이템의 id |
| Input `<input>` | `aria-autocomplete` | `"list"` |
| List `<div>` | `role` | `"listbox"` |
| List `<div>` | `id` | `"commandpalette-listbox"` |
| List `<div>` | `aria-label` | `"Commands"` |
| Group `<div>` | `role` | `"group"` |
| Group `<div>` | `aria-labelledby` | 그룹 헤더 id |
| 그룹 헤더 `<div>` | `id` | `"commandpalette-group-{heading}"` |
| Item `<div>` | `role` | `"option"` |
| Item `<div>` | `id` | `"commandpalette-item-{id}"` |
| Item `<div>` | `aria-selected` | 활성 여부 |
| Item `<div>` | `aria-disabled` | 비활성 여부 |
| Empty `<div>` | `role` | `"status"` |
| Loading `<div>` | `role` | `"status"` |
| Loading `<div>` | `aria-live` | `"polite"` |

### 포커스 관리

1. 열릴 때: `inputRef.current.focus()` 호출. 이전 포커스 요소를 `previousFocusRef`에 저장
2. 닫힐 때: `previousFocusRef.current?.focus()` 로 복원
3. 모달 내부에서 Tab 키: Input에만 포커스 유지 (아이템은 키보드로만 탐색, 개별 포커스 불가)
4. 포커스 트랩: 모달 밖으로 Tab 이동 방지 (Input이 유일한 focusable이므로 자연스럽게 트랩)

```typescript
// 포커스 저장/복원
const previousFocusRef = useRef<HTMLElement | null>(null);

useEffect(() => {
  if (isOpen) {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // 다음 프레임에서 포커스 (mount 완료 대기)
    requestAnimationFrame(() => inputRef.current?.focus());
  } else if (previousFocusRef.current) {
    previousFocusRef.current.focus();
    previousFocusRef.current = null;
  }
}, [isOpen]);
```

### 스크린리더 안내

- 열릴 때: `role="dialog"` + `aria-modal` 로 모달 진입 안내
- 검색 결과 변경: `aria-activedescendant` 변경으로 현재 선택 아이템 안내
- 빈 결과: `role="status"` 로 "No results found" 안내
- 로딩 중: `aria-live="polite"` 로 "Searching..." 안내

### 고유 ID 생성

동일 페이지에 여러 CommandPalette가 존재할 수 있으므로 `useId()`로 고유 접두사 생성:

```typescript
const instanceId = useId();
const listboxId = `${instanceId}-listbox`;
const itemId = (id: string) => `${instanceId}-item-${id}`;
const groupId = (heading: string) => `${instanceId}-group-${heading}`;
```

---

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| 빈 `items` 배열 | Empty 컴포넌트 표시. 빈 상태에서도 UI 정상 렌더 |
| 매우 긴 label | `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap`. title 속성으로 전체 텍스트 툴팁 |
| 매우 긴 description | 동일 처리 |
| 빠른 타이핑 (동기 필터) | 매 keystroke마다 `filterItems` 호출. 아이템 1000개 이하에서 60fps 유지 가능 (O(n*m) 이내) |
| 빠른 타이핑 (비동기 검색) | 디바운스 + `sequenceRef`로 stale 결과 폐기 |
| `onSearch` Promise reject | catch → 빈 결과 + `console.error`. Loading 숨기기 |
| 동시에 여러 CommandPalette 인스턴스 | `useId()` 기반 고유 ID로 충돌 방지. 글로벌 단축키는 가장 먼저 등록된 인스턴스만 반응하도록 `e.preventDefault()` + 순차 체크 |
| `items` + `onSearch` 동시 설정 | `onSearch` 우선. 쿼리 비어있을 때만 `items` 표시 |
| `filter` + `onSearch` 동시 설정 | `onSearch` 우선. `filter`는 `items` 모드에서만 적용 |
| `children` 없는 아이템에 Enter | `onSelect()` 실행 + 닫기 |
| `children` 있는 아이템에 Enter | 하위 메뉴 진입 (pushLevel) |
| Backspace로 빈 입력에서 뒤로 | `popLevel()`. breadcrumb이 비어있으면 무시 |
| 모달 열린 상태에서 Cmd+K | 모달 닫기 (토글) |
| `disabled` 아이템 | 마우스 클릭/Enter 무시, 시각적 흐림 처리, 화살표 키 탐색 시 건너뛰기 |
| 0개 결과 + 로딩 동시 상태 | Loading 우선 표시. 로딩 완료 후 Empty 전환 |
| 모달 닫기 애니메이션 중 재열기 | `mounted` 상태 즉시 true로 전환. 닫기 타이머 취소 |
| SSR / `typeof window === "undefined"` | Portal 사용 시 `document.body` 접근 → `useEffect` 내에서만 Portal 마운트 |
| 그룹 내 아이템이 모두 필터링으로 제거됨 | 해당 그룹 헤더도 숨김 (빈 그룹 표시 안 함) |
| `recentItems`와 `items`에 중복 id | `recentItems` 영역과 일반 결과 영역을 별도 렌더. id 충돌 방지를 위해 recent 접두사 부여 |
| maxResults=0 | 전체 결과 표시 (0은 제한 없음으로 처리) |
| 한글/CJK IME 입력 | `onCompositionStart`/`onCompositionEnd` 감지하여 조합 중에는 검색 실행 보류. 조합 완료 후 검색 |

### disabled 아이템 화살표 키 건너뛰기

```typescript
function getNextActiveIndex(
  current: number,
  direction: 1 | -1,
  results: FuzzyMatchResult[],
): number {
  const total = results.length;
  if (total === 0) return -1;

  let next = current;
  for (let i = 0; i < total; i++) {
    next = (next + direction + total) % total;
    if (!results[next]!.item.disabled) return next;
  }
  // 모든 아이템이 disabled
  return -1;
}
```

### IME 조합 처리

```typescript
const isComposingRef = useRef(false);

const handleCompositionStart = () => {
  isComposingRef.current = true;
};

const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
  isComposingRef.current = false;
  // 조합 완료 후 최종 값으로 검색 트리거
  setQuery((e.target as HTMLInputElement).value);
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  // IME 조합 중에는 내부 상태만 업데이트하되 검색은 보류
  const value = e.target.value;
  setQuery(value);  // 상태는 항상 업데이트 (Input 반영)
  // 실제 검색은 useEffect에서 isComposingRef 확인
};

// 검색 useEffect
useEffect(() => {
  if (isComposingRef.current) return;
  // ... 실제 검색 로직
}, [query]);
```

---

## 수정 대상 파일

### 신규 생성

1. **`src/components/CommandPalette/CommandPalette.types.ts`** — 전체 타입 정의 (~80줄)
   - `CommandPaletteTheme`, `CommandItem`, `FuzzyMatchResult`
   - `CommandPaletteRootProps`, `CommandPaletteInputProps`, `CommandPaletteListProps`
   - `CommandPaletteGroupProps`, `CommandPaletteItemProps`
   - `CommandPaletteEmptyProps`, `CommandPaletteLoadingProps`, `CommandPaletteFooterProps`
   - `CommandPaletteContextValue` (내부용, export 안 함)

2. **`src/components/CommandPalette/fuzzyMatch.ts`** — 퍼지 매칭 알고리즘 (~120줄)
   - `SCORE` 상수
   - `fuzzyMatchOptimized()` 함수
   - `scoreItem()` 함수
   - `filterItems()` 함수

3. **`src/components/CommandPalette/CommandPaletteRoot.tsx`** — Root 컴포넌트 (~200줄)
   - Context 생성 및 Provider
   - `useControllable` 으로 open 상태 관리
   - 글로벌 키보드 단축키 리스너
   - 검색 상태 관리 (동기/비동기)
   - 중첩 내비게이션 상태 관리
   - Portal + 오버레이 + 모달 컨테이너 렌더
   - 포커스 관리 (저장/복원)
   - body scroll 잠금
   - Open/Close 애니메이션 상태

4. **`src/components/CommandPalette/CommandPaletteInput.tsx`** — Input 컴포넌트 (~80줄)
   - 돋보기 SVG 아이콘
   - Breadcrumb 칩 렌더링
   - 검색 입력 필드
   - `onKeyDown` 핸들러 (화살표, Enter, Escape, Backspace)
   - IME 조합 처리
   - 로딩 스피너 (비동기 검색 시)

5. **`src/components/CommandPalette/CommandPaletteList.tsx`** — List 컴포넌트 (~100줄)
   - 스크롤 컨테이너
   - 고정/최근 아이템 그룹 렌더 (쿼리 비어있을 때)
   - 가상 스크롤 로직 (`useVirtualScroll`)
   - 결과 아이템 렌더 (스태거 애니메이션 포함)
   - Empty/Loading 조건부 렌더 지원

6. **`src/components/CommandPalette/CommandPaletteGroup.tsx`** — Group 컴포넌트 (~30줄)
   - 그룹 헤더 레이블
   - children 렌더

7. **`src/components/CommandPalette/CommandPaletteItem.tsx`** — Item 컴포넌트 (~100줄)
   - 아이템 행 렌더 (아이콘 + 라벨 + 설명 + 단축키 칩 + 하위 메뉴 화살표)
   - 매칭 하이라이트 렌더 (`renderHighlightedText`)
   - 마우스 호버/클릭 핸들러
   - 스태거 애니메이션
   - disabled 스타일

8. **`src/components/CommandPalette/CommandPaletteEmpty.tsx`** — Empty 컴포넌트 (~20줄)
   - 결과 없음 메시지

9. **`src/components/CommandPalette/CommandPaletteLoading.tsx`** — Loading 컴포넌트 (~30줄)
   - 스피너 SVG + 로딩 메시지

10. **`src/components/CommandPalette/CommandPaletteFooter.tsx`** — Footer 컴포넌트 (~50줄)
    - 키보드 힌트 (↑↓ navigate, ↵ select, esc close)
    - children 슬롯

11. **`src/components/CommandPalette/helpers.ts`** — 유틸 함수 (~60줄)
    - `formatShortcutKey()`
    - `renderHighlightedText()`
    - `isMac()`
    - `isModifierKey()`
    - `resolveModifiers()`
    - `getNextActiveIndex()`

12. **`src/components/CommandPalette/colors.ts`** — 테마 색상 맵 (~80줄)
    - 모든 `Record<CommandPaletteTheme, string>` 정의

13. **`src/components/CommandPalette/CommandPalette.tsx`** — Object.assign 조립 (~20줄)

14. **`src/components/CommandPalette/index.ts`** — 배럴 export

15. **`demo/src/pages/CommandPalettePage.tsx`** — 데모 페이지 (~500줄)

### 기존 수정

16. **`src/components/index.ts`** — `export * from "./CommandPalette"` 추가

17. **`demo/src/App.tsx`** — CommandPalette 페이지 NAV 추가 + import + 라우팅
    - `Page` 타입에 `"commandpalette"` 추가
    - NAV 배열에 엔트리 추가
    - `import { CommandPalettePage }` 추가
    - 렌더 조건 추가

---

## 데모 페이지

### NAV 엔트리

```typescript
{
  id: "commandpalette", label: "CommandPalette", description: "Cmd+K 커맨드 팔레트",
  sections: [
    { label: "Basic", id: "basic" },
    { label: "Groups", id: "groups" },
    { label: "Keyboard Shortcuts", id: "keyboard-shortcuts" },
    { label: "Fuzzy Search", id: "fuzzy-search" },
    { label: "Async Search", id: "async-search" },
    { label: "Nested", id: "nested" },
    { label: "Recent Items", id: "recent-items" },
    { label: "Custom Trigger", id: "custom-trigger" },
    { label: "Dark Theme", id: "dark-theme" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
    { label: "Playground", id: "playground" },
  ],
}
```

### 데모 섹션 상세

1. **Basic** — 간단한 명령 5~6개. "Open Palette" 버튼으로 열기. 기본 퍼지 검색 시연
   ```tsx
   const commands: CommandItem[] = [
     { id: "new-file", label: "New File", onSelect: () => alert("New File") },
     { id: "save", label: "Save", onSelect: () => alert("Save") },
     { id: "quit", label: "Quit Application", onSelect: () => alert("Quit") },
   ];
   // 버튼 클릭으로 open 제어
   ```

2. **Groups** — File, Edit, View 그룹으로 나눠진 명령. Group 컴포넌트 사용 시연
   ```tsx
   // group 필드가 같은 아이템끼리 자동 그룹핑
   ```

3. **Keyboard Shortcuts** — 각 명령에 shortcut 배열. 칩 렌더링 시연
   ```tsx
   { id: "save", label: "Save", shortcut: ["Cmd", "S"], ... }
   { id: "undo", label: "Undo", shortcut: ["Cmd", "Z"], ... }
   ```

4. **Fuzzy Search** — "nfl" → "**N**ew **F**i**l**e" 하이라이트. 여러 쿼리 예시를 CodeView로 표시
   - 검색어 입력 후 매칭 하이라이트가 어떻게 표시되는지 시각적 데모

5. **Async Search** — 500ms 딜레이 시뮬레이션 (`setTimeout` + `Promise`). Loading 상태 표시
   ```tsx
   <CommandPalette.Root
     onSearch={async (query) => {
       await new Promise(r => setTimeout(r, 500));
       return mockResults.filter(r => r.label.toLowerCase().includes(query.toLowerCase()));
     }}
   >
   ```

6. **Nested** — "Change Theme" → Light/Dark/System. "Set Language" → 언어 목록. breadcrumb 표시

7. **Recent Items** — `recentItems` prop에 최근 3개 명령. 입력 비어있을 때 표시, 입력 시 일반 검색으로 전환

8. **Custom Trigger** — `shortcut={["Ctrl", "P"]}` 설정. 버튼 클릭으로도 열기 가능. `open`/`onOpenChange` 제어 모드 시연

9. **Dark Theme** — 어두운 배경(`bg-gray-900`)에 `theme="dark"`. 모든 서브 컴포넌트 다크 테마 적용 확인

10. **Props** — 테이블로 각 서브 컴포넌트 props 나열
    - Root, Input, List, Group, Item, Empty, Loading, Footer 각각
    - CommandItem 인터페이스 별도 테이블
    - PropsTable 또는 수동 `<table>` 사용

11. **Usage** — CodeView 코드 블록
    - 기본 사용, 그룹 사용, 비동기 검색, 중첩 명령 예제 코드

12. **Playground** — 인터랙티브 제어
    - theme: light / dark 토글
    - placeholder: 텍스트 입력
    - maxResults: 숫자 입력
    - shortcut: 텍스트 입력 (쉼표 구분)
    - searchDebounce: 숫자 슬라이더 (100~1000ms)
    - showKeyboardHints: 체크박스
    - "Open Palette" 버튼으로 설정 적용된 팔레트 열기

---

## 구현 순서

1. **`CommandPalette.types.ts`** — 전체 타입 정의
2. **`fuzzyMatch.ts`** — 퍼지 매칭 알고리즘 (독립 모듈, 단독 테스트 가능)
3. **`helpers.ts`** — 유틸 함수 (`formatShortcutKey`, `renderHighlightedText`, `isMac` 등)
4. **`colors.ts`** — 테마 색상 맵
5. **`CommandPaletteRoot.tsx`** — Context, 상태 관리, Portal, 오버레이, 모달 컨테이너
6. **`CommandPaletteInput.tsx`** — 검색 입력 + breadcrumb + 키보드 핸들러
7. **`CommandPaletteList.tsx`** — 결과 목록 + 가상 스크롤
8. **`CommandPaletteGroup.tsx`** — 그룹 헤더
9. **`CommandPaletteItem.tsx`** — 아이템 행 (하이라이트, 칩, 아이콘)
10. **`CommandPaletteEmpty.tsx`** — 빈 결과
11. **`CommandPaletteLoading.tsx`** — 로딩 상태
12. **`CommandPaletteFooter.tsx`** — 키보드 힌트 footer
13. **`CommandPalette.tsx`** — `Object.assign(CommandPaletteRoot, { Input, List, Group, Item, Empty, Loading, Footer })`
14. **`index.ts`** — 배럴 export
15. **`src/components/index.ts`** — `export * from "./CommandPalette"` 추가
16. **`demo/src/pages/CommandPalettePage.tsx`** — 데모 페이지
17. **`demo/src/App.tsx`** — NAV + import + 라우팅 추가

---

## 검증 방법

```bash
npm run typecheck        # 타입 체크 (strict mode + exactOptionalPropertyTypes)
npx tsup                 # 빌드 성공 확인
cd demo && npm run dev   # http://localhost:5173/#/commandpalette
```

### 기능 체크리스트

- [ ] Cmd+K로 팔레트 열기/닫기 (Mac) / Ctrl+K (Win/Linux)
- [ ] Escape로 닫기
- [ ] 오버레이 클릭으로 닫기
- [ ] 텍스트 입력 시 즉시 퍼지 필터링
- [ ] 퍼지 매칭 하이라이트 표시 (label, description)
- [ ] 화살표 위/아래로 아이템 탐색 (순환)
- [ ] Enter로 선택된 아이템 실행
- [ ] disabled 아이템 건너뛰기 (화살표 키)
- [ ] disabled 아이템 클릭/Enter 무시
- [ ] 그룹 헤더 표시 (group 필드)
- [ ] 단축키 칩 렌더링 (shortcut 필드)
- [ ] 하위 메뉴 진입 (children 필드) → breadcrumb 표시
- [ ] 빈 입력 + Backspace → 상위 메뉴 복귀
- [ ] Cmd+Backspace → 입력 전체 삭제
- [ ] 비동기 검색 (onSearch) → Loading 표시 → 결과 표시
- [ ] 비동기 레이스 컨디션: 빠른 타이핑 시 이전 결과 무시
- [ ] 빈 결과 시 Empty 표시
- [ ] recentItems: 입력 비어있을 때 표시
- [ ] pinnedItems: 항상 상단 표시
- [ ] 커스텀 shortcut 동작
- [ ] open/onOpenChange 제어 모드 동작
- [ ] light/dark 테마 전환
- [ ] 열기 애니메이션: 오버레이 페이드 + 모달 스케일
- [ ] 닫기 애니메이션: 역방향 (100ms)
- [ ] 아이템 스태거 애니메이션
- [ ] Footer 키보드 힌트 표시
- [ ] 가상 스크롤: 100+ 아이템에서 DOM 노드 제한
- [ ] ARIA: combobox, listbox, option, dialog 역할
- [ ] 포커스 관리: 열 때 input 포커스, 닫을 때 이전 포커스 복원
- [ ] body scroll 잠금 (모달 열린 동안)
- [ ] 한글/CJK IME 입력 시 조합 완료 후 검색
- [ ] 긴 레이블 말줄임 처리
- [ ] 마우스 호버 시 아이템 활성화 (activeIndex 변경)
