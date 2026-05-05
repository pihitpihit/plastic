# SmartSearch 컴포넌트 설계문서

## Context

`SmartSearch`는 **`key:value` 토큰 + 연산자 기반 쿼리 빌더**.

GitHub issues, Linear, Sentry 등에서 보이는 검색 패턴:
```
status:open assignee:alice priority:>=high label:bug created:>2026-01-01
```

자유 텍스트 입력에 토큰화된 쿼리 + 자동완성을 결합한 UI.

native `<input>` + 단순 텍스트 검색만으로는 부족하고, CommandPalette는 다른 영역 (액션 실행 중심).

참고:
- **GitHub search bar** — `is:open author:foo label:bug`.
- **Linear** — 더 풍부 (date 비교, multi-value).
- **Sentry** — `is:resolved release:[2.0,2.1] !user.email:foo@bar`.
- **Atlassian Jira JQL** — 전체 query language (지나치게 복잡).
- **Radix combobox + tokenizer** — 자체 구현 패턴.
- **react-search-autocomplete** — 단순 문자 매칭.

본 레포 내부 참조:
- `src/components/Combobox/` (설계됨, 014) — 자동완성 인프라 일부 활용 가능.
- `src/components/Tag/` (plan 027) — 토큰 시각화에 사용.
- `src/components/_shared/useFloating.ts` — 자동완성 드롭다운 floating.

---

## 0. TL;DR

```tsx
// 1. 기본 — 토큰 키 정의
<SmartSearch
  schema={{
    keys: ["status", "assignee", "label", "priority"],
    valuesByKey: {
      status: ["open", "closed", "in-progress"],
      priority: ["low", "medium", "high"],
    },
  }}
  onQueryChange={(q) => doSearch(q)}
/>

// 2. controlled
<SmartSearch
  value={query}
  onValueChange={setQuery}
  schema={schema}
/>

// 3. 토큰 시각화 (chip vs text)
<SmartSearch tokenStyle="chip" />  // 기본 — 칩 형태
<SmartSearch tokenStyle="text" />  // 일반 텍스트 (모노스페이스)

// 4. 비동기 value 자동완성
<SmartSearch
  schema={{
    keys: ["assignee"],
    asyncValues: async (key, q) => {
      if (key === "assignee") return await api.searchUsers(q);
      return [];
    },
  }}
/>

// 5. 연산자 (>=, <=, !)
<SmartSearch
  schema={{
    keys: ["priority", "created"],
    operators: { priority: ["=", ">=", "<="], created: [">", "<"] },
  }}
/>

// 6. 파싱된 쿼리 출력
<SmartSearch onParsedChange={(parsed) => {
  // parsed: { tokens: [{key, op, value, raw}, ...], freeText: "..." }
}} />
```

핵심 원칙:
- **토큰 + 자유 텍스트 혼합**: `status:open foo bar` → 토큰 1 + freeText "foo bar".
- **시각**: 칩 형태가 기본 (Tag 컴포넌트 활용).
- **자동완성**: 키 입력 시 키 후보 → 콜론 후 값 후보 → 완료 후 토큰 칩.
- **키보드 네비**: ↑/↓ 자동완성 이동, Enter 선택, Tab 자동완성, Backspace 토큰 삭제.
- **schema 기반 검증** — 알려진 키만 허용 옵션.
- **연산자**: `>`, `<`, `>=`, `<=`, `!` (negation), 기본 `=`.

---

## 1. Goals / Non-goals

### Goals (v1)
1. 텍스트 입력 + 토큰 칩 혼합 표시.
2. `schema`: keys 화이트리스트 + valuesByKey + operators.
3. 자동완성 드롭다운 (키, 값, 연산자).
4. 비동기 값 (`asyncValues`).
5. 파싱: `{ tokens: ParsedToken[], freeText: string }` 형태로 export.
6. controlled (`value`, `onValueChange`) / uncontrolled.
7. 토큰 시각: chip / text.
8. 키보드 네비: Arrow up/down, Enter, Tab, Backspace, Esc.
9. theme light/dark.
10. placeholder.
11. 클릭으로 토큰 제거.
12. 입력 도중 invalid token 시각 표시.

### Non-goals (v1)
- 복합 boolean (`AND`, `OR`, 괄호) — v2.
- 정규식 검색.
- 자동 추천 (스마트 hint) — v1.1+.
- 검색 history.
- 모바일 키보드 최적화.

---

## 2. 공개 API

### 2.1 타입 — `src/components/SmartSearch/SmartSearch.types.ts`

```ts
export type SmartSearchOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "!";
export type SmartSearchTheme = "light" | "dark";
export type SmartSearchTokenStyle = "chip" | "text";

export interface SmartSearchSchema {
  keys: string[];
  valuesByKey?: Partial<Record<string, string[]>>;
  asyncValues?: (key: string, query: string) => Promise<string[]>;
  operators?: Partial<Record<string, SmartSearchOperator[]>>;
  /** 알 수 없는 키 허용 여부. 기본 true (자유 입력). */
  allowUnknownKeys?: boolean;
}

export interface ParsedToken {
  key: string;
  operator: SmartSearchOperator;
  value: string;
  raw: string;        // 원본 문자열 (예: "status:open")
  start: number;      // value 문자열 내 위치
  end: number;
}

export interface ParsedQuery {
  tokens: ParsedToken[];
  freeText: string;
}

export interface SmartSearchProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onQueryChange?: (parsed: ParsedQuery) => void;

  schema?: SmartSearchSchema;

  placeholder?: string;
  tokenStyle?: SmartSearchTokenStyle;
  theme?: SmartSearchTheme;
  disabled?: boolean;

  className?: string;
  style?: CSSProperties;
}
```

### 2.2 파서 — `src/components/SmartSearch/SmartSearch.parser.ts`

```ts
const TOKEN_REGEX = /(\w+)(=|!=|>=|<=|>|<|:!|:)((?:"[^"]*"|\S+))/g;

export function parseQuery(input: string): ParsedQuery {
  const tokens: ParsedToken[] = [];
  let lastIndex = 0;
  let freeText = "";

  let match;
  // copy regex
  const re = new RegExp(TOKEN_REGEX.source, "g");
  while ((match = re.exec(input)) !== null) {
    const [raw, key, opRaw, valRaw] = match;
    let operator: SmartSearchOperator;
    if (opRaw === ":") operator = "=";
    else if (opRaw === ":!") operator = "!=";
    else operator = opRaw as SmartSearchOperator;

    const value = valRaw!.replace(/^"|"$/g, ""); // unquote

    // freeText 누적 (직전 위치까지)
    freeText += input.slice(lastIndex, match.index);
    lastIndex = match.index + raw!.length;

    tokens.push({
      key: key!,
      operator,
      value,
      raw: raw!,
      start: match.index,
      end: match.index + raw!.length,
    });
  }
  freeText += input.slice(lastIndex);
  freeText = freeText.trim().replace(/\s+/g, " ");

  return { tokens, freeText };
}
```

### 2.3 컴포넌트 (개요) — `src/components/SmartSearch/SmartSearch.tsx`

전체 구현은 길어 핵심만 요약. (실제 작성 시 ~500줄)

```tsx
export function SmartSearch(props: SmartSearchProps) {
  const {
    value: controlledValue, defaultValue = "", onValueChange, onQueryChange,
    schema, placeholder = "Search...", tokenStyle = "chip", theme = "light",
    disabled, className, style,
  } = props;

  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const setValue = (v: string) => {
    if (controlledValue === undefined) setInternalValue(v);
    onValueChange?.(v);
  };

  // 파싱
  const parsed = useMemo(() => parseQuery(value), [value]);
  useEffect(() => {
    onQueryChange?.(parsed);
  }, [parsed, onQueryChange]);

  // 자동완성
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // 현재 caret 위치 기반 — 어떤 종류의 자동완성을 보일지 결정
  const [caretPos, setCaretPos] = useState(0);
  const completionContext = useMemo(() => analyzeContext(value, caretPos, schema), [value, caretPos, schema]);
  // completionContext: { type: "key" | "value" | "operator", currentToken: ... }

  // 자동완성 후보 생성
  useEffect(() => {
    if (!schema) { setSuggestions([]); return; }
    if (completionContext.type === "key") {
      const partial = completionContext.partial.toLowerCase();
      setSuggestions(schema.keys.filter((k) => k.toLowerCase().includes(partial)));
    } else if (completionContext.type === "value") {
      const key = completionContext.key;
      const partial = completionContext.partial.toLowerCase();
      const staticVals = schema.valuesByKey?.[key] ?? [];
      const filtered = staticVals.filter((v) => v.toLowerCase().includes(partial));
      setSuggestions(filtered);
      // async values
      if (schema.asyncValues) {
        schema.asyncValues(key, partial).then((async) => {
          setSuggestions([...filtered, ...async]);
        });
      }
    } else {
      setSuggestions([]);
    }
  }, [completionContext, schema]);

  const handleSelect = (suggestion: string) => {
    // 현재 caret 위치의 token을 suggestion으로 교체
    const next = applySuggestion(value, caretPos, suggestion, completionContext);
    setValue(next);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      // open 트리거 (입력 시작 등)
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      case "Enter":
        if (suggestions[activeIndex]) {
          e.preventDefault();
          handleSelect(suggestions[activeIndex]!);
        }
        return;
      case "Tab":
        if (suggestions[activeIndex]) {
          e.preventDefault();
          handleSelect(suggestions[activeIndex]!);
        }
        return;
      case "Escape":
        setOpen(false);
        return;
    }
  };

  // 토큰 칩 + 자유 텍스트 시각 렌더링
  // chip 스타일은 토큰만 칩으로 표시, 사용자 입력은 textarea/input으로
  // 단순화 위해 v1은 단일 textarea + overlay positioning 회피 → 단순 input.

  return (
    <div className={className} style={{position:"relative", ...style}}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); setCaretPos(e.target.selectionStart ?? 0); }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onSelect={(e) => setCaretPos((e.target as HTMLInputElement).selectionStart ?? 0)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: "100%", padding: 8, fontSize: 13, fontFamily: "monospace" }}
      />
      {open && suggestions.length > 0 && (
        <div role="listbox" style={{
          position:"absolute", top:"100%", left:0, right:0, background: theme === "dark" ? "#1f2937" : "#fff",
          border: "1px solid #ddd", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          maxHeight: 240, overflowY: "auto", zIndex: 10,
        }}>
          {suggestions.map((s, i) => (
            <div
              key={s}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              style={{
                padding: "6px 10px",
                background: i === activeIndex ? (theme==="dark"?"#374151":"#f3f4f6") : "transparent",
                cursor: "pointer",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
      {/* tokenStyle="chip" 시 토큰 시각화는 별도 overlay (v1.1+ 검토 — v1은 단순 텍스트 + 자동완성만) */}
    </div>
  );
}
```

### 2.4 분석 헬퍼 — analyzeContext

```ts
interface CompletionContext {
  type: "key" | "value" | "operator" | "none";
  partial: string;
  key?: string;
}

function analyzeContext(value: string, caretPos: number, schema?: SmartSearchSchema): CompletionContext {
  // caret 위치 기준 직전 단어 추출
  const before = value.slice(0, caretPos);
  const lastSpace = before.lastIndexOf(" ");
  const token = before.slice(lastSpace + 1);

  // ":" 포함이면 value 자동완성
  const colonIdx = token.indexOf(":");
  if (colonIdx >= 0) {
    return {
      type: "value",
      key: token.slice(0, colonIdx),
      partial: token.slice(colonIdx + 1),
    };
  }
  // operator (>=, <= 등) 포함이면 value 자동완성
  const opMatch = token.match(/^(\w+)(>=|<=|>|<|!=|=)(.*)$/);
  if (opMatch) {
    return {
      type: "value",
      key: opMatch[1]!,
      partial: opMatch[3]!,
    };
  }

  // 그 외 — key 자동완성
  return {
    type: "key",
    partial: token,
  };
}

function applySuggestion(value: string, caretPos: number, suggestion: string, ctx: CompletionContext): string {
  const before = value.slice(0, caretPos);
  const after = value.slice(caretPos);
  const lastSpace = before.lastIndexOf(" ");
  const tokenStart = lastSpace + 1;

  if (ctx.type === "key") {
    return value.slice(0, tokenStart) + suggestion + ":" + after;
  } else if (ctx.type === "value") {
    return value.slice(0, tokenStart) + ctx.key + ":" + suggestion + " " + after;
  }
  return value;
}
```

### 2.5 배럴

```ts
export { SmartSearch } from "./SmartSearch";
export { parseQuery } from "./SmartSearch.parser";
export type { SmartSearchProps, SmartSearchSchema, ParsedQuery, ParsedToken, SmartSearchOperator, SmartSearchTheme, SmartSearchTokenStyle } from "./SmartSearch.types";
```

---

## 3. 파일 구조

```
src/components/SmartSearch/
├── SmartSearch.tsx
├── SmartSearch.parser.ts
├── SmartSearch.types.ts
└── index.ts
```

---

## 4. 데모 페이지

```tsx
const SCHEMA: SmartSearchSchema = {
  keys: ["status", "assignee", "label", "priority", "created"],
  valuesByKey: {
    status: ["open", "closed", "in-progress"],
    label: ["bug", "feature", "docs"],
    priority: ["low", "medium", "high"],
  },
  operators: { priority: ["=", ">=", "<="], created: [">", "<"] },
};

export function SmartSearchPage() {
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  return (
    <div>
      <h1>SmartSearch</h1>
      <Card.Root><Card.Header>Basic</Card.Header><Card.Body>
        <SmartSearch schema={SCHEMA} onQueryChange={setParsed} placeholder="status:open author:..." />
        <pre style={{marginTop:12,fontSize:12}}>{JSON.stringify(parsed, null, 2)}</pre>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Async values</Card.Header><Card.Body>
        <SmartSearch schema={{
          ...SCHEMA,
          asyncValues: async (key, q) => key === "assignee" ? ["alice","bob","charlie"].filter(u => u.includes(q)) : [],
        }} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dark</Card.Header><Card.Body style={{background:"#1f2937",padding:16}}>
        <SmartSearch theme="dark" schema={SCHEMA} />
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 5. 접근성

- input: `role="combobox"`, `aria-expanded`, `aria-controls`.
- 자동완성 드롭다운: `role="listbox"`, 항목 `role="option" aria-selected`.
- 키보드 네비 표준.

---

## 6. Edge cases

- **콜론만 입력**: `status:` → value 자동완성 (빈 partial).
- **따옴표 값**: `label:"good first issue"` — 파서가 따옴표 안 공백 보존.
- **숫자 비교**: `priority:>=5` — 문자열로 처리. 사용자가 컨슈머에서 number로 변환.
- **알 수 없는 키 + allowUnknownKeys=false**: 토큰 시각으로 invalid 표시 (v1은 단순 텍스트 입력 — 시각 검증 v1.1+).
- **빈 입력**: parsed.tokens=[], freeText="".

---

## 7. 구현 단계
- Phase 1: 파서 + 컴포넌트
- Phase 2: 데모
- Phase 3: 정리

## 8. 체크리스트
- [ ] 4개 파일
- [ ] typecheck/build
- [ ] parseQuery 단위 정확
- [ ] key/value/operator 자동완성
- [ ] 키보드 네비
- [ ] async values
- [ ] candidates / README
