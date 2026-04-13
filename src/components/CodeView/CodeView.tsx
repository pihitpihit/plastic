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

// editable + focused 모드 줄 배경 (파란 계열로 편집 중임을 시각화)
const alternatingRowEditColor = {
  light: "rgba(59,130,246,0.08)",
  dark: "rgba(96,165,250,0.10)",
} as const;

const caretColor = {
  light: "rgba(0,0,0,0.85)",
  dark: "rgba(255,255,255,0.85)",
} as const;

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
  className = "",
}: CodeViewProps) {
  const [editValue, setEditValue] = useState(code);
  const [isFocused, setIsFocused] = useState(false);
  const prevCodeRef = useRef(code);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // code prop 변경 시 내부 상태 동기화 (외부에서 코드를 교체하는 경우)
  useEffect(() => {
    if (code !== prevCodeRef.current) {
      prevCodeRef.current = code;
      setEditValue(code);
    }
  }, [code]);

  const displayCode = editable ? editValue : code;

  const rowColor =
    showAlternatingRows
      ? (editable && isFocused ? alternatingRowEditColor[theme] : alternatingRowColor[theme])
      : undefined;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setEditValue(next);
    onValueChange?.(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const indent = " ".repeat(tabSize);
      const next = editValue.slice(0, start) + indent + editValue.slice(end);
      setEditValue(next);
      onValueChange?.(next);
      // 커서 위치 복원 (setState가 비동기이므로 rAF 사용)
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + tabSize;
          textareaRef.current.selectionEnd = start + tabSize;
        }
      });
    }
  }

  return (
    <Highlight
      theme={internalThemes[theme]}
      code={displayCode.trimEnd()}
      language={language}
    >
      {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
        // 외부 div가 scroll 컨테이너 & position 기준점 역할
        <div
          className={["overflow-x-auto rounded-lg text-sm", hlClassName, className]
            .filter(Boolean)
            .join(" ")}
          style={{ ...style, tabSize, position: "relative" }}
        >
          <pre style={{ overflow: "visible", margin: 0 }}>
            <code>
              {tokens.map((line, lineIndex) => {
                const { className: lineClassName, style: lineStyle, ...lineRest } = getLineProps({ line });
                const isOdd = lineIndex % 2 !== 0;

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
                          minWidth: "2.5rem",
                          paddingRight: "1rem",
                          textAlign: "right",
                          userSelect: "none",
                          color: lineNumberColor[theme],
                          flexShrink: 0,
                          fontSize: "0.85em",
                        }}
                      >
                        {lineIndex + 1}
                      </span>
                    )}
                    <span
                      style={{
                        flex: 1,
                        ...(isOdd ? { backgroundColor: rowColor } : {}),
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
              aria-label="code editor"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              style={{
                position: "absolute",
                inset: 0,
                padding: 0,
                paddingLeft: showLineNumbers ? "calc(2.5rem + 1rem)" : 0,
                background: "transparent",
                color: "transparent",
                caretColor: caretColor[theme],
                resize: "none",
                border: "none",
                outline: "none",
                fontFamily: "ui-monospace, 'Cascadia Code', Menlo, monospace",
                fontSize: "inherit",
                lineHeight: "inherit",
                overflow: "hidden",
                whiteSpace: "pre",
                wordBreak: "normal",
                overflowWrap: "normal",
                tabSize,
              }}
            />
          )}
        </div>
      )}
    </Highlight>
  );
}
