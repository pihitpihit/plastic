import { useState, useCallback } from "react";
import { PathInput, CodeView } from "plastic";
import type { PathInputTheme, ValidationResult, ValidationStatus } from "plastic";

// ── Section 헬퍼 ────────────────────────────────────────────────────────
function Section({
  id,
  title,
  desc,
  children,
}: {
  id?: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {title}
      </p>
      {desc && <p className="text-sm text-gray-500 mb-3">{desc}</p>}
      {children}
    </section>
  );
}

function DemoWrapper({
  theme,
  children,
}: {
  theme: PathInputTheme;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border p-6"
      style={{
        background: theme === "dark" ? "#111827" : "#ffffff",
        borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
      }}
    >
      {children}
    </div>
  );
}

// ── Validators ──────────────────────────────────────────────────────────

function syncValidator(path: string): ValidationResult {
  if (!path) return { status: "valid", message: "" };
  const ext = path.split(".").pop()?.toLowerCase();
  if (["ts", "tsx", "js", "jsx"].includes(ext ?? "")) {
    return { status: "valid", message: `${ext} 파일 — 유효한 확장자입니다.` };
  }
  if (["json", "md", "txt"].includes(ext ?? "")) {
    return { status: "warning", message: `${ext} 파일 — 코드 파일이 아닙니다.` };
  }
  return { status: "invalid", message: "지원하지 않는 파일 형식입니다." };
}

async function asyncValidator(path: string): Promise<ValidationResult> {
  await new Promise((r) => setTimeout(r, 800));
  if (path.includes("error")) {
    return { status: "invalid", message: "경로에 오류가 포함되어 있습니다." };
  }
  if (path.includes("warn")) {
    return { status: "warning", message: "경고: 권장하지 않는 경로입니다." };
  }
  return { status: "valid", message: "경로가 유효합니다." };
}

// ── 데모 컴포넌트들 ────────────────────────────────────────────────────

function CombinedDemo({ theme }: { theme: PathInputTheme }) {
  const [path, setPath] = useState("");
  return (
    <DemoWrapper theme={theme}>
      <PathInput.Root value={path} onChange={setPath} theme={theme}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <PathInput.Input placeholder="파일 경로를 입력하거나 찾아보기..." />
          <PathInput.BrowseButton>찾아보기</PathInput.BrowseButton>
        </div>
      </PathInput.Root>
      <p className="text-xs text-gray-400 mt-2">
        현재 값: <code className="bg-gray-100 px-1 rounded">{path || "(비어있음)"}</code>
      </p>
    </DemoWrapper>
  );
}

function InputOnlyDemo({ theme }: { theme: PathInputTheme }) {
  const [path, setPath] = useState("");
  return (
    <DemoWrapper theme={theme}>
      <PathInput.Root value={path} onChange={setPath} theme={theme}>
        <PathInput.Input placeholder="파일을 드래그하거나 경로를 입력하세요" />
      </PathInput.Root>
      <p className="text-xs text-gray-400 mt-2">
        현재 값: <code className="bg-gray-100 px-1 rounded">{path || "(비어있음)"}</code>
      </p>
    </DemoWrapper>
  );
}

function BrowseOnlyDemo({ theme }: { theme: PathInputTheme }) {
  const [path, setPath] = useState("");
  return (
    <DemoWrapper theme={theme}>
      <PathInput.Root value={path} onChange={setPath} theme={theme}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <PathInput.BrowseButton>파일 선택</PathInput.BrowseButton>
          <PathInput.FileName placeholder="선택된 파일 없음" maxWidth={300} />
        </div>
      </PathInput.Root>
    </DemoWrapper>
  );
}

function DragDropDemo({ theme }: { theme: PathInputTheme }) {
  const [path, setPath] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  return (
    <DemoWrapper theme={theme}>
      <PathInput.Root
        value={path}
        onChange={setPath}
        theme={theme}
        onFilesSelected={setFiles}
      >
        <PathInput.Input placeholder="↓ OS에서 파일을 여기에 드래그 & 드롭하세요" />
      </PathInput.Root>
      {files.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          <p>드롭된 파일:</p>
          <ul className="list-disc list-inside">
            {files.map((f, i) => (
              <li key={i}>
                {f.name} ({(f.size / 1024).toFixed(1)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}
    </DemoWrapper>
  );
}

function ValidationDemo({ theme }: { theme: PathInputTheme }) {
  const [syncPath, setSyncPath] = useState("");
  const [asyncPath, setAsyncPath] = useState("");
  const [ctrlPath, setCtrlPath] = useState("");
  const [ctrlStatus, setCtrlStatus] = useState<ValidationStatus>("valid");

  return (
    <div className="space-y-4">
      <DemoWrapper theme={theme}>
        <p className="text-xs font-medium text-gray-500 mb-2">동기 검증 (확장자 체크)</p>
        <PathInput.Root value={syncPath} onChange={setSyncPath} theme={theme} validate={syncValidator} validateDebounce={200}>
          <PathInput.Input placeholder="예: app.tsx, readme.md, image.png" />
          <PathInput.Status />
        </PathInput.Root>
      </DemoWrapper>

      <DemoWrapper theme={theme}>
        <p className="text-xs font-medium text-gray-500 mb-2">비동기 검증 (800ms 지연)</p>
        <PathInput.Root value={asyncPath} onChange={setAsyncPath} theme={theme} validate={asyncValidator}>
          <PathInput.Input placeholder="'error' 또는 'warn' 포함 시 실패/경고" />
          <PathInput.Status />
        </PathInput.Root>
      </DemoWrapper>

      <DemoWrapper theme={theme}>
        <p className="text-xs font-medium text-gray-500 mb-2">외부 제어 검증</p>
        <div className="flex gap-1.5 mb-3">
          {(["valid", "invalid", "warning"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setCtrlStatus(s)}
              className={[
                "px-2.5 py-1 text-xs rounded border transition-colors",
                ctrlStatus === s
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              {s}
            </button>
          ))}
        </div>
        <PathInput.Root
          value={ctrlPath}
          onChange={setCtrlPath}
          theme={theme}
          validationStatus={ctrlStatus}
          validationMessage={`외부에서 제어된 상태: ${ctrlStatus}`}
        >
          <PathInput.Input placeholder="아무 값이나 입력" />
          <PathInput.Status />
        </PathInput.Root>
      </DemoWrapper>
    </div>
  );
}

function DisabledDemo({ theme }: { theme: PathInputTheme }) {
  return (
    <DemoWrapper theme={theme}>
      <PathInput.Root defaultValue="/usr/local/bin/node" theme={theme} disabled>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <PathInput.Input />
          <PathInput.BrowseButton>찾아보기</PathInput.BrowseButton>
        </div>
      </PathInput.Root>
    </DemoWrapper>
  );
}

// ── Props 테이블 ────────────────────────────────────────────────────────

function PropsTable({
  title,
  rows,
}: {
  title: string;
  rows: [string, string, string, string][];
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Prop", "Type", "Default", "Description"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(([prop, type, def, desc]) => (
              <tr key={prop}>
                <td className="px-4 py-2.5 font-mono text-xs text-blue-700">{prop}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{type}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{def}</td>
                <td className="px-4 py-2.5 text-gray-600">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PROPS_ROOT: [string, string, string, string][] = [
  ["value", "string", "—", "controlled 경로 값"],
  ["defaultValue", "string", '""', "uncontrolled 초기값"],
  ["onChange", "(value: string) => void", "—", "값 변경 콜백"],
  ["disabled", "boolean", "false", "전체 비활성화"],
  ["accept", "string", "—", '파일 필터 (예: ".ts,.tsx", "image/*")'],
  ["multiple", "boolean", "false", "다중 파일 선택 허용"],
  ["directory", "boolean", "false", "폴더 선택 (webkitdirectory)"],
  ["validate", "(path) => ValidationResult | Promise<...>", "—", "검증 함수 (디바운스 적용)"],
  ["validateDebounce", "number", "300", "검증 디바운스 지연 (ms)"],
  ["validationStatus", '"valid" | "invalid" | "warning"', "—", "외부 제어 검증 상태"],
  ["validationMessage", "string", "—", "외부 제어 검증 메시지"],
  ["theme", '"light" | "dark"', '"light"', "색상 테마"],
  ["onFilesSelected", "(files: File[]) => void", "—", "파일 객체 콜백 (browse/drop)"],
];

const PROPS_INPUT: [string, string, string, string][] = [
  ["placeholder", "string", "—", "입력 필드 placeholder"],
  ["className", "string", "—", "추가 CSS 클래스"],
  ["style", "CSSProperties", "—", "인라인 스타일 오버라이드"],
];

const PROPS_BROWSE: [string, string, string, string][] = [
  ["children", "ReactNode", '"Browse"', "버튼 내용"],
  ["className", "string", "—", "추가 CSS 클래스"],
  ["style", "CSSProperties", "—", "인라인 스타일 오버라이드"],
];

const PROPS_STATUS: [string, string, string, string][] = [
  ["children", "(state: ValidationState) => ReactNode", "—", "커스텀 렌더 함수"],
  ["className", "string", "—", "추가 CSS 클래스"],
  ["style", "CSSProperties", "—", "인라인 스타일 오버라이드"],
];

const PROPS_FILENAME: [string, string, string, string][] = [
  ["placeholder", "string", '"No file selected"', "미선택 시 표시 텍스트"],
  ["maxWidth", "number", "200", "최대 표시 너비 (px, 초과 시 말줄임)"],
  ["className", "string", "—", "추가 CSS 클래스"],
  ["style", "CSSProperties", "—", "인라인 스타일 오버라이드"],
];

// ── Usage 코드 ──────────────────────────────────────────────────────────

const USAGE_CODE = `import { PathInput } from "plastic";

// Combined: Input + BrowseButton
<PathInput.Root value={path} onChange={setPath} validate={myValidator}>
  <div style={{ display: "flex", gap: "0.5rem" }}>
    <PathInput.Input placeholder="/path/to/file" />
    <PathInput.BrowseButton>찾아보기</PathInput.BrowseButton>
  </div>
  <PathInput.Status />
</PathInput.Root>

// Browse only + FileName
<PathInput.Root value={path} onChange={setPath}>
  <PathInput.BrowseButton>파일 선택</PathInput.BrowseButton>
  <PathInput.FileName />
</PathInput.Root>

// Drag & drop with file callback
<PathInput.Root
  value={path}
  onChange={setPath}
  onFilesSelected={(files) => console.log(files)}
>
  <PathInput.Input placeholder="파일을 드래그하세요" />
</PathInput.Root>

// Controlled validation
<PathInput.Root
  value={path}
  onChange={setPath}
  validationStatus="invalid"
  validationMessage="파일을 찾을 수 없습니다."
>
  <PathInput.Input />
  <PathInput.Status />
</PathInput.Root>`;

// ── Playground ──────────────────────────────────────────────────────────

function Playground({ theme: pageTheme }: { theme: PathInputTheme }) {
  const [path, setPath] = useState("");
  const [theme, setTheme] = useState<PathInputTheme>(pageTheme);
  const [disabled, setDisabled] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const [directory, setDirectory] = useState(false);
  const [accept, setAccept] = useState("");
  const [debounce, setDebounce] = useState(300);
  const [useValidate, setUseValidate] = useState(false);
  const [ctrlStatus, setCtrlStatus] = useState<ValidationStatus | "">("");

  const validate = useCallback(
    (p: string): ValidationResult => {
      const ext = p.split(".").pop()?.toLowerCase();
      if (["ts", "tsx", "js", "jsx"].includes(ext ?? ""))
        return { status: "valid", message: "유효한 코드 파일" };
      if (!ext || ext === p) return { status: "warning", message: "확장자 없음" };
      return { status: "invalid", message: "지원하지 않는 확장자" };
    },
    [],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 text-sm">
        <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">theme</span>
            <div className="flex rounded border border-gray-200 overflow-hidden">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1 text-xs transition-colors ${
                    theme === t
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">debounce</span>
            <input
              type="range"
              min={0}
              max={1000}
              step={50}
              value={debounce}
              onChange={(e) => setDebounce(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-xs text-gray-400 w-12">{debounce}ms</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">accept</span>
            <input
              type="text"
              value={accept}
              onChange={(e) => setAccept(e.target.value)}
              placeholder=".ts,.tsx"
              className="text-xs font-mono border border-gray-200 rounded px-2 py-1 bg-white w-24"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">ctrlStatus</span>
            <select
              value={ctrlStatus}
              onChange={(e) => setCtrlStatus(e.target.value as ValidationStatus | "")}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
            >
              <option value="">none</option>
              <option value="valid">valid</option>
              <option value="invalid">invalid</option>
              <option value="warning">warning</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {[
            { label: "disabled", value: disabled, set: setDisabled },
            { label: "multiple", value: multiple, set: setMultiple },
            { label: "directory", value: directory, set: setDirectory },
            { label: "validate", value: useValidate, set: setUseValidate },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => set(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs font-mono text-gray-600">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <DemoWrapper theme={theme}>
        <PathInput.Root
          value={path}
          onChange={setPath}
          theme={theme}
          disabled={disabled}
          multiple={multiple}
          directory={directory}
          accept={accept || undefined}
          validate={useValidate ? validate : undefined}
          validateDebounce={debounce}
          validationStatus={ctrlStatus || undefined}
          validationMessage={ctrlStatus ? `외부 제어: ${ctrlStatus}` : undefined}
        >
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <PathInput.Input placeholder="경로를 입력하거나 파일을 드래그하세요" />
            <PathInput.BrowseButton>찾아보기</PathInput.BrowseButton>
          </div>
          <PathInput.Status />
        </PathInput.Root>
      </DemoWrapper>

      <button
        onClick={() => setPath("")}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        리셋
      </button>
    </div>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────────────────

export function PathInputPage() {
  const [theme, setTheme] = useState<PathInputTheme>("light");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">PathInput</h1>
        <p className="text-gray-500 mt-1">
          파일 경로를 입력/선택하는 복합 컨트롤입니다. 텍스트 입력, 찾아보기 버튼,
          드래그 앤 드롭, 검증 피드백을 지원합니다.
        </p>
        <div className="flex gap-1.5 mt-3">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={[
                "px-2.5 py-1 text-xs rounded border transition-colors",
                theme === t
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Section id="combined" title="Combined" desc="Input + BrowseButton 기본 조합.">
        <CombinedDemo theme={theme} />
      </Section>

      <Section id="input-only" title="Input Only" desc="텍스트 입력만. 드래그 앤 드롭 가능.">
        <InputOnlyDemo theme={theme} />
      </Section>

      <Section id="browse-only" title="Browse Only" desc="BrowseButton + FileName. 텍스트 입력 없이 파일 선택.">
        <BrowseOnlyDemo theme={theme} />
      </Section>

      <Section id="drag-drop" title="Drag & Drop" desc="OS에서 파일을 드래그하면 경로가 자동 입력됩니다.">
        <DragDropDemo theme={theme} />
      </Section>

      <Section id="validation" title="Validation" desc="동기/비동기/외부 제어 3가지 검증 패턴.">
        <ValidationDemo theme={theme} />
      </Section>

      <Section id="disabled" title="Disabled" desc="전체 비활성 상태.">
        <DisabledDemo theme={theme} />
      </Section>

      <Section id="dark-theme" title="Dark Theme" desc="어두운 테마 적용.">
        <CombinedDemo theme="dark" />
      </Section>

      <Section id="props" title="Props">
        <PropsTable title="Root" rows={PROPS_ROOT} />
        <PropsTable title="Input" rows={PROPS_INPUT} />
        <PropsTable title="BrowseButton" rows={PROPS_BROWSE} />
        <PropsTable title="Status" rows={PROPS_STATUS} />
        <PropsTable title="FileName" rows={PROPS_FILENAME} />
      </Section>

      <Section id="usage" title="Usage">
        <CodeView code={USAGE_CODE} language="tsx" showAlternatingRows={false} />
      </Section>

      <Section id="playground" title="Playground" desc="모든 PathInput props를 실시간 조작.">
        <Playground theme={theme} />
      </Section>
    </div>
  );
}
