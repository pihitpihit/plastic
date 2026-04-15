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

const alternatingRowColor = {
  light: "rgba(0,0,0,0.04)",
  dark: "rgba(255,255,255,0.04)",
} as const;

const alternatingRowEditColor = {
  light: "rgba(59,130,246,0.10)",
  dark:  "rgba(96,165,250,0.12)",
} as const;

const highlightRowColor = {
  light: "rgba(253,224,71,0.35)",
  dark: "rgba(253,224,71,0.15)",
} as const;

const copyButtonColor = {
  light: { bg: "rgba(0,0,0,0.06)", text: "rgba(0,0,0,0.45)" },
  dark:  { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.45)" },
} as const;

function getGutterWidth(lineCount: number): string {
  if (lineCount < 10)   return "1.5rem";
  if (lineCount < 100)  return "2rem";
  if (lineCount < 1000) return "2.75rem";
  return "3.5rem";
}

// ── read 모드 copy 로직 헬퍼 ────────────────────────────────────────────────
//
// 읽기 모드는 syntax-highlighted DOM 에서 사용자 선택 영역을 원본 코드 문자로
// 역변환해야 한다 (chip 내부 "NUL" 문자가 아닌 실제 제어 문자 복사).
// 편집 모드는 textarea 가 네이티브 clipboard 를 처리하므로 이 경로를 쓰지 않는다.
type EffectiveNode =
  | { type: "text"; node: Text; lineRow: Element | null }
  | {
      type: "chip";
      element: Element;
      parent: Element;
      indexInParent: number;
      lineRow: Element | null;
    };

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

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
//
// 편집 모드 아키텍처 (textarea overlay):
//   <grid cell>
//     ├── <pre>  syntax-highlighted 시각 레이어 (pointer-events: none)
//     └── <textarea>  투명 입력 레이어 (네이티브 caret / 선택 / IME / undo)
//
// textarea 가 편집의 single source of truth. React 는 value={editValue} 로
// controlled 로 관리하고, onChange 로만 editValue 를 갱신한다. 브라우저가
// DOM 을 변형해도 React VDOM 과 drift 가 발생하지 않는다.
//
// pre 와 textarea 는 CSS grid 의 동일 셀에 배치되어 자동으로 동일 크기를
// 가진다. 글꼴/line-height/tab-size/white-space 가 모두 inherit 이므로
// 시각 정렬이 유지된다.

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
  const [isFocused, setIsFocused] = useState(false);
  // IME 조합(한글/중/일 등) 중에는 pre 를 숨기고 textarea 텍스트를 보이게
  // 전환하여 OS/브라우저가 그리는 composition underline 이 노출되도록 한다.
  const [isComposing, setIsComposing] = useState(false);
  const prevCodeRef  = useRef(code);
  const preRef       = useRef<HTMLPreElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (code !== prevCodeRef.current) {
      prevCodeRef.current = code;
      setEditValue(code);
    }
  }, [code]);

  const displayCode = editable ? editValue : code;

  // ── 편집 이벤트 (textarea) ─────────────────────────────────────────────────

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setEditValue(next);
    onValueChange?.(next);
  }

  function updateValueAndCursor(next: string, caretStart: number, caretEnd = caretStart) {
    setEditValue(next);
    onValueChange?.(next);
    // React controlled textarea: value 가 다음 paint 에 반영되므로 caret 은
    // layout effect 타이밍에 다시 설정해야 한다. setTimeout 0 로 충분.
    queueMicrotask(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.selectionStart = caretStart;
      ta.selectionEnd   = caretEnd;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // IME 조합 중 발생하는 keydown 은 전부 네이티브에 위임한다.
    // (한글 입력 후 Enter 로 조합 종료 시 우리 Enter 핸들러가 개입하면
    //  마지막 글자가 중복되고 개행이 추가 삽입되는 문제가 생긴다.)
    // React 의 SyntheticKeyboardEvent 는 nativeEvent.isComposing 을 제공.
    // 구형 경로로 keyCode === 229 도 함께 체크.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

    const ta = e.currentTarget;
    const indent = " ".repeat(tabSize);
    const { selectionStart: s, selectionEnd: en, value } = ta;

    if (e.key === "Tab") {
      e.preventDefault();
      if (s === en) {
        const next = value.slice(0, s) + indent + value.slice(en);
        updateValueAndCursor(next, s + indent.length);
      } else {
        // 다중 라인 들여쓰기 / 내어쓰기
        const before        = value.slice(0, s);
        const startLineStart = before.lastIndexOf("\n") + 1;
        const selected      = value.slice(startLineStart, en);
        const lines         = selected.split("\n");
        let startDelta = 0;
        let totalDelta = 0;
        const modified = lines.map((l, i) => {
          if (e.shiftKey) {
            const stripped = l.startsWith(indent)
              ? l.slice(indent.length)
              : l.replace(/^( +)/, (m) => m.slice(Math.min(m.length, tabSize)));
            const d = stripped.length - l.length;
            if (i === 0) startDelta = d;
            totalDelta += d;
            return stripped;
          } else {
            if (i === 0) startDelta = indent.length;
            totalDelta += indent.length;
            return indent + l;
          }
        }).join("\n");
        const next = value.slice(0, startLineStart) + modified + value.slice(en);
        updateValueAndCursor(next, s + startDelta, en + totalDelta);
      }
      return;
    }

    if (e.key === "Enter") {
      // 이전 라인의 앞쪽 공백만큼 자동 들여쓰기
      e.preventDefault();
      const before     = value.slice(0, s);
      const lineIndent = (before.split("\n").pop() ?? "").match(/^(\s*)/)?.[1] ?? "";
      const insert     = "\n" + lineIndent;
      const next       = value.slice(0, s) + insert + value.slice(en);
      updateValueAndCursor(next, s + insert.length);
      return;
    }
  }

  // ── 복사 ────────────────────────────────────────────────────────────────────

  function handleCopyAll() {
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  }

  // 읽기 모드 전용. 선택 영역의 chip 내부 mnemonic 텍스트("NUL", "·", "→") 를
  // 원본 문자로 역변환해 클립보드에 기록한다. 편집 모드는 textarea 가 처리.
  function handleCopyEvent(e: React.ClipboardEvent<HTMLDivElement>) {
    if (editable) return;
    const pre = preRef.current;
    if (!pre) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!range.intersectsNode(pre)) return;

    const items = walkEffectiveNodes(pre);
    let output = "";
    let prevLineRow: Element | null | undefined = undefined;

    for (const item of items) {
      let contribution = "";
      if (item.type === "text") {
        const node = item.node;
        const startCmp = range.comparePoint(node, 0);
        const endCmp   = range.comparePoint(node, node.length);
        if (endCmp < 0 || startCmp > 0) continue;
        const sliceStart = range.startContainer === node ? range.startOffset : 0;
        const sliceEnd   = range.endContainer   === node ? range.endOffset   : node.length;
        if (sliceEnd <= sliceStart) continue;
        contribution = node.data.slice(sliceStart, sliceEnd);
      } else {
        const startCmp = range.comparePoint(item.parent, item.indexInParent);
        const endCmp   = range.comparePoint(item.parent, item.indexInParent + 1);
        if (startCmp < 0 || endCmp > 0) continue;
        contribution = item.element.getAttribute("data-char") ?? "";
      }
      if (!contribution) continue;
      if (prevLineRow !== undefined && item.lineRow !== prevLineRow) output += "\n";
      prevLineRow = item.lineRow;
      output += contribution;
    }

    if (!output) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", output);
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────────
  return (
    <Highlight
      theme={internalThemes[theme]}
      // 편집 모드: 후행 공백 유지 (textarea value 와 pre 라인 수가 일치해야 함)
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
            onClick={handleCopyAll}
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

        const rowBgFor = (li: number): string | undefined => {
          const isHighlighted = highlightLines?.includes(li + 1) ?? false;
          if (isHighlighted) return highlightRowColor[theme];
          // 편집 모드는 stripe 를 상위 wrapper 의 backgroundImage 로 처리한다
          // (pre 가 IME 조합 중 opacity 0 이 되어도 stripe 가 유지되도록).
          if (editable) return undefined;
          if (!showAlternatingRows) return undefined;
          if (li % 2 === 0) return undefined;
          return alternatingRowColor[theme];
        };

        const wrapperStripeColor = editable && isFocused
          ? alternatingRowEditColor[theme]
          : alternatingRowColor[theme];

        // pre 콘텐츠는 읽기/편집 모드 공통. 편집 모드에서 invisibles 칩을 그리면
        // 실제 1 문자와 폭이 달라 textarea caret 과 시각 정렬이 어긋나므로 raw 로.
        const preContent = tokens.map((line, li) => {
          const { className: lineClassName, style: lineStyle, ...lineRest } = getLineProps({ line });
          const rowBg = rowBgFor(li);
          return (
            <div
              key={li}
              data-line-row="true"
              className={lineClassName}
              style={{
                ...lineStyle,
                ...(rowBg ? { backgroundColor: rowBg } : {}),
              }}
              {...lineRest}
            >
              {line.map((token, ti) => {
                const { children: tokenContent, ...tokenSpanProps } = getTokenProps({ token });
                return (
                  <span key={ti} {...tokenSpanProps}>
                    {showInvisibles
                      ? renderWithInvisibles(token.content, theme, tabSize, editable)
                      : tokenContent}
                  </span>
                );
              })}
            </div>
          );
        });

        return (
          <div
            ref={containerRef}
            className={baseContainerClass}
            onCopy={handleCopyEvent}
            style={{ ...baseStyle, display: "flex", tabSize }}
          >
            {copyBtn}

            {showLineNumbers && (
              <div
                data-gutter="true"
                aria-hidden="true"
                style={{
                  flexShrink:    0,
                  minWidth:      resolvedGutterWidth,
                  paddingRight:  resolvedGutterGap,
                  boxSizing:     "content-box" as const,
                  textAlign:     "right" as const,
                  color:         lineNumberColor[theme],
                  fontSize:      "0.85em",
                  lineHeight:    "inherit",
                  userSelect:    "none" as const,
                  pointerEvents: "none" as const,
                }}
              >
                {tokens.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
            )}

            <div
              style={{
                flex:     1,
                minWidth: 0,
                display:  "grid",
                // pre/textarea 가 동일 셀에 스택. 셀 크기는 pre 의 intrinsic 에
                // 맞춰지고 textarea 는 그 크기에 stretch.
                //
                // 편집 모드의 stripe 는 이 wrapper 의 backgroundImage 로 렌더.
                // 2lh 주기 linear-gradient 로 짝수 라인 상단은 transparent,
                // 하단은 stripe 색. pre 의 opacity 와 무관하게 유지된다.
                ...(editable && showAlternatingRows
                  ? {
                      backgroundImage: `linear-gradient(to bottom, transparent 50%, ${wrapperStripeColor} 50%)`,
                      backgroundSize: "100% 2lh",
                      backgroundRepeat: "repeat-y",
                    }
                  : {}),
              }}
            >
              <pre
                ref={preRef}
                aria-hidden={editable ? true : undefined}
                style={{
                  gridArea:   "1 / 1",
                  margin:     0,
                  padding:    0,
                  whiteSpace: wordWrap ? "pre-wrap" : "pre",
                  wordBreak:  wordWrap ? "break-all" : "normal",
                  color:      "inherit",
                  fontFamily: "inherit",
                  fontSize:   "inherit",
                  lineHeight: "inherit",
                  tabSize,
                  overflow:   "visible",
                  background: "transparent",
                  // 편집 모드: 입력은 textarea 가 받도록 pre 는 이벤트 비활성화
                  pointerEvents: editable ? "none" : undefined,
                  // IME 조합 중에는 pre 를 숨겨 textarea 의 composition
                  // underline 이 가려지지 않게 한다.
                  opacity: editable && isComposing ? 0 : 1,
                }}
              >
                {preContent}
              </pre>

              {editable && (
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  wrap={wordWrap ? "soft" : "off"}
                  aria-label="code editor"
                  style={{
                    gridArea:   "1 / 1",
                    width:      "100%",
                    height:     "100%",
                    margin:     0,
                    padding:    0,
                    border:     "none",
                    outline:    "none",
                    resize:     "none",
                    // 외부 container 의 overflow-x-auto 가 가로 스크롤 담당
                    overflow:   "hidden",
                    background: "transparent",
                    // 평소에는 텍스트 투명 (pre 가 시각 담당). 조합 중엔 가시화.
                    color:              isComposing ? "inherit" : "transparent",
                    WebkitTextFillColor: isComposing ? "inherit" : "transparent",
                    // caret-color 는 테마에 맞춘 실색상. currentColor 로 두면
                    // color: transparent 일 때 caret 도 투명해져 깜빡임이 보이지 않는다.
                    caretColor:         theme === "dark" ? "#fff" : "#000",
                    // pre 와 동일 메트릭 (inherit)
                    font:          "inherit",
                    letterSpacing: "inherit",
                    lineHeight:    "inherit",
                    tabSize,
                    whiteSpace: wordWrap ? "pre-wrap" : "pre",
                    wordBreak:  wordWrap ? "break-all" : "normal",
                  }}
                />
              )}
            </div>
          </div>
        );
      }}
    </Highlight>
  );
}
