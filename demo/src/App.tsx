import { useState } from "react";
import { ButtonPage } from "./pages/ButtonPage";
import { CardPage } from "./pages/CardPage";
import { CodeViewPage } from "./pages/CodeViewPage";

type Page = "button" | "card" | "codeview";

const NAV: { id: Page; label: string; description: string }[] = [
  { id: "button", label: "Button", description: "단순 컴포넌트" },
  { id: "card", label: "Card", description: "Compound 컴포넌트" },
  { id: "codeview", label: "CodeView", description: "Syntax highlighting" },
];

export function App() {
  const [current, setCurrent] = useState<Page>("button");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200">
          <p className="text-lg font-bold tracking-tight text-gray-900">plastic</p>
          <p className="text-xs text-gray-400 mt-0.5">component demo</p>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrent(item.id)}
              className={[
                "w-full text-left px-5 py-2.5 transition-colors",
                current === item.id
                  ? "bg-blue-50 border-l-2 border-blue-600"
                  : "border-l-2 border-transparent hover:bg-gray-50",
              ].join(" ")}
            >
              <p
                className={[
                  "text-sm font-medium",
                  current === item.id ? "text-blue-700" : "text-gray-700",
                ].join(" ")}
              >
                {item.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-10 overflow-y-auto">
        {current === "button" && <ButtonPage />}
        {current === "card" && <CardPage />}
        {current === "codeview" && <CodeViewPage />}
      </main>
    </div>
  );
}
