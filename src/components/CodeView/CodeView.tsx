import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
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

const selectionColor = {
  light: "rgba(59,130,246,0.25)",
  dark: "rgba(96,165,250,0.30)",
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

// ── 커서/선택 계산 헬퍼 (순수 함수) ─────────────────────────────────────────

/** 문자열 offset → {row, col} */
function offsetToPos(text: string, offset: number): { row: number; col: number } {
  const before = text.slice(0, Math.min(offset, text.length));
  const lines = before.split("\n");
  return { row: lines.length - 1, col: (lines[lines.length - 1] ?? "").length };
}

/**
 * col 인덱스 → 실제 픽셀 X (탭 너비 반영).
 * CSS tab-size와 동일한 로직: 현재 컬럼에서 다음 tabSize 배수 스톱으로 이동.
 */
function colToX(lineText: string, col: number, charWidth: number, tabSz: number): number {
  let x = 0;
  const limit = Math.min(col, lineText.length);
  for (let i = 0; i < limit; i++) {
    if (lineText[i] === "\t") {
      const currentCol = Math.round(x / charWidth);
      const nextStop   = Math.ceil((currentCol + 1) / tabSz) * tabSz;
      x = nextStop * charWidth;
    } else {
      x += charWidth;
    }
  }
  if (col > lineText.length) x += (col - lineText.length) * charWidth;
  return x;
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

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
  wordWrap = false,
  gutterWidth: gutterWidthProp,
  gutterGap: gutterGapProp,
  showCopyButton = true,
  className = "",
}: CodeViewProps) {
  const [editValue, setEditValue] = useState(code);
  const [isFocused, setIsFocused] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  // 커서/선택 추적
  const [selInfo, setSelInfo] = useState({ start: 0, end: 0 });

  // 문자 측정값 — charWidth: 1글자 픽셀 너비, lineHeight: 1줄 픽셀 높이,
  //               gutterPixels: gutter 전체 픽셀 너비 (minWidth + paddingRight)
  const [metrics, setMetrics] = useState({ charWidth: 0, lineHeight: 0, gutterPixels: 0 });

  const prevCodeRef   = useRef(code);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const charMeasureRef = useRef<HTMLSpanElement>(null); // 문자폭 측정용 hidden span

  // code prop 변경 시 내부 상태 동기화
  useEffect(() => {
    if (code !== prevCodeRef.current) {
      prevCodeRef.current = code;
      setEditValue(code);
    }
  }, [code]);

  // ── 커서/선택 스타일 & 애니메이션 CSS 전역 1회 주입 ─────────────────────────
  useLayoutEffect(() => {
    if (!editable || typeof document === "undefined") return;
    const id = "plastic-cv-style";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = [
      // 커서 깜박임
      "@keyframes plastic-cv-blink{0%,100%{opacity:1}50%{opacity:0}}",
      // textarea native 선택 영역 숨기기 (커스텀 overlay로 대체)
      ".plastic-cv-ta::selection{background:transparent!important}",
    ].join("");
    document.head.appendChild(el);
  }, [editable]);

  // ── 문자 측정 (editable 전용) ────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!editable || !containerRef.current) return;

    const doMeasure = () => {
      const charEl   = charMeasureRef.current;
      const lineEl   = containerRef.current?.querySelector<HTMLElement>("[data-cv-line]");
      const gutterEl = containerRef.current?.querySelector<HTMLElement>("[data-cv-gutter]");
      if (!charEl) return;

      const cw = charEl.getBoundingClientRect().width;
      const lh = lineEl   ? lineEl.getBoundingClientRect().height   : 0;
      const gp = gutterEl ? gutterEl.getBoundingClientRect().width  : 0;

      if (cw > 0) setMetrics({ charWidth: cw, lineHeight: lh, gutterPixels: gp });
    };

    doMeasure();

    // 컨테이너 크기 변경 시 재측정 (폰트 크기 변경 대응)
    const ro = new ResizeObserver(doMeasure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [editable, showLineNumbers, gutterWidthProp, gutterGapProp, tabSize]);

  // ── 선택 영역 동기화 ──────────────────────────────────────────────────────────
  const syncSel = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) setSelInfo({ start: ta.selectionStart, end: ta.selectionEnd });
  }, []);

  const displayCode = editable ? editValue : code;

  // ── 커서/선택 오버레이 렌더링 ─────────────────────────────────────────────────
  function renderCursorOverlay() {
    const { charWidth, lineHeight, gutterPixels } = metrics;
    if (!editable || charWidth === 0 || lineHeight === 0) return null;

    const codeLines  = editValue.split("\n");
    const startPos   = offsetToPos(editValue, selInfo.start);
    const endPos     = offsetToPos(editValue, selInfo.end);
    const isCursor   = selInfo.start === selInfo.end;

    if (isCursor) {
      if (!isFocused) return null;
      const x = gutterPixels + colToX(codeLines[startPos.row] ?? "", startPos.col, charWidth, tabSize);
      const y = startPos.row * lineHeight;
      return (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{
            position:        "absolute",
            left:            x,
            top:             y,
            width:           2,
            height:          lineHeight,
            backgroundColor: caretColor[theme],
            animation:       "plastic-cv-blink 1.2s step-end infinite",
          }} />
        </div>
      );
    }

    // 선택 영역 — 라인별 rect 계산
    const rects: Array<{ row: number; x1: number; x2: number }> = [];
    for (let row = startPos.row; row <= endPos.row; row++) {
      const lineText  = codeLines[row] ?? "";
      // 줄 끝 너비: 마지막 문자 오른쪽 + 1ch (EOL 포함)
      const lineEndX  = colToX(lineText, lineText.length, charWidth, tabSize) + charWidth;
      const x1 = row === startPos.row
        ? colToX(lineText, startPos.col, charWidth, tabSize)
        : 0;
      const x2 = row === endPos.row
        ? colToX(lineText, endPos.col, charWidth, tabSize)
        : lineEndX;
      rects.push({ row, x1, x2 });
    }

    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {rects.map((rect, i) => (
          <div
            key={i}
            style={{
              position:        "absolute",
              left:            gutterPixels + rect.x1,
              top:             rect.row * lineHeight,
              width:           Math.max(0, rect.x2 - rect.x1),
              height:          lineHeight,
              backgroundColor: selectionColor[theme],
            }}
          />
        ))}
      </div>
    );
  }

  // ── 복사 ────────────────────────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  }

  // ── 편집 이벤트 ──────────────────────────────────────────────────────────────
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setEditValue(next);
    onValueChange?.(next);
    syncSel();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el     = e.currentTarget;
    const start  = el.selectionStart;
    const end    = el.selectionEnd;
    const indent = " ".repeat(tabSize);

    if (e.key === "Tab") {
      e.preventDefault();
      const lines     = editValue.split("\n");
      const startLine = editValue.slice(0, start).split("\n").length - 1;
      const endLine   = editValue.slice(0, end).split("\n").length - 1;

      if (startLine !== endLine) {
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
            syncSel();
          }
        });
      } else {
        const next = editValue.slice(0, start) + indent + editValue.slice(end);
        setEditValue(next);
        onValueChange?.(next);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + tabSize;
            textareaRef.current.selectionEnd   = start + tabSize;
            syncSel();
          }
        });
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const currentLine  = editValue.slice(0, start).split("\n").pop() ?? "";
      const leadingWs    = currentLine.match(/^(\s*)/)?.[1] ?? "";
      const next         = editValue.slice(0, start) + "\n" + leadingWs + editValue.slice(end);
      setEditValue(next);
      onValueChange?.(next);
      const newCursorPos = start + 1 + leadingWs.length;
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd   = newCursorPos;
          syncSel();
        }
      });
    }
  }

  // textarea 스크롤을 외부 컨테이너에 동기화
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
        const gutterWidth  = showLineNumbers
          ? (gutterWidthProp ?? getGutterWidth(tokens.length))
          : "0";
        const gutterPad    = gutterGapProp ?? "1rem";
        const textareaLeft = showLineNumbers ? `calc(${gutterWidth} + ${gutterPad})` : "0";

        return (
          <div
            ref={containerRef}
            className={[wordWrap ? "" : "overflow-x-auto", "rounded-lg text-sm", hlClassName, className]
              .filter(Boolean)
              .join(" ")}
            style={{
              ...style,
              tabSize,
              position:            "relative",
              fontFamily:          "ui-monospace, 'Cascadia Code', Menlo, monospace",
              fontVariantLigatures: "none",
              fontKerning:         "none",
            }}
          >
            {/* 문자폭 측정용 hidden span — editable 모드에서만 사용 */}
            {editable && (
              <span
                ref={charMeasureRef}
                aria-hidden="true"
                style={{
                  position:   "absolute",
                  top:        0,
                  left:       0,
                  visibility: "hidden",
                  pointerEvents: "none",
                  whiteSpace: "pre",
                  userSelect: "none",
                }}
              >
                {"M"}
              </span>
            )}

            {/* 복사 버튼 */}
            {showCopyButton && (
              <button
                onClick={handleCopy}
                aria-label="코드 복사"
                style={{
                  position:     "absolute",
                  top:          "0.35rem",
                  right:        "0.35rem",
                  zIndex:       10,
                  padding:      "0.15rem 0.45rem",
                  borderRadius: "0.25rem",
                  border:       "none",
                  cursor:       "pointer",
                  fontFamily:   "ui-sans-serif, system-ui, sans-serif",
                  fontSize:     "0.7rem",
                  lineHeight:   1.4,
                  background:   copyButtonColor[theme].bg,
                  color:        copyButtonColor[theme].text,
                  userSelect:   "none",
                  transition:   "opacity 0.1s",
                }}
              >
                {copyState === "copied" ? "✓ 복사됨" : "복사"}
              </button>
            )}

            <pre style={{
              overflow:   "visible",
              margin:     0,
              padding:    0,
              whiteSpace: wordWrap ? "pre-wrap" : "pre",
              wordBreak:  wordWrap ? "break-all" : "normal",
            }}>
              <code style={{ display: "block" }}>
                {tokens.map((line, lineIndex) => {
                  const { className: lineClassName, style: lineStyle, ...lineRest } = getLineProps({ line });
                  const isOdd         = lineIndex % 2 !== 0;
                  const isHighlighted = highlightLines?.includes(lineIndex + 1) ?? false;

                  const rowBg = isHighlighted
                    ? highlightRowColor[theme]
                    : showAlternatingRows && isOdd
                      ? (editable && isFocused ? alternatingRowEditColor[theme] : alternatingRowColor[theme])
                      : undefined;

                  return (
                    <div
                      key={lineIndex}
                      // 첫 번째 줄에만 측정용 data attribute 부착
                      {...(lineIndex === 0 ? { "data-cv-line": "" } : {})}
                      className={["flex", lineClassName].filter(Boolean).join(" ")}
                      style={{ ...lineStyle }}
                      {...lineRest}
                    >
                      {showLineNumbers && (
                        <span
                          aria-hidden="true"
                          {...(lineIndex === 0 ? { "data-cv-gutter": "" } : {})}
                          style={{
                            minWidth:     gutterWidth,
                            paddingRight: gutterPad,
                            boxSizing:    "content-box",
                            textAlign:    "right",
                            userSelect:   "none",
                            color:        lineNumberColor[theme],
                            flexShrink:   0,
                            fontSize:     "0.85em",
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

            {/* 커서/선택 오버레이 — 측정된 charWidth 기반 픽셀 정밀 배치 */}
            {renderCursorOverlay()}

            {editable && (
              <textarea
                ref={textareaRef}
                className="plastic-cv-ta"
                value={editValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => { setIsFocused(true); syncSel(); }}
                onBlur={() => setIsFocused(false)}
                onSelect={syncSel}
                onKeyUp={syncSel}
                onMouseUp={syncSel}
                onScroll={handleTextareaScroll}
                aria-label="code editor"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                style={{
                  position:     "absolute",
                  inset:        0,
                  padding:      0,
                  paddingLeft:  textareaLeft,
                  background:   "transparent",
                  color:        "transparent",
                  caretColor:   "transparent",   // native 커서 제거 — 오버레이로 대체
                  resize:       "none",
                  border:       "none",
                  outline:      "none",
                  fontFamily:   "inherit",
                  fontSize:     "inherit",
                  lineHeight:   "inherit",
                  overflow:     "hidden",
                  whiteSpace:   wordWrap ? "pre-wrap" : "pre",
                  wordBreak:    wordWrap ? "break-all" : "normal",
                  overflowWrap: wordWrap ? "break-word" : "normal",
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
