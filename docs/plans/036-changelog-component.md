# Changelog 컴포넌트 설계문서

## Context

버전별 변경 로그를 표시하는 `Changelog` 컴포넌트. "Keep a Changelog" 표준 (https://keepachangelog.com/) 카테고리 채택:
- **Added** — 신규 기능
- **Changed** — 기존 기능 변경
- **Deprecated** — 곧 제거될 기능
- **Removed** — 제거된 기능
- **Fixed** — 버그 수정
- **Security** — 보안 관련

데이터 소스 결정 (v1):
- **option A**: 마크다운 파일 자동 파싱 (CHANGELOG.md) — 파서 복잡, 의존 추가.
- **option B**: 컴포넌트 props로 구조화된 데이터 받음 — 명확, 단순.

→ **option B** 채택. 사용자가 자체 마크다운 파서 + 변환 로직 자유롭게 사용.

참고:
- **Keep a Changelog** — 마크다운 포맷 표준.
- **Algolia DocSearch** — 변경 로그 페이지 패턴.
- **Auth0 changelog** — 카드형 + 카테고리 필터.
- **Linear changelog** — 시간순 + 풍부한 내용.

본 레포 내부 참조:
- `src/components/Tag/` (plan 027) — 카테고리 칩.
- `src/components/Stack/` (plan 029) — 레이아웃.
- `src/components/Accordion/` (설계됨, 022) — 펼침/접힘.

---

## 0. TL;DR

```tsx
// 1. 기본
<Changelog
  entries={[
    {
      version: "1.2.0",
      date: "2026-04-26",
      changes: {
        added: ["새 컴포넌트 X", "Y 기능"],
        fixed: ["Z 버그 수정"],
      },
    },
    {
      version: "1.1.0",
      date: "2026-03-15",
      changes: { changed: ["A 동작 변경"] },
    },
  ]}
/>

// 2. 펼침/접힘
<Changelog entries={...} collapsible defaultOpenLatest />
// → 최신 버전만 펼침, 나머지 접힘

// 3. 검색/필터
<Changelog entries={...} searchable filterByCategory />

// 4. 헤더 슬롯
<Changelog entries={...} title="Plastic 변경 로그" subtitle="릴리스 노트" />

// 5. 단일 entry 렌더 (compound)
<Changelog.Root>
  {entries.map((e) => (
    <Changelog.Entry key={e.version} version={e.version} date={e.date}>
      <Changelog.Section type="added" items={e.changes.added} />
      <Changelog.Section type="fixed" items={e.changes.fixed} />
    </Changelog.Entry>
  ))}
</Changelog.Root>
```

---

## 1. Goals / Non-goals

### Goals (v1)
1. `entries` prop — 구조화 데이터 배열.
2. 6 카테고리: added/changed/deprecated/removed/fixed/security.
3. 카테고리별 색상 (Tag 컴포넌트 활용).
4. `collapsible` — 각 entry 펼침/접힘.
5. `defaultOpenLatest` — 최신만 펼침.
6. `searchable` — 입력으로 변경 항목 필터.
7. `filterByCategory` — 카테고리 토글 필터.
8. compound — `Root`, `Entry`, `Section`.
9. theme light/dark.
10. version + date + 기타 메타 (author, link).

### Non-goals (v1)
- 마크다운 자동 파싱 (KAC.md → entries) — 사용자가 직접.
- RSS feed 생성.
- diff between versions.
- 사용자 댓글/피드백.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Changelog/Changelog.types.ts`

```ts
export type ChangelogCategory = "added" | "changed" | "deprecated" | "removed" | "fixed" | "security";

export interface ChangelogChanges {
  added?: string[];
  changed?: string[];
  deprecated?: string[];
  removed?: string[];
  fixed?: string[];
  security?: string[];
}

export interface ChangelogEntry {
  version: string;        // "1.2.0"
  date?: string;          // ISO date 권장
  changes: ChangelogChanges;
  /** 커밋 / PR / blog 링크. */
  link?: string;
  /** 추가 설명 (예: 릴리스 노트). */
  description?: string;
}

export interface ChangelogProps {
  entries: ChangelogEntry[];
  title?: string;
  subtitle?: string;
  collapsible?: boolean;
  defaultOpenLatest?: boolean;
  searchable?: boolean;
  filterByCategory?: boolean;
  theme?: "light" | "dark";
  className?: string;
  style?: CSSProperties;
}
```

### 2.2 카테고리 색상 매핑

```ts
const categoryColors: Record<ChangelogCategory, "blue" | "green" | "yellow" | "red" | "gray" | "purple"> = {
  added: "green",
  changed: "blue",
  deprecated: "yellow",
  removed: "red",
  fixed: "purple",
  security: "red",
};

const categoryLabels: Record<ChangelogCategory, string> = {
  added: "Added",
  changed: "Changed",
  deprecated: "Deprecated",
  removed: "Removed",
  fixed: "Fixed",
  security: "Security",
};
```

### 2.3 컴포넌트

```tsx
export function Changelog(props: ChangelogProps) {
  const {
    entries, title, subtitle,
    collapsible = false, defaultOpenLatest = false,
    searchable = false, filterByCategory = false,
    theme = "light", className, style,
  } = props;

  const [search, setSearch] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<ChangelogCategory>>(
    new Set(["added","changed","deprecated","removed","fixed","security"])
  );
  const [openVersions, setOpenVersions] = useState<Set<string>>(() => {
    if (defaultOpenLatest && entries.length > 0) return new Set([entries[0]!.version]);
    if (collapsible) return new Set();
    return new Set(entries.map((e) => e.version));
  });

  const filteredEntries = useMemo(() => {
    return entries.map((entry) => {
      const filteredChanges: ChangelogChanges = {};
      (Object.keys(entry.changes) as ChangelogCategory[]).forEach((cat) => {
        if (!activeCategories.has(cat)) return;
        const items = entry.changes[cat]?.filter((i) =>
          search === "" || i.toLowerCase().includes(search.toLowerCase())
        ) ?? [];
        if (items.length > 0) filteredChanges[cat] = items;
      });
      return { ...entry, changes: filteredChanges };
    }).filter((e) => Object.keys(e.changes).length > 0);
  }, [entries, search, activeCategories]);

  const toggleVersion = (v: string) => {
    setOpenVersions((s) => {
      const next = new Set(s);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  const toggleCategory = (c: ChangelogCategory) => {
    setActiveCategories((s) => {
      const next = new Set(s);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  return (
    <div className={className} style={style}>
      {(title || subtitle) && (
        <div style={{marginBottom: 16}}>
          {title && <h2 style={{margin:0}}>{title}</h2>}
          {subtitle && <p style={{margin:0,color:"#6b7280"}}>{subtitle}</p>}
        </div>
      )}

      {(searchable || filterByCategory) && (
        <div style={{marginBottom:16, display:"flex", gap:12, alignItems:"center"}}>
          {searchable && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색..."
              style={{flex:1, padding:6}}
            />
          )}
          {filterByCategory && (
            <div style={{display:"flex",gap:4}}>
              {(["added","changed","fixed","removed","security"] as ChangelogCategory[]).map((c) => (
                <Tag
                  key={c}
                  clickable
                  variant={activeCategories.has(c) ? "solid" : "outline"}
                  color={categoryColors[c]}
                  size="sm"
                  onClick={() => toggleCategory(c)}
                >
                  {categoryLabels[c]}
                </Tag>
              ))}
            </div>
          )}
        </div>
      )}

      <Stack gap={16}>
        {filteredEntries.map((entry) => {
          const isOpen = !collapsible || openVersions.has(entry.version);
          return (
            <article key={entry.version} style={{
              border: `1px solid ${theme==="dark"?"#374151":"#e5e7eb"}`,
              borderRadius: 8, padding: 16,
            }}>
              <header
                style={{display:"flex",alignItems:"center",gap:12,cursor:collapsible?"pointer":"default"}}
                onClick={collapsible ? () => toggleVersion(entry.version) : undefined}
              >
                <h3 style={{margin:0}}>{entry.version}</h3>
                {entry.date && <Tag size="sm" color="gray" variant="outline">{entry.date}</Tag>}
                {entry.link && (
                  <a href={entry.link} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} style={{marginLeft:"auto"}}>
                    <Icon name="external-link" size="sm" />
                  </a>
                )}
                {collapsible && (
                  <Icon
                    name="chevron-down"
                    rotate={isOpen ? 180 : 0}
                    style={{marginLeft:entry.link?0:"auto"}}
                  />
                )}
              </header>

              {entry.description && isOpen && (
                <p style={{marginTop:8,color:"#6b7280"}}>{entry.description}</p>
              )}

              {isOpen && (
                <Stack gap={12} style={{marginTop:12}}>
                  {(Object.keys(entry.changes) as ChangelogCategory[]).map((cat) => {
                    const items = entry.changes[cat];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={cat}>
                        <Tag color={categoryColors[cat]} size="sm">{categoryLabels[cat]}</Tag>
                        <ul style={{margin:"8px 0 0", paddingLeft:24}}>
                          {items.map((it, i) => <li key={i}>{it}</li>)}
                        </ul>
                      </div>
                    );
                  })}
                </Stack>
              )}
            </article>
          );
        })}
        {filteredEntries.length === 0 && (
          <p style={{textAlign:"center",color:"#9ca3af"}}>검색 결과 없음</p>
        )}
      </Stack>
    </div>
  );
}
```

### 2.4 Compound API (선택)

```tsx
export const ChangelogRoot: FC<{children:ReactNode}> = ({children}) => <div>{children}</div>;
export const ChangelogEntry: FC<{version:string,date?:string,children:ReactNode}> = ({version,date,children}) => (...);
export const ChangelogSection: FC<{type:ChangelogCategory,items:string[]}> = ({type,items}) => (...);

Changelog.Root = ChangelogRoot;
Changelog.Entry = ChangelogEntry;
Changelog.Section = ChangelogSection;
```

### 2.5 배럴

```ts
export { Changelog } from "./Changelog";
export type { ChangelogProps, ChangelogEntry, ChangelogChanges, ChangelogCategory } from "./Changelog.types";
```

---

## 3. 파일 구조

```
src/components/Changelog/
├── Changelog.tsx
├── ChangelogRoot.tsx
├── ChangelogEntry.tsx
├── ChangelogSection.tsx
├── Changelog.types.ts
└── index.ts
```

---

## 4. 데모 페이지

```tsx
const SAMPLE: ChangelogEntry[] = [
  {
    version: "1.2.0",
    date: "2026-04-26",
    changes: {
      added: ["Icon 컴포넌트", "LineNumbers 컴포넌트", "Calendar 분리"],
      fixed: ["DatePicker locale 버그"],
    },
    link: "https://github.com/.../releases/tag/v1.2.0",
  },
  {
    version: "1.1.0",
    date: "2026-03-15",
    changes: {
      added: ["Combobox", "DatePicker"],
      changed: ["Select API 정리"],
    },
  },
  {
    version: "1.0.0",
    date: "2026-01-01",
    description: "최초 안정 릴리스.",
    changes: {
      added: ["Button, Card, Toast, Dialog 외 15개 컴포넌트"],
    },
  },
];

export function ChangelogPage() {
  return (
    <div>
      <h1>Changelog</h1>
      <Card.Root><Card.Header>Basic</Card.Header><Card.Body>
        <Changelog entries={SAMPLE} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Collapsible + open latest</Card.Header><Card.Body>
        <Changelog entries={SAMPLE} collapsible defaultOpenLatest />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Searchable + filter</Card.Header><Card.Body>
        <Changelog entries={SAMPLE} searchable filterByCategory />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Header</Card.Header><Card.Body>
        <Changelog entries={SAMPLE} title="Plastic Releases" subtitle="버전별 변경 로그" />
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 5. 접근성

- `<article>` 시맨틱.
- 헤더 `<h3>`.
- collapsible: button 시맨틱 + aria-expanded.
- 링크: target="_blank" + rel="noopener".

## 6. Edge cases
- 빈 entries: "변경 로그 없음" 표시 (v1 미포함, 사용자 책임).
- 빈 카테고리: 자동 숨김.
- 검색 결과 0: "검색 결과 없음".
- 한 entry에 모든 카테고리 동시: 모두 표시.

## 7. 구현 단계
- Phase 1: 컴포넌트
- Phase 2: 데모
- Phase 3: 정리

## 8. 체크리스트
- [ ] 6개 파일
- [ ] typecheck/build
- [ ] 모든 카테고리 시각 정상
- [ ] collapsible 작동
- [ ] search 필터
- [ ] category 토글
- [ ] candidates / README
