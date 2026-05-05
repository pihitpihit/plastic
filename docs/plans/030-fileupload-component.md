# FileUpload / Dropzone 설계문서

## Context

파일 선택 + 드래그 앤 드롭 영역을 표준화한 `FileUpload` 컴포넌트 추가. 단일 컴포넌트가 다음 두 모드를 모두 지원:
- **버튼 모드**: "파일 선택" 버튼만 노출. 클릭 시 파일 다이얼로그.
- **Dropzone 모드**: 큰 영역. 드래그 앤 드롭 + 클릭 시 다이얼로그.

native `<input type="file">`은 다음 한계:
- 시각 통일 어려움 (브라우저별 다름).
- 드래그 앤 드롭 별도 핸들러 필요.
- 파일 미리보기·진행률·검증 표시 슬롯 없음.

참고 (prior art):
- **react-dropzone** — 가장 유명. `useDropzone` 훅 + render prop. accept 필터, multiple, maxSize 등.
- **filepond** — 풀 기능 (이미지 미리보기, 자동 업로드).
- **uppy** — 큰 라이브러리. 청크 업로드, 진행률.
- **shadcn ui** 등 — 자체 dropzone 패턴.

본 레포 내부 참조:
- `src/components/Icon/` (plan 023) — `<Icon name="upload" />`, `<Icon name="x" />`.
- `src/components/Progress/` (설계됨, 022) — 업로드 진행률 표시 합성.
- `src/components/Stack/` (plan 029) — 파일 리스트 레이아웃.
- `src/components/PathInput/PathInputInput.tsx:55` — 기존 drop effect 처리 참조.

---

## 0. TL;DR

```tsx
// 1. Dropzone 모드 (기본)
<FileUpload onFiles={(files) => setFiles(files)}>
  <Icon name="upload" size="xl" />
  <p>여기로 파일을 드롭하거나 클릭하여 선택</p>
</FileUpload>

// 2. 버튼 모드
<FileUpload variant="button">파일 선택</FileUpload>

// 3. accept (MIME 또는 확장자)
<FileUpload accept="image/*" />
<FileUpload accept=".pdf,.doc,.docx" />

// 4. multiple
<FileUpload multiple onFiles={(files) => ...} />

// 5. 크기 제한
<FileUpload maxSize={5 * 1024 * 1024} onFiles={...} onReject={(rejected) => alert(rejected[0].reason)} />

// 6. 갯수 제한
<FileUpload maxFiles={3} multiple />

// 7. 미리보기 슬롯 (compound)
<FileUpload.Root>
  <FileUpload.Dropzone />
  <FileUpload.Preview /> {/* 선택된 파일 리스트 */}
</FileUpload.Root>

// 8. 진행률 (외부 업로드 후 prop 주입)
<FileUpload.Root>
  <FileUpload.Dropzone />
  <FileUpload.Preview
    files={files}
    progress={(file) => uploadProgress[file.name] ?? 0}
  />
</FileUpload.Root>

// 9. controlled
<FileUpload files={files} onFiles={setFiles} />

// 10. validate (사용자 정의)
<FileUpload validate={(file) => file.name.endsWith(".csv") ? null : "CSV만 허용"} />
```

핵심 원칙:
- **두 변형(variant)**: `dropzone` (기본, 큰 영역), `button` (단순 트리거).
- **Dropzone은 클릭 시도 작동** — Dropzone이 곧 input 트리거.
- **검증**: accept(MIME/ext) + maxSize + maxFiles + 사용자 validate.
- **거부 콜백**: `onReject(rejections: { file, reason }[])` — 사용자에게 알림 책임.
- **controlled / uncontrolled**.
- **시각 상태**: idle / dragOver / disabled.
- **headless 우선** — Compound 패턴으로 자유 합성.
- **a11y**: 키보드로 dropzone 클릭 (Enter/Space) → 파일 다이얼로그.

---

## 1. Goals / Non-goals

### Goals (v1)
1. `variant: "dropzone" | "button"`.
2. `accept` (MIME 또는 확장자 콤마 리스트).
3. `multiple`, `maxFiles`, `maxSize` (bytes).
4. `validate?: (file: File) => string | null` — null = 통과.
5. `onFiles(files: File[])`, `onReject(rejections: FileRejection[])`.
6. controlled (`files` + `onFiles`) / uncontrolled (`defaultFiles`).
7. drag over 시각 피드백.
8. compound — `.Root`, `.Dropzone`, `.Trigger`, `.Preview`, `.Item`.
9. theme light/dark.
10. disabled 처리.
11. 키보드 활성 (Enter/Space).
12. 배럴 export.

### Non-goals (v1)
- 자동 업로드 (HTTP) — 사용자가 onFiles 받아 처리.
- 청크 업로드.
- 이미지 미리보기 자동 생성 (URL.createObjectURL) — Preview는 파일명만, 사용자가 자체 미리보기 합성.
- 진행률 자체 관리 — props로 받음 (외부 상태).
- 클립보드 paste 지원 — v1.1+.
- 폴더 업로드 (`webkitdirectory`) — v1.1+.

---

## 2. 공개 API

### 2.1 타입 — `src/components/FileUpload/FileUpload.types.ts`

```ts
import type { CSSProperties, ReactNode } from "react";

export type FileUploadVariant = "dropzone" | "button";
export type FileUploadTheme = "light" | "dark";

export interface FileRejection {
  file: File;
  reason: "type" | "size" | "count" | "validate";
  message: string;
}

export interface FileUploadRootProps {
  variant?: FileUploadVariant;
  theme?: FileUploadTheme;

  files?: File[];
  defaultFiles?: File[];
  onFiles?: (files: File[]) => void;

  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // bytes

  validate?: (file: File) => string | null;
  onReject?: (rejections: FileRejection[]) => void;

  disabled?: boolean;

  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** 단일 컴포넌트 모드 (compound 안 쓰는 경우) — Root + Dropzone/Trigger 통합. */
export interface FileUploadProps extends FileUploadRootProps {
  children?: ReactNode;
}

export interface FileUploadDropzoneProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface FileUploadTriggerProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface FileUploadPreviewProps {
  files?: File[];
  progress?: (file: File) => number;
  onRemove?: (file: File) => void;
  className?: string;
  style?: CSSProperties;
  children?: (file: File, index: number) => ReactNode;
}

export interface FileUploadItemProps {
  file: File;
  progress?: number;
  onRemove?: () => void;
  className?: string;
  style?: CSSProperties;
}
```

### 2.2 Context — `src/components/FileUpload/FileUploadContext.ts`

```ts
import { createContext, useContext } from "react";

export interface FileUploadContextValue {
  files: File[];
  setFiles: (next: File[]) => void;
  addFiles: (incoming: File[]) => void;  // 검증 + 추가
  removeFile: (file: File) => void;
  openDialog: () => void;
  isDragOver: boolean;
  disabled: boolean;
  variant: "dropzone" | "button";
  theme: "light" | "dark";
  accept: string | undefined;
  multiple: boolean;
  maxFiles: number | undefined;
  maxSize: number | undefined;
}

export const FileUploadContext = createContext<FileUploadContextValue | null>(null);

export function useFileUploadContext(): FileUploadContextValue {
  const ctx = useContext(FileUploadContext);
  if (!ctx) throw new Error("FileUpload.* must be used within <FileUpload.Root>");
  return ctx;
}
```

### 2.3 Root — `src/components/FileUpload/FileUploadRoot.tsx`

```tsx
export function FileUploadRoot(props: FileUploadRootProps) {
  const {
    variant = "dropzone", theme = "light",
    files: controlledFiles, defaultFiles, onFiles,
    accept, multiple = false, maxFiles, maxSize,
    validate, onReject, disabled = false,
    className, style, children,
  } = props;

  const [internalFiles, setInternalFiles] = useState<File[]>(defaultFiles ?? []);
  const files = controlledFiles ?? internalFiles;
  const setFiles = useCallback((next: File[]) => {
    if (controlledFiles === undefined) setInternalFiles(next);
    onFiles?.(next);
  }, [controlledFiles, onFiles]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFiles = useCallback((incoming: File[]): { accepted: File[]; rejected: FileRejection[] } => {
    const accepted: File[] = [];
    const rejected: FileRejection[] = [];

    for (const file of incoming) {
      // type 검증
      if (accept && !matchesAccept(file, accept)) {
        rejected.push({ file, reason: "type", message: `Type ${file.type || "unknown"} not allowed` });
        continue;
      }
      // size 검증
      if (maxSize !== undefined && file.size > maxSize) {
        rejected.push({ file, reason: "size", message: `File too large (max ${formatBytes(maxSize)})` });
        continue;
      }
      // 사용자 validate
      if (validate) {
        const msg = validate(file);
        if (msg) {
          rejected.push({ file, reason: "validate", message: msg });
          continue;
        }
      }
      accepted.push(file);
    }

    return { accepted, rejected };
  }, [accept, maxSize, validate]);

  const addFiles = useCallback((incoming: File[]) => {
    if (disabled) return;
    const { accepted, rejected: typeRejected } = validateFiles(incoming);
    let toAdd = multiple ? [...files, ...accepted] : accepted.slice(0, 1);

    // maxFiles 검증
    let countRejected: FileRejection[] = [];
    if (maxFiles !== undefined && toAdd.length > maxFiles) {
      const overflow = toAdd.slice(maxFiles);
      countRejected = overflow.map((f) => ({ file: f, reason: "count", message: `Max ${maxFiles} files` }));
      toAdd = toAdd.slice(0, maxFiles);
    }

    setFiles(toAdd);
    const allRejected = [...typeRejected, ...countRejected];
    if (allRejected.length > 0) onReject?.(allRejected);
  }, [disabled, validateFiles, multiple, files, maxFiles, onReject, setFiles]);

  const removeFile = useCallback((file: File) => {
    setFiles(files.filter((f) => f !== file));
  }, [files, setFiles]);

  const openDialog = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  // 드래그 핸들러
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    addFiles(selected);
    // input value reset (같은 파일 재선택 가능)
    if (inputRef.current) inputRef.current.value = "";
  };

  const ctx: FileUploadContextValue = {
    files, setFiles, addFiles, removeFile, openDialog,
    isDragOver, disabled, variant, theme,
    accept, multiple, maxFiles, maxSize,
  };

  return (
    <FileUploadContext.Provider value={ctx}>
      <div
        className={className}
        style={style}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleInputChange}
          style={{ display: "none" }}
          aria-hidden="true"
        />
        {children}
      </div>
    </FileUploadContext.Provider>
  );
}
```

### 2.4 Dropzone / Trigger / Preview / Item — `src/components/FileUpload/...`

```tsx
export function FileUploadDropzone(props: FileUploadDropzoneProps) {
  const ctx = useFileUploadContext();
  const handleClick = () => ctx.openDialog();
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ctx.openDialog();
    }
  };
  // 시각 변화: dragOver 시 보더·배경 변경
  return (
    <div
      role="button"
      tabIndex={ctx.disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-drag-over={ctx.isDragOver || undefined}
      data-disabled={ctx.disabled || undefined}
      style={{
        padding: 32, border: `2px dashed ${ctx.isDragOver ? "#2563eb" : "#d1d5db"}`,
        borderRadius: 8, textAlign: "center", cursor: ctx.disabled ? "not-allowed" : "pointer",
        background: ctx.isDragOver ? "rgba(37,99,235,0.05)" : "transparent",
        opacity: ctx.disabled ? 0.5 : 1, transition: "all 120ms ease",
        ...props.style,
      }}
      className={props.className}
    >
      {props.children ?? (
        <>
          <Icon name="upload" size="xl" />
          <p>여기로 파일을 드롭하거나 클릭하여 선택</p>
        </>
      )}
    </div>
  );
}

export function FileUploadTrigger(props: FileUploadTriggerProps) {
  const ctx = useFileUploadContext();
  return (
    <button type="button" onClick={ctx.openDialog} disabled={ctx.disabled} className={props.className} style={props.style}>
      {props.children ?? "파일 선택"}
    </button>
  );
}

export function FileUploadPreview(props: FileUploadPreviewProps) {
  const ctx = useFileUploadContext();
  const files = props.files ?? ctx.files;
  return (
    <div className={props.className} style={props.style}>
      {files.map((file, i) => (
        props.children ? props.children(file, i) :
          <FileUploadItem
            key={`${file.name}-${i}`}
            file={file}
            progress={props.progress?.(file)}
            onRemove={() => (props.onRemove ?? ctx.removeFile)(file)}
          />
      ))}
    </div>
  );
}

export function FileUploadItem(props: FileUploadItemProps) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:8,borderRadius:4,background:"#f9fafb"}}>
      <Icon name="upload" size="sm" />
      <span style={{flex:1}}>{props.file.name}</span>
      <span style={{fontSize:12,color:"#6b7280"}}>{formatBytes(props.file.size)}</span>
      {props.progress !== undefined && (
        <progress value={props.progress} max={100} />
      )}
      {props.onRemove && (
        <button onClick={props.onRemove} aria-label="Remove">
          <Icon name="x" size="sm" />
        </button>
      )}
    </div>
  );
}
```

### 2.5 utils

```ts
export function matchesAccept(file: File, accept: string): boolean {
  const tokens = accept.split(",").map((t) => t.trim());
  return tokens.some((tok) => {
    if (tok.startsWith(".")) {
      return file.name.toLowerCase().endsWith(tok.toLowerCase());
    }
    if (tok.endsWith("/*")) {
      const prefix = tok.slice(0, -2);
      return file.type.startsWith(prefix);
    }
    return file.type === tok;
  });
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
```

### 2.6 단일 컴포넌트 + compound assembly

```tsx
// FileUpload (단일 사용 — Dropzone 또는 Button)
export function FileUpload(props: FileUploadProps) {
  const { variant = "dropzone", children, ...rest } = props;
  return (
    <FileUploadRoot variant={variant} {...rest}>
      {variant === "dropzone"
        ? <FileUploadDropzone>{children}</FileUploadDropzone>
        : <FileUploadTrigger>{children}</FileUploadTrigger>}
    </FileUploadRoot>
  );
}

FileUpload.Root = FileUploadRoot;
FileUpload.Dropzone = FileUploadDropzone;
FileUpload.Trigger = FileUploadTrigger;
FileUpload.Preview = FileUploadPreview;
FileUpload.Item = FileUploadItem;

// Dropzone alias
export { FileUploadDropzone as Dropzone };
```

---

## 3. 파일 구조

```
src/components/FileUpload/
├── FileUpload.tsx              ← 단일 + compound
├── FileUploadRoot.tsx
├── FileUploadDropzone.tsx
├── FileUploadTrigger.tsx
├── FileUploadPreview.tsx
├── FileUploadItem.tsx
├── FileUploadContext.ts
├── FileUpload.utils.ts
├── FileUpload.types.ts
└── index.ts
```

---

## 4. 데모 페이지 — `demo/src/pages/FileUploadPage.tsx`

```tsx
export function FileUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  return (
    <div>
      <h1>FileUpload / Dropzone</h1>

      <Card.Root><Card.Header>Dropzone (basic)</Card.Header><Card.Body>
        <FileUpload onFiles={setFiles} />
        <p>Selected: {files.length} files</p>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Button mode</Card.Header><Card.Body>
        <FileUpload variant="button">파일 선택</FileUpload>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>accept="image/*"</Card.Header><Card.Body>
        <FileUpload accept="image/*" multiple />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>maxSize=1MB + onReject</Card.Header><Card.Body>
        <FileUpload
          maxSize={1024 * 1024}
          onReject={(r) => setErrors(r.map((x) => `${x.file.name}: ${x.message}`))}
        />
        {errors.map((e, i) => <p key={i} style={{color:"red"}}>{e}</p>)}
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Compound + Preview</Card.Header><Card.Body>
        <FileUpload.Root multiple onFiles={setFiles}>
          <FileUpload.Dropzone />
          <FileUpload.Preview />
        </FileUpload.Root>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Disabled</Card.Header><Card.Body>
        <FileUpload disabled />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Custom validator</Card.Header><Card.Body>
        <FileUpload
          validate={(f) => f.name.endsWith(".csv") ? null : "CSV만 허용"}
          onReject={(r) => alert(r[0]?.message)}
        />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dark theme</Card.Header><Card.Body style={{background:"#1f2937",padding:16}}>
        <FileUpload theme="dark" />
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 5. 접근성 (a11y)

- Dropzone: `role="button"`, `tabIndex=0`, Enter/Space 키 활성.
- Trigger: 표준 button.
- input[type=file]: `aria-hidden="true"` (시각 숨김 + 키보드 미접근 — 항상 wrapper button을 통해 trigger).
- 드래그 안내는 시각적 — 스크린리더 전용 텍스트 추가 가능 (v1.1+).
- 거부된 파일 알림: `onReject` 콜백 + 사용자 책임 (Toast 등).

---

## 6. Edge cases

- **input value reset**: 같은 파일 재선택을 위해 onChange 후 `value=""` 강제.
- **multiple=false인데 여러 파일 드롭**: 첫 파일만 받음 (slice(0,1)).
- **maxFiles=3 + 이미 2 + 새로 3 추가**: 5 → 3개로 truncate, 2개 reject (count).
- **빈 input change**: 다이얼로그 닫고 무선택 → addFiles([]).
- **iframe에서 파일 다이얼로그**: 일부 브라우저 차단 가능. v1 한계.
- **동일 파일 재드롭**: 같은 파일이지만 File 객체 인스턴스는 다름 → 중복 추가됨. 사용자가 dedupe 책임 (v1).
- **SSR**: `File` 객체는 브라우저 전용 — 서버에서 import 안전, 사용 시점에만 접근.

---

## 7. 구현 단계
- Phase 1: 코어 컴포넌트 + Context
- Phase 2: 데모
- Phase 3: 정리

## 8. 체크리스트
- [ ] 10개 파일
- [ ] typecheck/build
- [ ] Dropzone 모드 모든 시나리오
- [ ] Button 모드
- [ ] accept/maxSize/maxFiles/validate 검증
- [ ] 키보드 작동
- [ ] candidates / README
