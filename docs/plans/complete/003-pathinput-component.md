# PathInput 컴포넌트 설계문서

## Context

plastic 라이브러리에 5번째 컴포넌트 `PathInput`을 추가한다.
파일 경로를 입력/선택하는 복합 컨트롤로, **경로 텍스트 입력 필드**와 **브라우저 열기 버튼**이 핵심 서브 요소다.
두 요소는 함께 또는 독립적으로 사용할 수 있으며, 드래그 앤 드롭, 검증 피드백 등 편의 기능을 포함한다.

---

## Compound Component 구조

```
PathInput.Root          컨텍스트 제공, hidden file input, 검증 로직
PathInput.Input         경로 텍스트 입력, drag & drop 지원
PathInput.BrowseButton  네이티브 파일 대화상자 트리거
PathInput.Status        검증 메시지/아이콘 표시 영역
PathInput.FileName      파일명 표시 (Input 없이 사용 시)
```

### 사용 패턴

```tsx
{/* 결합: Input + BrowseButton */}
<PathInput.Root value={path} onChange={setPath} validate={myValidator}>
  <PathInput.Input placeholder="/path/to/file" />
  <PathInput.BrowseButton>찾아보기</PathInput.BrowseButton>
  <PathInput.Status />
</PathInput.Root>

{/* Input만 (드래그 앤 드롭) */}
<PathInput.Root value={path} onChange={setPath}>
  <PathInput.Input placeholder="파일을 드래그하세요" />
</PathInput.Root>

{/* BrowseButton만 + 파일명 표시 */}
<PathInput.Root value={path} onChange={setPath}>
  <PathInput.BrowseButton>파일 선택</PathInput.BrowseButton>
  <PathInput.FileName />
</PathInput.Root>
```

---

## TypeScript 인터페이스

### 테마 & 검증 타입

```typescript
export type PathInputTheme = "light" | "dark";
export type ValidationStatus = "valid" | "invalid" | "warning";

export interface ValidationResult {
  status: ValidationStatus;
  message?: string | undefined;
}

export interface ValidationState {
  status: ValidationStatus | "idle";
  message: string;
}
```

### Root Props

```typescript
export interface PathInputRootProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;

  // ── 값 ──────────────────────────────────────
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;

  // ── 파일 대화상자 설정 ────────────────────────
  disabled?: boolean | undefined;
  accept?: string | undefined;           // ".ts,.tsx" 또는 "image/*"
  multiple?: boolean | undefined;
  directory?: boolean | undefined;       // webkitdirectory (폴더 선택)

  // ── 검증 ────────────────────────────────────
  validate?: ((path: string) => ValidationResult | Promise<ValidationResult>) | undefined;
  validateDebounce?: number | undefined;  // default: 300ms

  // ── 외부 제어 검증 (validate 보다 우선) ─────
  validationStatus?: ValidationStatus | undefined;
  validationMessage?: string | undefined;

  // ── 테마 ────────────────────────────────────
  theme?: PathInputTheme | undefined;

  // ── 파일 객체 콜백 ──────────────────────────
  onFilesSelected?: ((files: File[]) => void) | undefined;
}
```

### Input Props

```typescript
export interface PathInputInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "disabled" | "type"> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### BrowseButton Props

```typescript
export interface PathInputBrowseButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled"> {
  children?: ReactNode | undefined;      // default: "Browse"
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Status Props

```typescript
export interface PathInputStatusProps extends HTMLAttributes<HTMLDivElement> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ((state: ValidationState) => ReactNode) | undefined;  // 커스텀 렌더
}
```

### FileName Props

```typescript
export interface PathInputFileNameProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  placeholder?: string | undefined;      // default: "선택된 파일 없음"
  maxWidth?: number | undefined;         // default: 200 (px)
}
```

---

## Context 구조

```typescript
interface PathInputContextValue {
  value: string;
  setValue: (next: string) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  validationState: ValidationState;
  isValidating: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  triggerBrowse: () => void;
  disabled: boolean;
  accept: string | undefined;
  multiple: boolean;
  directory: boolean;
  theme: PathInputTheme;
  onFilesSelected?: ((files: File[]) => void) | undefined;
  statusId: string;                      // useId()로 생성, Input aria-describedby 연결
}
```

---

## 상태 머신

```
┌──────────────────────────────────────────────────┐
│  IDLE (value: "", validationState: "idle")        │
│    ├─ 타이핑 ─────────→ VALIDATING                │
│    ├─ 파일 드롭 ──────→ VALIDATING                │
│    └─ 파일 선택 ──────→ VALIDATING                │
└──────────────────────────────────────────────────┘
              ↑                        │
              │                        ↓
┌──────────────┐    ┌──────────────────────────────┐
│  값 변경 /    │    │  VALIDATING                   │
│  값 비움      │    │  (isValidating: true)          │
│              │    │  validate() 완료 → 결과 반영    │
└──────────────┘    └──────────────────────────────┘
              ↑                        │
              │                        ↓
              │    ┌──────────────────────────────┐
              │    │  VALID / INVALID / WARNING     │
              └────│  새 입력 → VALIDATING           │
                   │  값 비움 → IDLE                 │
                   └──────────────────────────────┘

드래그 오버 부상태 (Input 로컬, 직교):
  idle ──dragenter──→ drag-over ──dragleave/drop──→ idle

DISABLED: 모든 전환 차단, 전 서브 컴포넌트 비활성
```

### 검증 우선순위
- `validationStatus` (외부 제어) 설정 시 → `validate` 함수 호출하지 않음
- `validate` 함수만 있을 때 → 디바운스 후 내부 실행
- 둘 다 없을 때 → 항상 `"idle"`

---

## DOM 구조

```html
<div role="group" aria-label="File path input" class="..." {...rootRest}>
  <!-- hidden file input -->
  <input type="file"
    ref={fileInputRef}
    style="display: none"
    accept={accept}
    multiple={multiple}
    webkitdirectory={directory}
    aria-hidden="true"
    tabIndex={-1}
    onChange={handleFileSelect}
  />

  <PathInputContext.Provider value={ctx}>
    {children}
  </PathInputContext.Provider>
</div>
```

### Input DOM

```html
<input
  type="text"
  value={ctx.value}
  disabled={ctx.disabled}
  placeholder={placeholder}
  onChange={e => ctx.setValue(e.target.value)}
  onDragEnter={...}
  onDragOver={...}
  onDragLeave={...}
  onDrop={...}
  aria-invalid={ctx.validationState.status === "invalid"}
  aria-describedby={ctx.statusId}
  style={{
    border: `1px solid ${borderColor}`,
    borderRadius: "0.375rem",
    padding: "0.5rem 0.75rem",
    background: isDragOver ? dragOverBg : inputBg,
    color: inputText,
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    ...
  }}
  {...rest}
/>
```

### Status DOM

```html
<div
  id={ctx.statusId}
  role="status"
  aria-live="polite"
  style={{ display: "flex", alignItems: "center", gap: "0.375rem", ... }}
>
  {isValidating ? <SpinnerIcon /> : <StatusIcon />}
  <span>{message}</span>
</div>
```

---

## 테마 색상 맵

### 입력 필드 테두리 (검증 상태별)

```typescript
const borderColors: Record<PathInputTheme, Record<ValidationState["status"], string>> = {
  light: { idle: "#d1d5db", valid: "#22c55e", invalid: "#ef4444", warning: "#f59e0b" },
  dark:  { idle: "#4b5563", valid: "#16a34a", invalid: "#dc2626", warning: "#d97706" },
};
```

### 상태 텍스트 색상

```typescript
const statusTextColors: Record<PathInputTheme, Record<ValidationState["status"], string>> = {
  light: { idle: "#6b7280", valid: "#16a34a", invalid: "#dc2626", warning: "#d97706" },
  dark:  { idle: "#9ca3af", valid: "#22c55e", invalid: "#ef4444", warning: "#f59e0b" },
};
```

### 기타

```typescript
const inputBg:    Record<PathInputTheme, string> = { light: "#ffffff", dark: "#1f2937" };
const inputText:  Record<PathInputTheme, string> = { light: "#111827", dark: "#f3f4f6" };
const dragOverBg: Record<PathInputTheme, string> = { light: "rgba(59,130,246,0.04)", dark: "rgba(96,165,250,0.06)" };
const dragOverBorder = "#3b82f6";  // blue-500
```

---

## 드래그 앤 드롭

### 브라우저 제한
- 웹 브라우저 보안 샌드박스: `File.name`만 접근 가능 (파일명만), 전체 OS 경로 불가
- `webkitRelativePath`: `<input webkitdirectory>`로 선택 시에만 상대 경로 제공
- Electron/Tauri: `File.path` (비표준) 접근 가능 → `onFilesSelected` 콜백으로 `File` 객체 전달하여 소비자가 전체 경로 추출 가능

### 드롭 핸들러

```typescript
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);
  if (ctx.disabled) return;

  const droppedFiles = Array.from(e.dataTransfer.files);
  if (droppedFiles.length === 0) return;

  ctx.setFiles(droppedFiles);
  ctx.onFilesSelected?.(droppedFiles);

  const file = droppedFiles[0]!;
  const path = file.webkitRelativePath || file.name;

  if (ctx.multiple && droppedFiles.length > 1) {
    ctx.setValue(droppedFiles.map(f => f.webkitRelativePath || f.name).join(", "));
  } else {
    ctx.setValue(path);
  }
};
```

### 시각 피드백
- 드래그 오버: 테두리 색상 `#3b82f6` (blue), 배경 틴트, 점선 테두리 스타일
- 드래그 리브/드롭: 원래 스타일로 복귀

---

## 파일 대화상자 통합

Root 내 hidden `<input type="file">`:

```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFiles = Array.from(e.target.files ?? []);
  if (selectedFiles.length === 0) return;

  setFiles(selectedFiles);
  onFilesSelected?.(selectedFiles);

  const file = selectedFiles[0]!;
  const path = file.webkitRelativePath || file.name;

  if (multiple && selectedFiles.length > 1) {
    setValue(selectedFiles.map(f => f.webkitRelativePath || f.name).join(", "));
  } else {
    setValue(path);
  }

  // 같은 파일 재선택 허용
  e.target.value = "";
};
```

---

## 검증 디바운스 구현

```typescript
// usePathValidation.ts (PathInputRoot 내부 또는 co-located hook)
const sequenceRef = useRef(0);
const timerRef = useRef<ReturnType<typeof setTimeout>>();

useEffect(() => {
  if (validationStatus !== undefined) return;   // 외부 제어 모드
  if (!validate) {
    setValidationState({ status: "idle", message: "" });
    setIsValidating(false);
    return;
  }
  if (value === "") {
    setValidationState({ status: "idle", message: "" });
    setIsValidating(false);
    return;
  }

  clearTimeout(timerRef.current);
  const seq = ++sequenceRef.current;

  timerRef.current = setTimeout(async () => {
    setIsValidating(true);
    try {
      const result = await validate(value);
      if (seq !== sequenceRef.current) return;  // stale 결과 무시
      setValidationState({ status: result.status, message: result.message ?? "" });
    } catch {
      if (seq !== sequenceRef.current) return;
      setValidationState({ status: "invalid", message: "Validation failed" });
    } finally {
      if (seq === sequenceRef.current) setIsValidating(false);
    }
  }, validateDebounce);

  return () => clearTimeout(timerRef.current);
}, [value, validate, validateDebounce, validationStatus]);
```

핵심: `sequenceRef`로 비동기 레이스 컨디션 방지. 빠른 타이핑 시 이전 검증 결과가 뒤늦게 도착해도 무시.

---

## 상태 아이콘 (인라인 SVG)

`PathInputStatus.tsx` 내부 private 컴포넌트:

- **ValidIcon**: 체크마크 (polyline)
- **InvalidIcon**: X 원형 (circle + 두 line)
- **WarningIcon**: 삼각형 경고 (path + line)
- **SpinnerIcon**: 회전 아이콘 (CSS animation `spin 1s linear infinite`)

모두 `width="14" height="14"`, `stroke="currentColor"`, `strokeWidth="2.5"`.
색상은 부모 `color` 속성으로 제어 (currentColor 상속).

---

## 접근성

| 요소 | 속성 | 값 |
|------|------|---|
| Root `<div>` | `role` | `"group"` |
| Root `<div>` | `aria-label` | `"File path input"` |
| Input `<input>` | `aria-invalid` | `validationState.status === "invalid"` |
| Input `<input>` | `aria-describedby` | `statusId` (Status 컴포넌트 연결) |
| BrowseButton | `aria-label` | children가 문자열이 아닐 때 `"Browse files"` |
| Status `<div>` | `id` | `statusId` (useId 생성) |
| Status `<div>` | `role` | `"status"` |
| Status `<div>` | `aria-live` | `"polite"` |
| Hidden file input | `aria-hidden` | `true` |
| Hidden file input | `tabIndex` | `-1` |

키보드: Tab으로 Input ↔ BrowseButton 자연스러운 포커스 이동. Enter/Space로 BrowseButton 활성화.

---

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| 긴 경로 | Input은 스크롤 가능, FileName은 `text-overflow: ellipsis` + `title` 툴팁 |
| 다중 파일 선택 | 쉼표 구분 문자열. 소비자가 `onFilesSelected`로 File 객체 직접 처리 가능 |
| 값 비우기 | `value=""` → 검증 `"idle"` 리셋 |
| 브라우저 경로 제한 | 문서화: 웹에서는 파일명만 가능. `onFilesSelected`로 Electron/Tauri 대응 |
| `validate` Promise reject | catch → `"invalid"` + 일반 오류 메시지 |
| 빠른 타이핑 중 비동기 검증 | 시퀀스 카운터로 stale 결과 폐기 |
| `accept` + 드롭 | 브라우저가 드롭 시 `accept` 필터링 안 함 → validate 콜백에서 처리 |
| `directory` + 드롭 | 드롭은 개별 파일 수락. 문서화 |
| BrowseButton children 없음 | 기본 텍스트 `"Browse"` 렌더링 |
| `validationStatus` + `validate` 동시 | `validationStatus` 우선, `validate` 미호출 |

---

## 애니메이션 스펙

| 전환 | 속성 | 시간 | 이징 |
|------|------|------|------|
| 테두리 색상 (검증) | `border-color` | 150ms | `ease` |
| 배경 틴트 (드래그 오버) | `background-color` | 150ms | `ease` |
| 상태 메시지 색상 | `color` | 150ms | `ease` |
| 스피너 회전 | `transform: rotate` | 1000ms | `linear` (infinite) |
| 버튼 hover | `background-color` | Tailwind `transition-colors` |

---

## 수정 대상 파일

### 신규 생성

1. **`src/components/PathInput/PathInput.types.ts`** — 전체 타입 정의
2. **`src/components/PathInput/PathInputRoot.tsx`** — Context, hidden file input, 검증 로직 (~120줄)
3. **`src/components/PathInput/PathInputInput.tsx`** — 텍스트 입력 + drag & drop (~100줄)
4. **`src/components/PathInput/PathInputBrowseButton.tsx`** — 파일 대화상자 트리거 (~40줄)
5. **`src/components/PathInput/PathInputStatus.tsx`** — 검증 상태 표시 + SVG 아이콘 (~80줄)
6. **`src/components/PathInput/PathInputFileName.tsx`** — 파일명 표시 (~35줄)
7. **`src/components/PathInput/PathInput.tsx`** — Object.assign 조립
8. **`src/components/PathInput/index.ts`** — 배럴 export
9. **`src/components/_shared/useControllable.ts`** — 공유 훅 추출
10. **`demo/src/pages/PathInputPage.tsx`** — 데모 페이지 (~400줄)

### 기존 수정

11. **`src/components/index.ts`** — `export * from "./PathInput"` 추가
12. **`src/components/Actionable/ActionableCheckboxTrigger.tsx`** — useControllable import 경로 변경
13. **`src/components/Actionable/ActionableSwipeTrigger.tsx`** — 동일
14. **`src/components/Actionable/ActionableIconTrigger.tsx`** — 동일
15. **`src/components/Actionable/ActionableRevealTrigger.tsx`** — 동일
16. **`demo/src/App.tsx`** — PathInput 페이지 NAV 추가 + import + 라우팅

---

## useControllable 공유 훅 추출

현재 위치: `src/components/Actionable/useControllable.ts`
이동 위치: `src/components/_shared/useControllable.ts`

4개 Actionable 파일에서 import 경로를 `"./useControllable"` → `"../_shared/useControllable"`로 변경:
- `ActionableCheckboxTrigger.tsx`
- `ActionableSwipeTrigger.tsx`
- `ActionableIconTrigger.tsx`
- `ActionableRevealTrigger.tsx`

기존 `src/components/Actionable/useControllable.ts`는 삭제.

---

## 데모 페이지

### NAV 엔트리

```typescript
{
  id: "pathinput", label: "PathInput", description: "파일 경로 입력",
  sections: [
    { label: "Combined", id: "combined" },
    { label: "Input Only", id: "input-only" },
    { label: "Browse Only", id: "browse-only" },
    { label: "Drag & Drop", id: "drag-drop" },
    { label: "Validation", id: "validation" },
    { label: "Disabled", id: "disabled" },
    { label: "Dark Theme", id: "dark-theme" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
    { label: "Playground", id: "playground" },
  ],
}
```

### 데모 섹션 상세

1. **Combined** — Input + BrowseButton + Status, 기본 조합
2. **Input Only** — Input만, 드래그 앤 드롭 안내 placeholder
3. **Browse Only** — BrowseButton + FileName, 텍스트 입력 없음
4. **Drag & Drop** — Input에 파일 드래그 시 시각 피드백 강조
5. **Validation** — 3가지:
   - 동기 검증 (확장자 체크)
   - 비동기 검증 (500ms 시뮬레이션)
   - 외부 제어 검증 (`validationStatus` / `validationMessage`)
   - valid(초록), invalid(빨강), warning(노랑) 3상태 모두 시연
6. **Disabled** — 전체 비활성 상태
7. **Dark Theme** — 어두운 배경 + `theme="dark"`
8. **Props** — Root, Input, BrowseButton, Status, FileName 각각 테이블
9. **Usage** — CodeView 코드 블록
10. **Playground** — theme, disabled, accept, multiple, directory, validateDebounce, validationStatus, validationMessage 인터랙티브 제어

---

## 구현 순서

1. `useControllable` 공유 훅 추출 + Actionable import 경로 수정
2. `PathInput.types.ts` 타입 정의
3. `PathInputRoot.tsx` (Context, hidden file input, 검증 로직)
4. `PathInputInput.tsx` (텍스트 입력, drag & drop)
5. `PathInputBrowseButton.tsx`
6. `PathInputStatus.tsx` (아이콘, 색상, aria-live)
7. `PathInputFileName.tsx`
8. `PathInput.tsx` (Object.assign 조립)
9. `index.ts` 배럴 + `src/components/index.ts` 수정
10. `demo/src/pages/PathInputPage.tsx` 데모 페이지
11. `demo/src/App.tsx` NAV + 라우팅 추가

---

## 검증 방법

```bash
npm run typecheck        # 타입 체크
npx tsup                 # 빌드 성공 확인
cd demo && npm run dev   # http://localhost:5173/#/pathinput
```

- [ ] Input 타이핑 → value 반영
- [ ] BrowseButton 클릭 → 파일 대화상자 → 선택 → Input에 파일명 반영
- [ ] Input에 파일 드래그 → 드래그 오버 시각 피드백 → 드롭 → 파일명 반영
- [ ] validate 함수 동작 → 디바운스 후 검증 → 테두리/상태 색상 변경
- [ ] validationStatus 외부 제어 → validate 미호출, 상태 직접 반영
- [ ] disabled → 모든 인터랙션 차단
- [ ] light/dark 테마 전환
- [ ] FileName: 긴 경로 말줄임 + title 툴팁
- [ ] 키보드: Tab 포커스 이동, Enter/Space BrowseButton 활성화
- [ ] aria-invalid, aria-describedby, aria-live 스크린리더 동작
