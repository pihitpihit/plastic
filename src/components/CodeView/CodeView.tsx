import { useState, useEffect, useRef } from "react";
import { Highlight, themes } from "prism-react-renderer";
import type { CodeViewProps } from "./CodeView.types";
import { renderWithInvisibles } from "./CodeView.invisibles";

// Internal — not exported
const internalThemes = {
  light: themes.vsLight,
  dark: themes.vsDark,
} as const;

const lineNumberColor = {
  light: "rgba(0,0,0,0.25)",
  dark: "rgba(255,255,255,0.25)",
} as const;

// readonly 모드 줄 배경
const alternatingRowColor = {
  light: "rgba(0,0,0,0.04)",
  dark: "rgba(255,255,255,0.04)",
} as const;

// editable + focused 모드 줄 배경
const alternatingRowEditColor = {
  light: "rgba(59,130,246,0.08)",
  dark: "rgba(96,165,250,0.10)",
} as const;

// highlightLines 강조 배경
const highlightRowColor = {
  light: "rgba(253,224,71,0.35)",
  dark: "rgba(253,224,71,0.15)",
} as const;

const caretColor = {
  light: "rgba(0,0,0,0.85)",
  dark: "rgba(255,255,255,0.85)",
} as const;

const copyButtonColor = {
  light: { bg: "rgba(0,0,0,0.06)", text: "rgba(0,0,0,0.45)" },
  dark:  { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.45)" },
} as const;

/** 라인 수에 따라 gutter(라인번호 컬럼) 너비를 동적 계산 */
function getGutterWidth(lineCount: number): string {
  if (lineCount < 10)   return "1.5rem";
  if (lineCount < 100)  return "2rem";
  if (lineCount < 1000) return "2.75rem";
  return "3.5rem";
}

export function CodeView({
  code,
  language = "typescript",
  showLineNumbers = true,
  showAlternatingRows = true,
  showInvisibles = false,
  tabSize = 2,
  theme = "light",
  editable = false,
  onValueChange,
  highlightLines,
  className = "",
}: CodeViewProps) {
  const [editValue, setEditValue]     = useState(code);
  const [isFocused, setIsFocused]     = useState(false);
  const [copyState, setCopyState]     = useState<"idle" | "copied">("idle");
  const prevCodeRef   = useRef(code);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  // code prop 변경 시 내부 상태 동기화 (외부에서 코드를 교체하는 경우)
  useEffect(() => {
    if (code !== prevCodeRef.current) {
      prevCodeRef.current = code;
      setEditValue(code);
    }
  }, [code]);

  const displayCode = editable ? editValue : code;

  // ── 복사 ────────────────────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  }

  // ── 편집 이벤트 ──────────────────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setEditValue(next);
    onValueChange?.(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el    = e.currentTarget;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const indent = " ".repeat(tabSize);

    if (e.key === "Tab") {
      e.preventDefault();
      const lines     = editValue.split("\n");
      const startLine = editValue.slice(0, start).split("\n").length - 1;
      const endLine   = editValue.slice(0, end).split("\n").length - 1;

      if (startLine !== endLine) {
        // 다중 라인 선택 — 각 줄 들여쓰기/내어쓰기
        let startDelta = 0;
        let totalDelta = 0;
        const newLines = lines.map((line, i) => {
          if (i < startLine || i > endLine) return line;
          if (e.shiftKey) {
            const modified = line.startsWith(indent)
              ? line.slice(tabSize)
              : line.replace(/^( +)/, (m) => m.slice(Math.min(m.length, tabSize)));
            const delta = modified.length - line.length;
            if (i === startLine) startDelta = delta;
            totalDelta += delta;
            return modified;
          } else {
            if (i === startLine) startDelta = tabSize;
            totalDelta += tabSize;
            return indent + line;
          }
        });
        const next = newLines.join("\n");
        setEditValue(next);
        onValueChange?.(next);
        const newStart = Math.max(0, start + startDelta);
        const newEnd   = Math.max(newStart, end + totalDelta);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = newStart;
            textareaRef.current.selectionEnd   = newEnd;
          }
        });
      } else {
        // 단일 커서 — 커서 위치에 indent 삽입
        const next = editValue.slice(0, start) + indent + editValue.slice(end);
        setEditValue(next);
        onValueChange?.(next);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + tabSize;
            textareaRef.current.selectionEnd   = start + tabSize;
          }
        });
      }
    } else if (e.key === "Enter") {
      // 자동 들여쓰기 — 현재 라인의 leading whitespace 유지
      e.preventDefault();
      const currentLine     = editValue.slice(0, start).split("\n").pop() ?? "";
      const leadingWs       = currentLine.match(/^(\s*)/)?.[1] ?? "";
      const next            = editValue.slice(0, start) + "\n" + leadingWs + editValue.slice(end);
      setEditValue(next);
      onValueChange?.(next);
      const newCursorPos = start + 1 + leadingWs.length;
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd   = newCursorPos;
        }
      });
    }
  }

  // textarea 내부 스크롤을 외부 컨테이너에 동기화
  function handleTextareaScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (containerRef.current) {
      containerRef.current.scrollTop  = e.currentTarget.scrollTop;
      containerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }

  return (
    <Highlight
      theme={internalThemes[theme]}
      code={displayCode.trimEnd()}
      language={language}
    >
      {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => {
        const gutterWidth  = showLineNumbers ? getGutterWidth(tokens.length) : "0";
        const gutterPad    = "1rem";
        const textareaLeft = showLineNumbers ? `calc(${gutterWidth} + ${gutterPad})` : "0";

        return (
          // 외부 div가 scroll 컨테이너 & position 기준점 역할
          <div
            ref={containerRef}
            className={["overflow-x-auto rounded-lg text-sm", hlClassName, className]
              .filter(Boolean)
              .join(" ")}
            style={{ ...style, tabSize, position: "relative" }}
          >
            {/* 복사 버튼 */}
            <button
              onClick={handleCopy}
              aria-label="코드 복사"
              style={{
                position:   "absolute",
                top:        "0.35rem",
                right:      "0.35rem",
                zIndex:     10,
                padding:    "0.15rem 0.45rem",
                borderRadius: "0.25rem",
                border:     "none",
                cursor:     "pointer",
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
                fontSize:   "0.7rem",
                lineHeight: 1.4,
                background: copyButtonColor[theme].bg,
                color:      copyButtonColor[theme].text,
                userSelect: "none",
                transition: "opacity 0.1s",
              }}
            >
              {copyState === "copied" ? "✓ 복사됨" : "복사"}
            </button>

            <pre style={{ overflow: "visible", margin: 0 }}>
              <code>
                {tokens.map((line, lineIndex) => {
                  const { className: lineClassName, style: lineStyle, ...lineRest } = getLineProps({ line });
                  const isOdd        = lineIndex % 2 !== 0;
                  const isHighlighted = highlightLines?.includes(lineIndex + 1) ?? false;

                  const rowBg = isHighlighted
                    ? highlightRowColor[theme]
                    : showAlternatingRows && isOdd
                      ? (editable && isFocused ? alternatingRowEditColor[theme] : alternatingRowColor[theme])
                      : undefined;

                  return (
                    <div
                      key={lineIndex}
                      className={["flex", lineClassName].filter(Boolean).join(" ")}
                      style={{ ...lineStyle }}
                      {...lineRest}
                    >
                      {showLineNumbers && (
                        <span
                          aria-hidden="true"
                          style={{
                            minWidth:    gutterWidth,
                            paddingRight: gutterPad,
                            textAlign:   "right",
                            userSelect:  "none",
                            color:       lineNumberColor[theme],
                            flexShrink:  0,
                            fontSize:    "0.85em",
                          }}
                        >
                          {lineIndex + 1}
                        </span>
                      )}
                      <span
                        style={{
                          flex: 1,
                          ...(rowBg ? { backgroundColor: rowBg } : {}),
                        }}
                      >
                        {line.map((token, tokenIndex) => {
                          const { children: tokenContent, ...tokenSpanProps } = getTokenProps({ token });
                          return (
                            <span key={tokenIndex} {...tokenSpanProps}>
                              {showInvisibles
                                ? renderWithInvisibles(token.content, theme, tabSize)
                                : tokenContent}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  );
                })}
              </code>
            </pre>

            {editable && (
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onScroll={handleTextareaScroll}
                aria-label="code editor"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                style={{
                  position:      "absolute",
                  inset:         0,
                  padding:       0,
                  paddingLeft:   textareaLeft,
                  background:    "transparent",
                  color:         "transparent",
                  caretColor:    caretColor[theme],
                  resize:        "none",
                  border:        "none",
                  outline:       "none",
                  fontFamily:    "ui-monospace, 'Cascadia Code', Menlo, monospace",
                  fontSize:      "inherit",
                  lineHeight:    "inherit",
                  overflow:      "hidden",
                  whiteSpace:    "pre",
                  wordBreak:     "normal",
                  overflowWrap:  "normal",
                  tabSize,
                }}
              />
            )}
          </div>
        );
      }}
    </Highlight>
  );
}
