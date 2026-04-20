import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  ClipboardEvent as ReactClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from "react";
import { useControllable } from "../_shared/useControllable";
import { useHexVirtualList } from "./useHexVirtualList";
import type {
  HexViewCopyFormat,
  HexViewProps,
  HexViewSelection,
  HexViewTheme,
} from "./HexView.types";
import {
  autoOffsetDigits,
  formatBytes,
  formatOffset,
  hexOf,
  normalizeData,
  renderAsciiChar,
  renderOrderForRow,
  resolveGroupSize,
} from "./HexView.utils";

// ── 테마 팔레트 ──────────────────────────────────────────────────────────────

interface Palette {
  bg: string;
  fg: string;
  offsetFg: string;
  asciiFg: string;
  headerBg: string;
  border: string;
  alt: string;
  hoverBg: string;
  selectionBg: string;
  selectionFg: string;
  highlightBg: string;
  nullByteFg: string;
  copyBtnBg: string;
  copyBtnFg: string;
  copyBtnActiveBg: string;
  copyBtnActiveFg: string;
  focusOutline: string;
}

const PALETTE: Record<HexViewTheme, Palette> = {
  light: {
    bg: "#ffffff",
    fg: "#1f2937",
    offsetFg: "rgba(0,0,0,0.40)",
    asciiFg: "#374151",
    headerBg: "#f9fafb",
    border: "rgba(0,0,0,0.08)",
    alt: "rgba(0,0,0,0.03)",
    hoverBg: "rgba(59,130,246,0.18)",
    selectionBg: "rgba(59,130,246,0.30)",
    selectionFg: "#1e3a8a",
    highlightBg: "rgba(253,224,71,0.45)",
    nullByteFg: "rgba(0,0,0,0.25)",
    copyBtnBg: "rgba(0,0,0,0.06)",
    copyBtnFg: "rgba(0,0,0,0.55)",
    copyBtnActiveBg: "rgba(59,130,246,0.85)",
    copyBtnActiveFg: "#ffffff",
    focusOutline: "#2563eb",
  },
  dark: {
    bg: "#1e1e1e",
    fg: "#e5e7eb",
    offsetFg: "rgba(255,255,255,0.35)",
    asciiFg: "#d1d5db",
    headerBg: "#27272a",
    border: "rgba(255,255,255,0.10)",
    alt: "rgba(255,255,255,0.04)",
    hoverBg: "rgba(96,165,250,0.22)",
    selectionBg: "rgba(96,165,250,0.36)",
    selectionFg: "#dbeafe",
    highlightBg: "rgba(253,224,71,0.22)",
    nullByteFg: "rgba(255,255,255,0.25)",
    copyBtnBg: "rgba(255,255,255,0.08)",
    copyBtnFg: "rgba(255,255,255,0.55)",
    copyBtnActiveBg: "rgba(96,165,250,0.85)",
    copyBtnActiveFg: "#ffffff",
    focusOutline: "#60a5fa",
  },
};

const FONT_STACK =
  "ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace";
const DEFAULT_ROW_HEIGHT = 20;

// ── CSS 주입 (hover overlay 와 focus outline) ────────────────────────────────
//
// hover 배경은 ::after 오버레이로 구현해서 React 가 쓴 inline backgroundColor
// 를 덮어쓰지 않게 한다. hover 는 mouseover delegation 으로 data-hover 속성만
// 토글하면 되므로 리렌더 없이 빠르게 반영된다.
// focus outline 은 React 렌더 시 data-focused 로 관리 (상태 변화 빈도가 낮음).
const STYLE_ID = "plastic-hexview-style";
function ensureHexViewStyle(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .plastic-hv-cell {
      position: relative;
    }
    .plastic-hv-cell[data-hover="1"]::after {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--plastic-hv-hover, rgba(59,130,246,0.18));
      pointer-events: none;
      border-radius: 2px;
    }
    .plastic-hv-cell[data-focused="1"] {
      outline: 1px solid var(--plastic-hv-focus, #2563eb);
      outline-offset: -1px;
      z-index: 1;
    }
  `;
  document.head.appendChild(s);
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export function HexView(props: HexViewProps) {
  const {
    data,
    bytesPerRow = 16,
    groupSize: groupSizeProp = 1,
    endian = "big",
    showAscii = true,
    showOffsetColumn = true,
    showOffsetHeader = true,
    baseOffset = 0,
    offsetDigits: offsetDigitsProp,
    theme = "light",
    showAlternatingRows = true,
    highlightRanges,
    maxHeight = "60vh",
    showCopyButton = true,
    defaultCopyFormat = "hex",
    selection: selectionProp,
    onSelectionChange,
    linkHover = true,
    nonPrintable = "dot",
    className = "",
  } = props;

  const bytes = useMemo(() => normalizeData(data), [data]);
  const groupSize = useMemo(
    () => resolveGroupSize(bytesPerRow, groupSizeProp),
    [bytesPerRow, groupSizeProp],
  );
  const totalRows = Math.ceil(bytes.length / bytesPerRow);
  const groupsPerRow = bytesPerRow / groupSize;

  const offsetDigits = useMemo(() => {
    if (offsetDigitsProp !== undefined) return offsetDigitsProp;
    const maxOff = bytes.length > 0 ? baseOffset + bytes.length - 1 : baseOffset;
    return autoOffsetDigits(Math.max(0, maxOff));
  }, [offsetDigitsProp, baseOffset, bytes.length]);

  const palette = PALETTE[theme];

  // Selection (controlled/uncontrolled)
  const [selection, setSelection] = useControllable<HexViewSelection | null>(
    selectionProp,
    null,
    onSelectionChange,
  );

  const [copyFmt, setCopyFmt] = useState<HexViewCopyFormat>(defaultCopyFormat);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [focusedOffset, setFocusedOffset] = useState<number | null>(null);

  // Hover — React 상태로 유지해서 렌더 시 data-hover 속성에 반영한다.
  // 셀 단위 전환은 mouseover delegation 으로만 발생하므로 업데이트 빈도가 낮다.
  const [hoverOffset, setHoverOffset] = useState<number | null>(null);

  const rowMeasureRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);

  const {
    enabled: virtEnabled,
    startIndex,
    endIndex,
    paddingTop,
    paddingBottom,
    viewportRef,
    onScroll,
  } = useHexVirtualList({ itemCount: totalRows, itemHeight: rowHeight });

  useEffect(() => {
    ensureHexViewStyle();
  }, []);

  // 첫 행 높이 실측 (폰트 로드·폭 변경에 대응)
  useLayoutEffect(() => {
    const wrapper = rowMeasureRef.current;
    const first = wrapper?.firstElementChild as HTMLElement | null;
    if (!first) return;
    const h = first.getBoundingClientRect().height;
    if (h > 0 && Math.abs(h - rowHeight) > 0.5) {
      setRowHeight(h);
    }
  }, [rowHeight, theme, bytesPerRow, groupSize, showAscii]);

  // ── 이벤트: pointer 선택 ─────────────────────────────────────────────────

  const dragStartRef = useRef<number | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);

  const byteOffsetFromTarget = useCallback((el: EventTarget | null): number | null => {
    if (!(el instanceof Element)) return null;
    const cell = el.closest<HTMLElement>("[data-byte-offset]");
    if (!cell) return null;
    const raw = cell.dataset.byteOffset;
    if (raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, []);

  const extendTo = useCallback(
    (anchor: number, to: number) => {
      const start = Math.min(anchor, to);
      const end = Math.max(anchor, to) + 1;
      setSelection({ start, end });
    },
    [setSelection],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const off = byteOffsetFromTarget(e.target);
      if (off === null) {
        setSelection(null);
        return;
      }
      if (e.shiftKey && selection) {
        const anchor = selection.start;
        extendTo(anchor, off);
        dragStartRef.current = anchor;
      } else {
        dragStartRef.current = off;
        setSelection({ start: off, end: off + 1 });
      }
      setFocusedOffset(off);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragPointerIdRef.current = e.pointerId;
      } catch {
        // ignore
      }
    },
    [byteOffsetFromTarget, extendTo, selection, setSelection],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const anchor = dragStartRef.current;
      const off = byteOffsetFromTarget(e.target);
      // hover 는 드래그 여부와 무관하게 갱신
      if (off !== hoverOffset) setHoverOffset(off);
      if (anchor === null || off === null) return;
      extendTo(anchor, off);
      setFocusedOffset(off);
    },
    [byteOffsetFromTarget, extendTo, hoverOffset],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragStartRef.current = null;
    const pid = dragPointerIdRef.current;
    if (pid !== null) {
      try {
        e.currentTarget.releasePointerCapture(pid);
      } catch {
        // ignore
      }
      dragPointerIdRef.current = null;
    }
  }, []);

  const onMouseOver = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const off = byteOffsetFromTarget(e.target);
      if (off !== hoverOffset) setHoverOffset(off);
    },
    [byteOffsetFromTarget, hoverOffset],
  );

  const onMouseLeave = useCallback(() => {
    if (hoverOffset !== null) setHoverOffset(null);
  }, [hoverOffset]);

  // ── 복사 ────────────────────────────────────────────────────────────────

  const doCopy = useCallback(
    (fmt: HexViewCopyFormat) => {
      const slice = selection
        ? bytes.slice(selection.start, selection.end)
        : bytes;
      if (slice.length === 0) return;
      const text = formatBytes(slice, fmt);
      void navigator.clipboard.writeText(text).then(() => {
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 1500);
      });
    },
    [bytes, selection],
  );

  const onCopyEvent = useCallback(
    (e: ReactClipboardEvent<HTMLDivElement>) => {
      if (!selection) return;
      e.preventDefault();
      const slice = bytes.slice(selection.start, selection.end);
      e.clipboardData.setData("text/plain", formatBytes(slice, copyFmt));
    },
    [bytes, copyFmt, selection],
  );

  // ── 키보드 ───────────────────────────────────────────────────────────────

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (bytes.length > 0) {
          setSelection({ start: 0, end: bytes.length });
          setFocusedOffset(0);
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        doCopy(copyFmt);
        return;
      }
      const navKeys = [
        "ArrowRight",
        "ArrowLeft",
        "ArrowDown",
        "ArrowUp",
        "Home",
        "End",
        "PageDown",
        "PageUp",
      ];
      if (!navKeys.includes(e.key)) return;
      e.preventDefault();
      if (bytes.length === 0) return;

      const current = focusedOffset ?? 0;
      let next = current;
      switch (e.key) {
        case "ArrowRight":
          next = current + 1;
          break;
        case "ArrowLeft":
          next = current - 1;
          break;
        case "ArrowDown":
          next = current + bytesPerRow;
          break;
        case "ArrowUp":
          next = current - bytesPerRow;
          break;
        case "Home": {
          const row = Math.floor(current / bytesPerRow);
          next = row * bytesPerRow;
          break;
        }
        case "End": {
          const row = Math.floor(current / bytesPerRow);
          next = Math.min((row + 1) * bytesPerRow - 1, bytes.length - 1);
          break;
        }
        case "PageDown":
          next = current + bytesPerRow * 16;
          break;
        case "PageUp":
          next = current - bytesPerRow * 16;
          break;
      }
      next = Math.max(0, Math.min(bytes.length - 1, next));
      setFocusedOffset(next);
      if (e.shiftKey && selection) {
        extendTo(selection.start, next);
      } else if (e.shiftKey && focusedOffset !== null) {
        extendTo(focusedOffset, next);
      } else {
        setSelection({ start: next, end: next + 1 });
      }
    },
    [
      bytes.length,
      bytesPerRow,
      copyFmt,
      doCopy,
      extendTo,
      focusedOffset,
      selection,
      setSelection,
    ],
  );

  // focused byte 를 viewport 에 스크롤 반영
  useEffect(() => {
    if (focusedOffset === null) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const row = Math.floor(focusedOffset / bytesPerRow);
    const rowTop = row * rowHeight;
    const rowBottom = rowTop + rowHeight;
    const vpTop = viewport.scrollTop;
    const vpBottom = vpTop + viewport.clientHeight;
    const headerOff = showOffsetHeader ? rowHeight : 0;
    if (rowTop < vpTop + headerOff) {
      viewport.scrollTop = Math.max(0, rowTop - headerOff);
    } else if (rowBottom > vpBottom) {
      viewport.scrollTop = rowBottom - viewport.clientHeight;
    }
  }, [focusedOffset, bytesPerRow, rowHeight, showOffsetHeader, viewportRef]);

  // ── 스타일 헬퍼 ──────────────────────────────────────────────────────────

  const rangeInfoFor = useCallback(
    (offset: number): { color: string; label: string | undefined } | null => {
      if (!highlightRanges || highlightRanges.length === 0) return null;
      for (let i = highlightRanges.length - 1; i >= 0; i--) {
        const r = highlightRanges[i]!;
        if (offset >= r.start && offset < r.end) {
          return { color: r.color ?? palette.highlightBg, label: r.label };
        }
      }
      return null;
    },
    [highlightRanges, palette.highlightBg],
  );

  function cellStyle(
    offset: number,
    rowIndex: number,
    isNullByte: boolean,
    isHex: boolean,
  ): CSSProperties {
    const inSel =
      selection !== null &&
      offset >= selection.start &&
      offset < selection.end;

    let background: string | undefined;
    const highlight = rangeInfoFor(offset);
    if (showAlternatingRows && rowIndex % 2 === 1) background = palette.alt;
    if (highlight) background = highlight.color;
    if (inSel) background = palette.selectionBg;

    const style: CSSProperties = {};
    if (background) style.backgroundColor = background;
    if (inSel) style.color = palette.selectionFg;
    else if (isHex && isNullByte) style.color = palette.nullByteFg;
    return style;
  }

  // ── 렌더 ────────────────────────────────────────────────────────────────

  const gridCols = [
    showOffsetColumn ? `minmax(${offsetDigits + 1}ch, auto)` : null,
    "auto",
    showAscii ? "auto" : null,
  ]
    .filter(Boolean)
    .join(" ");

  function renderHexCells(
    rowIndex: number,
    rowStartOff: number,
    rowLen: number,
    positions: number[],
    interactive: boolean,
  ): ReactElement {
    return (
      <div style={{ display: "inline-flex" }}>
        {Array.from({ length: groupsPerRow }, (_, gi) => (
          <span
            key={gi}
            style={{
              display: "inline-flex",
              marginRight: gi < groupsPerRow - 1 ? "0.5ch" : 0,
            }}
          >
            {Array.from({ length: groupSize }, (_, bi) => {
              const slot = gi * groupSize + bi;
              const logicalIdx = positions[slot];
              if (logicalIdx === undefined || logicalIdx >= rowLen) {
                return (
                  <span
                    key={bi}
                    style={{
                      display: "inline-block",
                      width: "2ch",
                      textAlign: "center",
                    }}
                    aria-hidden="true"
                  >
                    {"  "}
                  </span>
                );
              }
              const logicalOffset = rowStartOff + logicalIdx;
              const byte = bytes[logicalOffset]!;
              const isNull = byte === 0;
              const rng = rangeInfoFor(logicalOffset);
              const focused = focusedOffset === logicalOffset;
              const isHovered =
                hoverOffset !== null && hoverOffset === logicalOffset;
              return (
                <span
                  key={bi}
                  className="plastic-hv-cell"
                  data-byte-offset={logicalOffset}
                  data-kind="hex"
                  data-focused={interactive && focused ? "1" : ""}
                  data-hover={isHovered ? "1" : ""}
                  title={rng?.label}
                  role="gridcell"
                  style={{
                    display: "inline-block",
                    width: "2ch",
                    textAlign: "center",
                    ...(interactive
                      ? cellStyle(logicalOffset, rowIndex, isNull, true)
                      : {}),
                  }}
                >
                  {hexOf(byte)}
                </span>
              );
            })}
          </span>
        ))}
      </div>
    );
  }

  function renderAsciiCells(
    rowIndex: number,
    rowStartOff: number,
    rowLen: number,
  ): ReactElement {
    return (
      <div
        style={{
          display: "inline-flex",
          color: palette.asciiFg,
          borderLeft: `1px solid ${palette.border}`,
          paddingLeft: "0.75rem",
        }}
      >
        {Array.from({ length: bytesPerRow }, (_, bi) => {
          if (bi >= rowLen) {
            return (
              <span
                key={bi}
                style={{
                  display: "inline-block",
                  width: "1ch",
                  textAlign: "center",
                }}
                aria-hidden="true"
              >
                {" "}
              </span>
            );
          }
          const logicalOffset = rowStartOff + bi;
          const byte = bytes[logicalOffset]!;
          const focused = focusedOffset === logicalOffset;
          const rng = rangeInfoFor(logicalOffset);
          const isHovered =
            hoverOffset !== null &&
            hoverOffset === logicalOffset &&
            linkHover;
          return (
            <span
              key={bi}
              className="plastic-hv-cell"
              data-byte-offset={logicalOffset}
              data-kind="ascii"
              data-focused={focused ? "1" : ""}
              data-hover={isHovered ? "1" : ""}
              title={rng?.label}
              role="gridcell"
              style={{
                display: "inline-block",
                width: "1ch",
                textAlign: "center",
                ...cellStyle(logicalOffset, rowIndex, byte === 0, false),
              }}
            >
              {renderAsciiChar(byte, nonPrintable)}
            </span>
          );
        })}
      </div>
    );
  }

  function renderRow(rowIndex: number): ReactElement {
    const rowStartOff = rowIndex * bytesPerRow;
    const rowLen = Math.min(bytesPerRow, bytes.length - rowStartOff);
    const positions = renderOrderForRow(rowLen, groupSize, endian);
    return (
      <div
        key={rowIndex}
        role="row"
        aria-rowindex={rowIndex + 1 + (showOffsetHeader ? 1 : 0)}
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          columnGap: "1.25rem",
          height: rowHeight || "auto",
          alignItems: "center",
          padding: "0 0.75rem",
          whiteSpace: "nowrap",
        }}
      >
        {showOffsetColumn && (
          <span
            style={{
              color: palette.offsetFg,
              userSelect: "none",
              textAlign: "right",
              paddingRight: "0.25rem",
            }}
            aria-hidden="true"
          >
            {formatOffset(baseOffset + rowStartOff, offsetDigits)}
          </span>
        )}
        {renderHexCells(rowIndex, rowStartOff, rowLen, positions, true)}
        {showAscii && renderAsciiCells(rowIndex, rowStartOff, rowLen)}
      </div>
    );
  }

  function renderHeader(): ReactElement {
    const positions = renderOrderForRow(bytesPerRow, groupSize, endian);
    return (
      <div
        role="row"
        aria-rowindex={1}
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          columnGap: "1.25rem",
          height: rowHeight || "auto",
          alignItems: "center",
          padding: "0 0.75rem",
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: palette.headerBg,
          borderBottom: `1px solid ${palette.border}`,
          color: palette.offsetFg,
          fontSize: "0.85em",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
        aria-hidden="true"
      >
        {showOffsetColumn && <span />}
        <div style={{ display: "inline-flex" }}>
          {Array.from({ length: groupsPerRow }, (_, gi) => (
            <span
              key={gi}
              style={{
                display: "inline-flex",
                marginRight: gi < groupsPerRow - 1 ? "0.5ch" : 0,
              }}
            >
              {Array.from({ length: groupSize }, (_, bi) => {
                const slot = gi * groupSize + bi;
                const i = positions[slot]!;
                return (
                  <span
                    key={bi}
                    style={{
                      display: "inline-block",
                      width: "2ch",
                      textAlign: "center",
                    }}
                  >
                    {hexOf(i)}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
        {showAscii && (
          <div
            style={{
              display: "inline-flex",
              paddingLeft: "0.75rem",
              borderLeft: `1px solid ${palette.border}`,
              letterSpacing: "0.05em",
            }}
          >
            ASCII
          </div>
        )}
      </div>
    );
  }

  const rowStart = virtEnabled ? startIndex : 0;
  const rowEnd = virtEnabled ? endIndex : totalRows;
  const visibleRows: ReactElement[] = [];
  for (let r = rowStart; r < rowEnd; r++) visibleRows.push(renderRow(r));

  const seg = (fmt: HexViewCopyFormat, label: string): ReactElement => {
    const active = copyFmt === fmt;
    return (
      <button
        key={fmt}
        onClick={() => setCopyFmt(fmt)}
        type="button"
        title={`복사 포맷: ${label}`}
        style={{
          padding: "0.15rem 0.45rem",
          borderRadius: "0.25rem",
          border: "none",
          cursor: "pointer",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontSize: "0.7rem",
          fontWeight: 600,
          background: active ? palette.copyBtnActiveBg : palette.copyBtnBg,
          color: active ? palette.copyBtnActiveFg : palette.copyBtnFg,
          userSelect: "none",
        }}
      >
        {label}
      </button>
    );
  };

  const rootStyle: CSSProperties = {
    position: "relative",
    borderRadius: "0.5rem",
    background: palette.bg,
    color: palette.fg,
    fontFamily: FONT_STACK,
    fontSize: "0.875rem",
    lineHeight: 1.5,
    fontVariantLigatures: "none",
    fontVariantNumeric: "tabular-nums",
    border: `1px solid ${palette.border}`,
    ["--plastic-hv-hover" as string]: palette.hoverBg,
    ["--plastic-hv-focus" as string]: palette.focusOutline,
  };

  return (
    <div className={className} style={rootStyle}>
      {showCopyButton && (
        <div
          style={{
            position: "absolute",
            top: "0.35rem",
            right: "0.35rem",
            zIndex: 10,
            display: "flex",
            gap: "0.25rem",
            alignItems: "center",
          }}
        >
          {seg("hex", "HEX")}
          {seg("ascii", "ASC")}
          {seg("c-array", "C")}
          <button
            onClick={() => doCopy(copyFmt)}
            type="button"
            aria-label={selection ? "선택 복사" : "전체 복사"}
            style={{
              padding: "0.15rem 0.55rem",
              borderRadius: "0.25rem",
              border: "none",
              cursor: "pointer",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              fontSize: "0.7rem",
              fontWeight: 600,
              background: palette.copyBtnBg,
              color: palette.copyBtnFg,
              userSelect: "none",
            }}
          >
            {copyState === "copied" ? "✓ 복사됨" : "복사"}
          </button>
        </div>
      )}
      <div
        ref={viewportRef}
        role="grid"
        aria-rowcount={totalRows + (showOffsetHeader ? 1 : 0)}
        aria-label="Hex viewer"
        tabIndex={0}
        style={{
          maxHeight,
          overflow: "auto",
          outline: "none",
          userSelect: "none",
        }}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onCopy={onCopyEvent}
        onKeyDown={onKeyDown}
      >
        {showOffsetHeader && renderHeader()}
        {virtEnabled && paddingTop > 0 && (
          <div style={{ height: paddingTop }} aria-hidden="true" />
        )}
        <div ref={rowMeasureRef}>{visibleRows}</div>
        {virtEnabled && paddingBottom > 0 && (
          <div style={{ height: paddingBottom }} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
