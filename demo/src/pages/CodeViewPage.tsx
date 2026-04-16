import { useState, useCallback } from "react";
import { CodeView, Button } from "plastic";
import type { CodeViewTheme, CodeViewLanguage } from "plastic";

const TS_SAMPLE = `interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error("Not found");
  return res.json() as Promise<User>;
}

const user = await fetchUser(42);
console.log(\`Hello, \${user.name}!\`);`;

const PYTHON_SAMPLE = `from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    id: int
    name: str
    email: str

def fetch_user(user_id: int) -> Optional[User]:
    # fetch from database
    return User(id=user_id, name="Alice", email="alice@example.com")

user = fetch_user(42)
if user:
    print(f"Hello, {user.name}!")`;

const JSON_SAMPLE = `{
  "name": "plastic",
  "version": "0.0.1",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}`;

// Contains tabs, spaces, and a zero-width space (U+200B) after the colon
const INVISIBLES_SAMPLE = `function greet(name: string) {
\tconst message = "Hello, " + name;
\t// tab-indented line  with trailing spaces
\tconst url = "https://example.com\u200B/path";
\treturn message;
}`;

const USAGE_CODE = `import { CodeView } from "plastic";

<CodeView
  code={myCode}
  language="typescript"
  theme="dark"
  showLineNumbers={true}
  showAlternatingRows={true}
/>`;

export function CodeViewPage() {
  const [theme, setTheme] = useState<CodeViewTheme>("light");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CodeView</h1>
        <p className="text-gray-500 mt-1">
          라인 번호, 홀짝 배경, syntax highlighting을 갖춘 코드 표시 컴포넌트입니다.
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded ml-1">
            prism-react-renderer
          </code>{" "}
          기반으로 동작합니다.
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            TypeScript
          </p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={theme === "light" ? "primary" : "secondary"}
              onClick={() => setTheme("light")}
            >
              Light
            </Button>
            <Button
              size="sm"
              variant={theme === "dark" ? "primary" : "secondary"}
              onClick={() => setTheme("dark")}
            >
              Dark
            </Button>
          </div>
        </div>
        <CodeView code={TS_SAMPLE} language="typescript" theme={theme} />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Python
        </p>
        <CodeView code={PYTHON_SAMPLE} language="python" theme={theme} />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          JSON
        </p>
        <CodeView code={JSON_SAMPLE} language="json" theme={theme} />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          No Line Numbers
        </p>
        <CodeView
          code={TS_SAMPLE}
          language="typescript"
          theme={theme}
          showLineNumbers={false}
          showAlternatingRows={false}
        />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Show Invisibles
        </p>
        <p className="text-sm text-gray-500 mb-3">
          탭 → <code className="bg-gray-100 px-1 rounded">→</code> &nbsp;
          공백 → <code className="bg-gray-100 px-1 rounded">·</code> &nbsp;
          특수 불가시 문자 → <code className="bg-gray-100 px-1 rounded">ZWS</code> 형태의 니모닉 칩
        </p>
        <CodeView
          code={INVISIBLES_SAMPLE}
          language="typescript"
          theme={theme}
          showInvisibles
          tabSize={2}
        />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Highlight Lines
        </p>
        <p className="text-sm text-gray-500 mb-3">
          <code className="bg-gray-100 px-1 rounded">highlightLines</code> prop에 강조할 라인 번호(1-indexed) 배열을 전달합니다.
        </p>
        <CodeView
          code={TS_SAMPLE}
          language="typescript"
          theme={theme}
          highlightLines={[1, 2, 3, 11]}
        />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Editable
        </p>
        <p className="text-sm text-gray-500 mb-3">
          <code className="bg-gray-100 px-1 rounded">editable</code> 활성 시 인라인 편집 가능.
          포커스 진입 시 줄 배경색이 파란 계열로 전환되어 편집 상태를 시각적으로 구분합니다.
          Tab으로 다중 라인 들여쓰기, Shift+Tab으로 내어쓰기, Enter로 자동 들여쓰기를 지원합니다.
        </p>
        <EditableDemo theme={theme} />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Props
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Prop", "Type", "Default", "Description"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["code", "string", "—", "표시할 코드 (필수)"],
                ["language", "Language", '"typescript"', "문법 강조 언어"],
                ["theme", '"light" | "dark"', '"light"', "색상 테마"],
                ["showLineNumbers", "boolean", "true", "라인 번호 표시"],
                ["showAlternatingRows", "boolean", "true", "홀짝 배경 구분"],
                ["highlightLines", "number[]", "—", "강조할 라인 번호 배열 (1-indexed)"],
                ["editable", "\"disable\" | \"enable\" | \"click\"", "\"disable\"", "편집 모드 (click: 클릭 진입, Enter 종료, Shift+Enter 줄바꿈)"],
                ["onValueChange", "(value: string) => void", "—", "편집 시 호출되는 콜백"],
                ["showInvisibles", "boolean", "false", "탭·공백·불가시 유니코드 문자 시각화"],
                ["tabSize", "number", "2", "탭 너비 (CSS tab-size)"],
                ["indentUnit", '"space" | "tab"', '"space"', "Tab 키 삽입 문자 단위"],
                ["wordWrap", "boolean", "false", "긴 줄 자동 줄바꿈"],
                ["gutterWidth", "string", "auto", "라인번호 컬럼 너비 명시 (예: \"3rem\")"],
                ["gutterGap", "string", '"1rem"', "라인번호와 코드 내용 사이 간격"],
                ["showCopyButton", "boolean", "true", "복사 버튼 표시 여부"],
                ["invisibleFontStrategy", "\"overlay\" | \"bundled\"", "\"overlay\"", "bundled: 번들 폰트(PlasticMono)로 chip 을 glyph 수준에서 정렬"],
              ].map(([prop, type, def, desc]) => (
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
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Usage
        </p>
        <CodeView code={USAGE_CODE} language="tsx" showAlternatingRows={false} />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Playground
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Props를 직접 조정하여 실시간으로 결과를 확인하세요.
        </p>
        <PlaygroundSection />
      </section>
    </div>
  );
}

// ── Editable demo (별도 컴포넌트로 분리하여 상태 관리) ──────────────────────

const EDITABLE_INITIAL = `function add(a: number, b: number): number {
  return a + b;
}

// 이 코드를 직접 편집해 보세요.
const result = add(1, 2);
console.log(result);`;

function EditableDemo({ theme }: { theme: import("plastic").CodeViewTheme }) {
  const [code, setCode] = useState(EDITABLE_INITIAL);
  const handleReset = useCallback(() => setCode(EDITABLE_INITIAL), []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          초기화
        </button>
      </div>
      <CodeView
        code={code}
        language="typescript"
        theme={theme}
        editable="enable"
        onValueChange={setCode}
      />
      <p className="text-xs text-gray-400">
        클릭하여 편집 — 포커스 시 줄 배경이 파란 계열로 변경됩니다.
      </p>
    </div>
  );
}

// ── Playground ───────────────────────────────────────────────────────────────

const PLAYGROUND_LANGUAGES: CodeViewLanguage[] = [
  "typescript", "javascript", "tsx", "jsx",
  "python", "json", "css", "bash", "markup",
  "markdown", "text",
];

const PLAYGROUND_INITIAL = `interface User {
  id: number;
  name: string;
}

async function fetchUser(id: number): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`);
  return res.json() as Promise<User>;
}`;

// 제어 문자 / Unicode invisibles 를 한 줄씩 포함한 샘플.
// showInvisibles=true 에서 각종 칩 렌더를 확인하고, editable 모드에서
// 칩 Atomicity (드래그·커서·복사) 를 테스트할 때 사용한다.
const CONTROL_CHARS_SAMPLE = [
  "// 제어 문자 샘플 (showInvisibles=true 로 보세요)",
  "const esc = \"\u001B[31mred\u001B[0m\"; // ESC",
  "const bel = \"\u0007\"; // BEL",
  "const crt = \"line1\\r\"; // CRT (CR)",
  "const tab = \"a\\tb\\tc\"; // HT arrows",
  "const nbs = \"word\u00A0word\"; // NBS",
  "const zws = \"join\u200Bword\"; // ZWS",
  "const bom = \"\uFEFFhello\"; // BOM",
  "const mix = \"A\u001BB\u200BC\";",
].join("\n");

const PLAYGROUND_PRESETS: Array<{ label: string; value: string }> = [
  { label: "default",       value: PLAYGROUND_INITIAL },
  { label: "control chars", value: CONTROL_CHARS_SAMPLE },
];

function PlaygroundSection() {
  const [code, setCode]                       = useState(PLAYGROUND_INITIAL);
  const [language, setLanguage]               = useState<CodeViewLanguage>("typescript");
  const [theme, setTheme]                     = useState<CodeViewTheme>("light");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showAlternatingRows, setShowAlternatingRows] = useState(true);
  const [showInvisibles, setShowInvisibles]   = useState(false);
  const [tabSize, setTabSize]                 = useState(2);
  const [indentUnit, setIndentUnit]           = useState<"space" | "tab">("space");
  const [editable, setEditable]               = useState<"disable" | "enable" | "click">("disable");
  const [invisibleFontStrategy, setInvisibleFontStrategy] = useState<"overlay" | "bundled">("overlay");
  const [wordWrap, setWordWrap]               = useState(false);
  const [showCopyButton, setShowCopyButton]   = useState(true);
  const [hlInput, setHlInput]                 = useState("");
  const [gutterWidth, setGutterWidth]         = useState("");
  const [gutterGap, setGutterGap]             = useState("");

  const highlightLines = hlInput
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);

  const boolProps = [
    { label: "showLineNumbers",    value: showLineNumbers,    set: setShowLineNumbers },
    { label: "showAlternatingRows",value: showAlternatingRows,set: setShowAlternatingRows },
    { label: "showInvisibles",     value: showInvisibles,     set: setShowInvisibles },
    { label: "wordWrap",           value: wordWrap,           set: setWordWrap },
    { label: "showCopyButton",    value: showCopyButton,     set: setShowCopyButton },
  ] as const;

  return (
    <div className="space-y-4">
      {/* ── Controls ── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 text-sm">

        {/* theme / language / tabSize */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-14">theme</span>
            <div className="flex rounded border border-gray-200 overflow-hidden">
              {(["light", "dark"] as CodeViewTheme[]).map((t) => (
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
            <span className="text-xs text-gray-500 w-14">language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as CodeViewLanguage)}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
            >
              {PLAYGROUND_LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-14">tabSize</span>
            <select
              value={tabSize}
              onChange={(e) => setTabSize(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
            >
              {[2, 4, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-14">indentUnit</span>
            <div className="flex rounded border border-gray-200 overflow-hidden">
              {(["space", "tab"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setIndentUnit(u)}
                  className={`px-3 py-1 text-xs transition-colors ${
                    indentUnit === u
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-14">editable</span>
            <div className="flex rounded border border-gray-200 overflow-hidden">
              {(["disable", "enable", "click"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setEditable(m)}
                  className={`px-3 py-1 text-xs transition-colors ${
                    editable === m
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-24">invisibleFont</span>
            <div className="flex rounded border border-gray-200 overflow-hidden">
              {(["overlay", "bundled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setInvisibleFontStrategy(s)}
                  className={`px-3 py-1 text-xs transition-colors ${
                    invisibleFontStrategy === s
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* boolean props */}
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {boolProps.map(({ label, value, set }) => (
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

        {/* highlightLines / gutterWidth / gutterGap */}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-24">highlightLines</span>
            <input
              type="text"
              value={hlInput}
              onChange={(e) => setHlInput(e.target.value)}
              placeholder="1, 3, 5"
              className="text-xs font-mono border border-gray-200 rounded px-2 py-1 bg-white w-28 focus:outline-none"
            />
            <span className="text-xs text-gray-400">콤마 구분</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-24">gutterWidth</span>
            <input
              type="text"
              value={gutterWidth}
              onChange={(e) => setGutterWidth(e.target.value)}
              placeholder="auto"
              className="text-xs font-mono border border-gray-200 rounded px-2 py-1 bg-white w-24 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-24">gutterGap</span>
            <input
              type="text"
              value={gutterGap}
              onChange={(e) => setGutterGap(e.target.value)}
              placeholder="1rem"
              className="text-xs font-mono border border-gray-200 rounded px-2 py-1 bg-white w-24 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Code input ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-gray-400 font-medium">code</p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">load</span>
            {PLAYGROUND_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setCode(p.value)}
                className="text-xs px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-100 font-mono"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={8}
          spellCheck={false}
          className="w-full font-mono text-xs border border-gray-200 rounded-lg p-3 bg-white resize-y focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      </div>

      {/* ── Preview ── */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5 font-medium">preview</p>
        <CodeView
          code={code}
          language={language}
          theme={theme}
          showLineNumbers={showLineNumbers}
          showAlternatingRows={showAlternatingRows}
          showInvisibles={showInvisibles}
          tabSize={tabSize}
          indentUnit={indentUnit}
          wordWrap={wordWrap}
          invisibleFontStrategy={invisibleFontStrategy}
          editable={editable}
          showCopyButton={showCopyButton}
          onValueChange={editable !== "disable" ? setCode : undefined}
          highlightLines={highlightLines.length > 0 ? highlightLines : undefined}
          gutterWidth={gutterWidth || undefined}
          gutterGap={gutterGap || undefined}
        />
      </div>
    </div>
  );
}
