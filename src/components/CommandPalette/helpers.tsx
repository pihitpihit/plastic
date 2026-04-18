import { Fragment, type ReactNode } from "react";

export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

const MAC_KEY_MAP: Record<string, string> = {
  mod: "⌘",
  cmd: "⌘",
  meta: "⌘",
  ctrl: "⌃",
  control: "⌃",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  enter: "↵",
  return: "↵",
  escape: "esc",
  esc: "esc",
  backspace: "⌫",
  delete: "⌦",
  tab: "⇥",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  space: "␣",
};

const WIN_KEY_MAP: Record<string, string> = {
  mod: "Ctrl",
  cmd: "Win",
  meta: "Win",
  ctrl: "Ctrl",
  control: "Ctrl",
  alt: "Alt",
  option: "Alt",
  shift: "Shift",
  enter: "Enter",
  return: "Enter",
  escape: "Esc",
  esc: "Esc",
  backspace: "Backspace",
  delete: "Delete",
  tab: "Tab",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  space: "Space",
};

export function formatShortcutKey(key: string, mac = isMac()): string {
  const lower = key.toLowerCase();
  const map = mac ? MAC_KEY_MAP : WIN_KEY_MAP;
  return map[lower] ?? key.toUpperCase();
}

export function formatShortcut(keys: string[], mac = isMac()): string {
  return keys.map((k) => formatShortcutKey(k, mac)).join(mac ? "" : "+");
}

export function isModifierKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower === "mod" ||
    lower === "cmd" ||
    lower === "meta" ||
    lower === "ctrl" ||
    lower === "control" ||
    lower === "alt" ||
    lower === "option" ||
    lower === "shift"
  );
}

export interface ResolvedModifiers {
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  mainKey: string | null;
}

export function resolveModifiers(
  keys: string[],
  mac = isMac(),
): ResolvedModifiers {
  const result: ResolvedModifiers = {
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    mainKey: null,
  };
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (lower === "mod") {
      if (mac) result.meta = true;
      else result.ctrl = true;
    } else if (lower === "cmd" || lower === "meta") {
      result.meta = true;
    } else if (lower === "ctrl" || lower === "control") {
      result.ctrl = true;
    } else if (lower === "alt" || lower === "option") {
      result.alt = true;
    } else if (lower === "shift") {
      result.shift = true;
    } else {
      result.mainKey = lower;
    }
  }
  return result;
}

export function matchesShortcut(
  e: KeyboardEvent,
  keys: string[],
  mac = isMac(),
): boolean {
  const mods = resolveModifiers(keys, mac);
  if (mods.mainKey === null) return false;
  if (e.metaKey !== mods.meta) return false;
  if (e.ctrlKey !== mods.ctrl) return false;
  if (e.altKey !== mods.alt) return false;
  if (e.shiftKey !== mods.shift) return false;
  return e.key.toLowerCase() === mods.mainKey;
}

export function getNextActiveIndex(
  current: number,
  delta: number,
  total: number,
  wrap = true,
): number {
  if (total === 0) return -1;
  const next = current + delta;
  if (next >= 0 && next < total) return next;
  if (!wrap) return current;
  return ((next % total) + total) % total;
}

export function renderHighlightedText(
  text: string,
  indices: number[],
): ReactNode {
  if (indices.length === 0) return text;

  const sorted = [...indices].sort((a, b) => a - b);
  const parts: ReactNode[] = [];
  let lastEnd = 0;
  let i = 0;

  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) {
      j++;
    }
    const start = sorted[i]!;
    const end = sorted[j]! + 1;

    if (start > lastEnd) {
      parts.push(
        <Fragment key={`t-${lastEnd}`}>{text.slice(lastEnd, start)}</Fragment>,
      );
    }
    parts.push(
      <mark
        key={`m-${start}`}
        style={{
          background: "transparent",
          color: "inherit",
          fontWeight: 600,
          textDecoration: "underline",
          textDecorationColor: "currentColor",
          textDecorationThickness: "1px",
          textUnderlineOffset: "2px",
        }}
      >
        {text.slice(start, end)}
      </mark>,
    );
    lastEnd = end;
    i = j + 1;
  }

  if (lastEnd < text.length) {
    parts.push(
      <Fragment key={`t-end`}>{text.slice(lastEnd)}</Fragment>,
    );
  }

  return parts;
}
