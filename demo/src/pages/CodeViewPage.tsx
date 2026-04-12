import { useState } from "react";
import { CodeView, Button } from "plastic";
import type { CodeViewTheme } from "plastic";

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
    </div>
  );
}
