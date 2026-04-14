import { useState, useEffect, useLayoutEffect, useRef, Fragment } from "react";
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

const alternatingRowColor = {
  light: "rgba(0,0,0,0.04)",
  dark: "rgba(255,255,255,0.04)",
} as const;

const highlightRowColor = {
  light: "rgba(253,224,71,0.35)",
  dark: "rgba(253,224,71,0.15)",
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

// ── contenteditable 커서 헬퍼 ─────────────────────────────────────────────────

/**
 * "유효 콘텐츠 노드" 목록을 반환한다.
 *
 * - text  : <pre> 아래의 일반 텍스트 노드 (칩 내부 텍스트는 제외)
 * - chip  : data-char 속성이 있는 요소 (탭·공백·니모닉 칩).
 *           브라우저는 contentEditable=false 칩을 1개의 커서 단위로 처리하고,
 *           칩 내부 텍스트를 커서/선택 계산에 포함하지 않는다.
 *           parent + indexInParent 를 함께 저장하여 element-based 커서 위치를 처리한다.
 */
type EffectiveNode =
  | { type: "text"; node: Text; lineRow: Element | null }
  | {
      type: "chip";
      element: Element;
      parent: Element;
      indexInParent: number;
      lineRow: Element | null;
    };

/**
 * Walker 불변식:
 *   - `[data-gutter]` 서브트리는 진입하지 않고 전부 skip (라인 번호 컬럼 등).
 *   - `[data-char]` 요소(칩)는 1 문자 단위의 chip 항목으로 push 하고 내부 순회 중단.
 *   - 각 항목에 가장 가까운 `[data-line-row]` 조상을 `lineRow` 로 동봉한다.
 *     `lineRow` 전환점은 copy 로직에서 라인 경계('\n') 삽입을 판정하는 데 쓰인다.
 */
function walkEffectiveNodes(root: Element): EffectiveNode[] {
  const result: EffectiveNode[] = [];

  function walk(node: Node, parent: Element, lineRow: Element | null): void {
    if (node.nodeType === Node.TEXT_NODE) {
      result.push({ type: "text", node: node as Text, lineRow });
      return;
    }
    const el = node as Element;
    if (el.hasAttribute("data-gutter")) return;
    if (el.hasAttribute("data-char")) {
      // 칩 요소: 1 문자로 계산하고 내부 텍스트는 순회하지 않는다
      const siblings = Array.from(parent.childNodes);
      result.push({
        type: "chip",
        element: el,
        parent,
        indexInParent: siblings.indexOf(el as ChildNode),
        lineRow,
      });
      return;
    }
    const nextLineRow = el.hasAttribute("data-line-row") ? el : lineRow;
    for (const child of Array.from(el.childNodes)) walk(child, el, nextLineRow);
  }

  for (const child of Array.from(root.childNodes)) walk(child, root, null);
  return result;
}

/**
 * (container, offset) → editValue 내 선형 문자 오프셋.
 *
 * container가 텍스트 노드인 경우: 일반 텍스트 오프셋.
 * container가 요소인 경우: 칩 인접 위치 (contentEditable=false 처리).
 */
function domPosToOffset(
  root: Element,
  container: Node,
  offset: number,
): number {
  const nodes = walkEffectiveNodes(root);
  let count = 0;

  for (const item of nodes) {
    if (item.type === "text") {
      if (item.node === container) return count + offset;
      count += item.node.length;
    } else {
      // 커서가 칩의 부모 요소 안에서 child index 로 표현된 경우
      if (
        container.nodeType === Node.ELEMENT_NODE &&
        (container as Element) === item.parent
      ) {
        if (offset === item.indexInParent)     return count;      // 칩 바로 앞
        if (offset === item.indexInParent + 1) return count + 1;  // 칩 바로 뒤
      }
      count += 1;
    }
  }
  return count;
}

/**
 * editValue 내 선형 문자 오프셋 → (node, offset) DOM 위치.
 *
 * 칩 앞/뒤는 parent 요소의 child index 로 표현한다.
 */
function offsetToDomPos(
  root: Element,
  charOffset: number,
): { node: Node; offset: number } | null {
  const nodes = walkEffectiveNodes(root);
  let remaining = charOffset;

  for (const item of nodes) {
    if (item.type === "text") {
      if (remaining <= item.node.length) return { node: item.node, offset: remaining };
      remaining -= item.node.length;
    } else {
      if (remaining === 0) {
        // 칩 바로 앞: parent 요소에서 칩의 child index
        return { node: item.parent, offset: item.indexInParent };
      }
      remaining -= 1;
      // remaining이 0이 되면 다음 반복에서 "다음 노드의 앞" 위치로 자연스럽게 처리됨
    }
  }

  // 범위 초과: 마지막 유효 노드 끝
  for (let i = nodes.length - 1; i >= 0; i--) {
    const last = nodes[i];
    if (!last) continue;
    if (last.type === "text")
      return { node: last.node, offset: last.node.length };
    if (last.type === "chip")
      return { node: last.parent, offset: last.indexInParent + 1 };
  }
  return null;
}

/**
 * <pre contenteditable> DOM에서 실제 코드 문자열을 추출한다.
 * 일반 텍스트 노드의 텍스트 + 칩의 data-char 값을 순서대로 결합한다.
 * (pre.innerText는 칩의 니모닉 텍스트 "NUL" 등을 반환하므로 사용 불가)
 */
function extractCodeFromPre(pre: HTMLPreElement): string {
  let result = "";
  for (const item of walkEffectiveNodes(pre)) {
    if (item.type === "text") {
      result += item.node.data;
    } else {
      result += item.element.getAttribute("data-char") ?? "";
    }
  }
  return result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [lineHeightPx, setLineHeightPx] = useState(0);

  const prevCodeRef    = useRef(code);
  const preRef         = useRef<HTMLPreElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  // 렌더 후 커서를 복원할 때 사용하는 선형 오프셋 저장소
  const savedCursorRef  = useRef<{ start: number; end: number } | null>(null);
  // IME 조합(한글 등) 중에는 React 재렌더를 막아 조합이 깨지지 않도록 함
  const isComposingRef  = useRef(false);

  // 편집 모드 라인 높이 측정 (alternatingRows / highlightLines 오버레이용)
  useLayoutEffect(() => {
    if (!editable || !preRef.current) return;
    const measure = () => {
      const lh = parseFloat(getComputedStyle(preRef.current!).lineHeight);
      if (lh > 0) setLineHeightPx(lh);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(preRef.current);
    return () => ro.disconnect();
  }, [editable]);

  // code prop 변경 시 내부 상태 동기화
  useEffect(() => {
    if (code !== prevCodeRef.current) {
      prevCodeRef.current = code;
      setEditValue(code);
    }
  }, [code]);

  const displayCode = editable ? editValue : code;

  // ── 렌더 후 커서 복원 ─────────────────────────────────────────────────────
  // React가 Prism 토큰을 업데이트하면 DOM이 바뀌고 selection이 무효화된다.
  // useLayoutEffect(브라우저 페인트 전)에서 저장된 오프셋으로 selection을 복원한다.
  useLayoutEffect(() => {
    const saved = savedCursorRef.current;
    if (!saved || !preRef.current) return;
    savedCursorRef.current = null;

    const pre = preRef.current;
    const sel = window.getSelection();
    if (!sel) return;

    const startPos = offsetToDomPos(pre, saved.start);
    const endPos   = saved.end !== saved.start
      ? offsetToDomPos(pre, saved.end)
      : startPos;

    if (!startPos) return;
    try {
      const range = document.createRange();
      range.setStart(startPos.node, startPos.offset);
      if (endPos && saved.end !== saved.start) {
        range.setEnd(endPos.node, endPos.offset);
      } else {
        range.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      // 빠른 편집 중 range가 잠시 무효화될 수 있음 — 무시
    }
  });

  // ── 편집 이벤트 ──────────────────────────────────────────────────────────────

  function handleInput() {
    const pre = preRef.current;
    if (!pre) return;
    // IME 조합 중(isComposing)에는 중간 문자를 state에 반영하지 않는다.
    // compositionend 이후 최종 문자가 확정되면 정상 처리된다.
    if (isComposingRef.current) return;

    // 상태 업데이트 전에 커서 오프셋을 저장 (브라우저가 수정한 DOM 기준)
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      const range = sel.getRangeAt(0);
      const start = domPosToOffset(pre, range.startContainer, range.startOffset);
      const end   = sel.isCollapsed
        ? start
        : domPosToOffset(pre, range.endContainer, range.endOffset);
      savedCursorRef.current = { start, end };
    }

    // extractCodeFromPre: 일반 텍스트 + 칩의 data-char 를 결합하여 실제 코드 추출
    // (pre.innerText 는 칩의 니모닉 텍스트 "NUL" 등을 포함하므로 사용 불가)
    const newValue = extractCodeFromPre(pre);
    setEditValue(newValue);
    onValueChange?.(newValue);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLPreElement>) {
    const pre = preRef.current!;
    const indent = " ".repeat(tabSize);

    if (e.key === "Tab") {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;

      if (sel.isCollapsed) {
        // 단일 커서: 공백 삽입
        document.execCommand("insertText", false, indent);
      } else {
        // 다중 라인 선택: 들여쓰기 / 내어쓰기
        const range      = sel.getRangeAt(0);
        const start      = domPosToOffset(pre, range.startContainer, range.startOffset);
        const end        = domPosToOffset(pre, range.endContainer, range.endOffset);
        const lines      = editValue.split("\n");
        const startLine  = editValue.slice(0, start).split("\n").length - 1;
        const endLine    = editValue.slice(0, end).split("\n").length - 1;

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
        savedCursorRef.current = {
          start: Math.max(0, start + startDelta),
          end:   Math.max(0, end + totalDelta),
        };
        setEditValue(next);
        onValueChange?.(next);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range  = sel.getRangeAt(0);
      const cursor = domPosToOffset(pre, range.startContainer, range.startOffset);
      const before = editValue.slice(0, cursor);
      const lineIndent = (before.split("\n").pop() ?? "").match(/^(\s*)/)?.[1] ?? "";
      document.execCommand("insertText", false, "\n" + lineIndent);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLPreElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (text) document.execCommand("insertText", false, text);
  }

  // ── 복사 ────────────────────────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────────
  return (
    <Highlight
      theme={internalThemes[theme]}
      // 편집 모드: trimEnd 하지 않아 실제 줄 수 유지 / 읽기 모드: 후행 공백 제거
      code={editable ? displayCode : displayCode.trimEnd()}
      language={language}
    >
      {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => {
        const resolvedGutterWidth = showLineNumbers
          ? (gutterWidthProp ?? getGutterWidth(tokens.length))
          : "0";
        const resolvedGutterGap = gutterGapProp ?? "1rem";

        const baseContainerClass = [
          wordWrap ? "" : "overflow-x-auto",
          "rounded-lg text-sm",
          hlClassName,
          className,
        ].filter(Boolean).join(" ");

        const baseStyle = {
          ...style,
          position:             "relative" as const,
          fontFamily:           "ui-monospace, 'Cascadia Code', Menlo, monospace",
          fontVariantLigatures: "none" as const,
          fontKerning:          "none" as const,
        };

        const copyBtn = showCopyButton ? (
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
        ) : null;

        // ── 편집 모드: <pre contenteditable> ─────────────────────────────────
        if (editable) {
          return (
            <div
              ref={containerRef}
              className={baseContainerClass}
              style={{ ...baseStyle, display: "flex", tabSize }}
            >
              {copyBtn}

              {/* 라인 번호 컬럼 */}
              {showLineNumbers && (
                <div
                  aria-hidden="true"
                  style={{
                    flexShrink:      0,
                    width:           resolvedGutterWidth,
                    paddingRight:    resolvedGutterGap,
                    boxSizing:       "content-box" as const,
                    textAlign:       "right" as const,
                    color:           lineNumberColor[theme],
                    fontSize:        "0.85em",
                    lineHeight:      "inherit",
                    userSelect:      "none" as const,
                    pointerEvents:   "none" as const,
                    // 수평 스크롤 시 번호 컬럼이 가려지지 않도록 sticky
                    position:        "sticky" as const,
                    left:            0,
                    zIndex:          1,
                    backgroundColor: style.backgroundColor as string,
                  }}
                >
                  {tokens.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
              )}

              {/* 라인 배경 오버레이 (alternatingRows / highlightLines) */}
              {lineHeightPx > 0 && (showAlternatingRows || (highlightLines && highlightLines.length > 0)) && (
                <div
                  aria-hidden="true"
                  style={{
                    position:      "absolute",
                    // gutter 너비만큼 오른쪽부터 시작
                    left:          showLineNumbers ? `calc(${resolvedGutterWidth} + ${resolvedGutterGap} + ${resolvedGutterGap})` : 0,
                    right:         0,
                    top:           0,
                    pointerEvents: "none",
                    zIndex:        0,
                  }}
                >
                  {tokens.map((_, i) => {
                    const isOdd         = i % 2 !== 0;
                    const isHighlighted = highlightLines?.includes(i + 1) ?? false;
                    const bg = isHighlighted
                      ? highlightRowColor[theme]
                      : showAlternatingRows && isOdd
                        ? alternatingRowColor[theme]
                        : undefined;
                    return bg ? (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          top:      i * lineHeightPx,
                          left:     0,
                          right:    0,
                          height:   lineHeightPx,
                          backgroundColor: bg,
                        }}
                      />
                    ) : null;
                  })}
                </div>
              )}

              {/* 편집 가능한 코드 영역 */}
              <pre
                ref={preRef}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onCompositionStart={() => { isComposingRef.current = true; }}
                onCompositionEnd={() => {
                  isComposingRef.current = false;
                  // 조합 완료 후 확정된 텍스트를 state에 반영
                  handleInput();
                }}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                style={{
                  flex:       1,
                  margin:     0,
                  padding:    0,
                  outline:    "none",
                  whiteSpace: wordWrap ? "pre-wrap" : "pre",
                  wordBreak:  wordWrap ? "break-all" : "normal",
                  background: "transparent",
                  color:      "inherit",
                  fontFamily: "inherit",
                  fontSize:   "inherit",
                  lineHeight: "inherit",
                  tabSize,
                  // Prism theme의 overflow 설정을 무력화
                  overflow:   "visible",
                }}
              >
                {tokens.map((line, li) => (
                  <Fragment key={li}>
                    {li > 0 && "\n"}
                    {line.map((token, ti) => {
                      const { className: tc, style: ts } = getTokenProps({ token });
                      return (
                        <span key={ti} className={tc} style={ts}>
                          {showInvisibles
                            ? renderWithInvisibles(token.content, theme, tabSize, true)
                            : token.content}
                        </span>
                      );
                    })}
                  </Fragment>
                ))}
              </pre>
            </div>
          );
        }

        // ── 읽기 모드: 현재 구조 유지 ────────────────────────────────────────
        return (
          <div
            ref={containerRef}
            className={baseContainerClass}
            style={{ ...baseStyle, tabSize }}
          >
            {copyBtn}

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
                      ? alternatingRowColor[theme]
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
                            minWidth:     resolvedGutterWidth,
                            paddingRight: resolvedGutterGap,
                            boxSizing:    "content-box" as const,
                            textAlign:    "right" as const,
                            userSelect:   "none" as const,
                            color:        lineNumberColor[theme],
                            flexShrink:   0,
                            fontSize:     "0.85em",
                          }}
                        >
                          {lineIndex + 1}
                        </span>
                      )}
                      <span style={{ flex: 1, ...(rowBg ? { backgroundColor: rowBg } : {}) }}>
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
          </div>
        );
      }}
    </Highlight>
  );
}
