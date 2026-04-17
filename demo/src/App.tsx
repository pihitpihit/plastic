import { useEffect, useRef, useState, useCallback } from "react";
import { ButtonPage } from "./pages/ButtonPage";
import { CardPage } from "./pages/CardPage";
import { CodeViewPage } from "./pages/CodeViewPage";
import { ActionablePage } from "./pages/ActionablePage";
import { PathInputPage } from "./pages/PathInputPage";

type Page = "button" | "card" | "codeview" | "actionable" | "pathinput";

interface SubItem { label: string; id: string }

const NAV: { id: Page; label: string; description: string; sections: SubItem[] }[] = [
  { id: "button", label: "Button", description: "단순 컴포넌트", sections: [
    { label: "Variants", id: "variants" },
    { label: "Sizes", id: "sizes" },
    { label: "States", id: "states" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
  ]},
  { id: "card", label: "Card", description: "Compound 컴포넌트", sections: [
    { label: "Full Card", id: "full-card" },
    { label: "Body Only", id: "body-only" },
    { label: "Header + Body", id: "header-body" },
    { label: "Usage", id: "usage" },
  ]},
  { id: "codeview", label: "CodeView", description: "Syntax highlighting", sections: [
    { label: "TypeScript", id: "typescript" },
    { label: "Python", id: "python" },
    { label: "JSON", id: "json" },
    { label: "No Line Numbers", id: "no-line-numbers" },
    { label: "Show Invisibles", id: "show-invisibles" },
    { label: "Highlight Lines", id: "highlight-lines" },
    { label: "Editable", id: "editable" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
    { label: "Playground", id: "playground" },
  ]},
  { id: "actionable", label: "Actionable", description: "Action triggers", sections: [
    { label: "Icon Trigger", id: "icon-trigger" },
    { label: "Icon Confirm", id: "icon-confirm" },
    { label: "Swipe", id: "swipe" },
    { label: "Fade", id: "fade" },
    { label: "Checkbox", id: "checkbox" },
    { label: "Drag-out", id: "drag-out" },
    { label: "Reveal (삭제)", id: "reveal-delete" },
    { label: "Reveal (멀티)", id: "reveal-multi" },
    { label: "Dismiss", id: "dismiss-animations" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
    { label: "Playground", id: "playground" },
  ]},
  { id: "pathinput", label: "PathInput", description: "파일 경로 입력", sections: [
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
  ]},
];

const DEFAULT_PAGE: Page = "button";
const SIDEBAR_WIDTH_KEY = "plastic-demo:sidebar-width";
const SIDEBAR_COLLAPSED_KEY = "plastic-demo:sidebar-collapsed";
const MIN_WIDTH = 160;
const MAX_WIDTH = 480;

function getPageFromHash(): Page {
  const h = window.location.hash.replace(/^#\/?/, "");
  return (NAV.find((n) => n.id === h)?.id as Page) ?? DEFAULT_PAGE;
}

export function App() {
  const [current, setCurrent] = useState<Page>(() => getPageFromHash());
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1",
  );
  const [width, setWidth] = useState<number>(() => {
    const v = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(v) && v >= MIN_WIDTH && v <= MAX_WIDTH ? v : 240;
  });
  const draggingRef = useRef(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const mainRef = useRef<HTMLElement>(null);

  // URL ↔ 상태 동기화
  useEffect(() => {
    const onHash = () => setCurrent(getPageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (window.location.hash.replace(/^#\/?/, "") !== current) {
      window.history.replaceState(null, "", `#/${current}`);
    }
  }, [current]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // IntersectionObserver로 현재 섹션 추적
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;
    const nav = NAV.find((n) => n.id === current);
    if (!nav || nav.sections.length === 0) return;

    const sectionIds = nav.sections.map((s) => s.id);
    const elements = sectionIds
      .map((id) => mainEl.querySelector<HTMLElement>(`#${CSS.escape(id)}`))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { root: mainEl, rootMargin: "-10% 0px -80% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [current]);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = mainRef.current?.querySelector<HTMLElement>(`#${CSS.escape(sectionId)}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // 드래그 리사이즈
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    if (collapsed) return;
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const navigate = (id: Page) => {
    setCurrent(id);
    setActiveSection("");
    window.history.replaceState(null, "", `#/${id}`);
    mainRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="shrink-0 border-r border-gray-200 bg-white flex flex-col relative"
        style={{ width: collapsed ? 44 : width }}
      >
        <div
          className={[
            "flex items-center border-b border-gray-200",
            collapsed ? "justify-center px-0 py-3" : "justify-between px-5 py-4",
          ].join(" ")}
        >
          {!collapsed && (
            <div>
              <p className="text-lg font-bold tracking-tight text-gray-900">plastic</p>
              <p className="text-xs text-gray-400 mt-0.5">component demo</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
            title={collapsed ? "펼치기" : "접기"}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map((item) => {
            const active = current === item.id;
            return (
              <div key={item.id}>
                <button
                  onClick={() => navigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "w-full text-left transition-colors",
                    collapsed ? "px-0 py-2.5 flex justify-center" : "px-5 py-2.5",
                    active
                      ? "bg-blue-50 border-l-2 border-blue-600"
                      : "border-l-2 border-transparent hover:bg-gray-50",
                  ].join(" ")}
                >
                  {collapsed ? (
                    <span
                      className={[
                        "text-sm font-semibold",
                        active ? "text-blue-700" : "text-gray-600",
                      ].join(" ")}
                    >
                      {item.label.charAt(0)}
                    </span>
                  ) : (
                    <>
                      <p
                        className={[
                          "text-sm font-medium",
                          active ? "text-blue-700" : "text-gray-700",
                        ].join(" ")}
                      >
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                    </>
                  )}
                </button>
                {active && !collapsed && item.sections.length > 0 && (
                  <div className="pb-1">
                    {item.sections.map((sec) => (
                      <button
                        key={sec.id}
                        onClick={() => scrollToSection(sec.id)}
                        className={[
                          "w-full text-left pl-8 pr-4 py-1 text-xs transition-colors",
                          activeSection === sec.id
                            ? "text-blue-600 font-medium"
                            : "text-gray-400 hover:text-gray-600",
                        ].join(" ")}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Resize handle */}
        {!collapsed && (
          <div
            onMouseDown={startDrag}
            role="separator"
            aria-orientation="vertical"
            aria-label="사이드바 크기 조절"
            className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-blue-200 active:bg-blue-300"
            style={{ transform: "translateX(50%)" }}
          />
        )}
      </aside>

      {/* Main content */}
      <main ref={mainRef} className="flex-1 p-10 overflow-y-auto">
        {current === "button" && <ButtonPage />}
        {current === "card" && <CardPage />}
        {current === "codeview" && <CodeViewPage />}
        {current === "actionable" && <ActionablePage />}
        {current === "pathinput" && <PathInputPage />}
      </main>
    </div>
  );
}
