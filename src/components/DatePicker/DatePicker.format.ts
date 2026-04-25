import type { CalendarDate, ParseMode } from "./DatePicker.types";
import { isValidCalendarDate } from "./DatePicker.dateMath";

export function formatCalendarDate(c: CalendarDate, format: string): string {
  const yyyy = String(c.year).padStart(4, "0");
  const yy = String(c.year % 100).padStart(2, "0");
  const MM = String(c.month).padStart(2, "0");
  const M = String(c.month);
  const dd = String(c.day).padStart(2, "0");
  const d = String(c.day);
  const tokens: Array<[string, string]> = [
    ["yyyy", yyyy],
    ["yy", yy],
    ["MM", MM],
    ["M", M],
    ["dd", dd],
    ["d", d],
  ];
  let out = "";
  let i = 0;
  while (i < format.length) {
    let matched = false;
    for (const [tok, val] of tokens) {
      if (format.startsWith(tok, i)) {
        out += val;
        i += tok.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += format[i];
      i++;
    }
  }
  return out;
}

function extractTokenOrder(format: string): Array<"y" | "M" | "d"> {
  const order: Array<"y" | "M" | "d"> = [];
  let i = 0;
  while (i < format.length) {
    if (format.startsWith("yyyy", i)) {
      order.push("y");
      i += 4;
    } else if (format.startsWith("yy", i)) {
      order.push("y");
      i += 2;
    } else if (format.startsWith("MM", i)) {
      order.push("M");
      i += 2;
    } else if (format.startsWith("M", i)) {
      order.push("M");
      i += 1;
    } else if (format.startsWith("dd", i)) {
      order.push("d");
      i += 2;
    } else if (format.startsWith("d", i)) {
      order.push("d");
      i += 1;
    } else {
      i++;
    }
  }
  return order;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileFormatRegex(format: string): {
  re: RegExp;
  order: Array<"y" | "M" | "d">;
} {
  const order: Array<"y" | "M" | "d"> = [];
  let pattern = "^";
  let i = 0;
  while (i < format.length) {
    if (format.startsWith("yyyy", i)) {
      order.push("y");
      pattern += "(\\d{4})";
      i += 4;
    } else if (format.startsWith("yy", i)) {
      order.push("y");
      pattern += "(\\d{2})";
      i += 2;
    } else if (format.startsWith("MM", i)) {
      order.push("M");
      pattern += "(\\d{2})";
      i += 2;
    } else if (format.startsWith("M", i)) {
      order.push("M");
      pattern += "(\\d{1,2})";
      i += 1;
    } else if (format.startsWith("dd", i)) {
      order.push("d");
      pattern += "(\\d{2})";
      i += 2;
    } else if (format.startsWith("d", i)) {
      order.push("d");
      pattern += "(\\d{1,2})";
      i += 1;
    } else {
      pattern += escapeRegex(format[i] ?? "");
      i++;
    }
  }
  pattern += "$";
  return { re: new RegExp(pattern), order };
}

function expandTwoDigitYear(y: number): number {
  if (y >= 100) return y;
  return y >= 70 ? 1900 + y : 2000 + y;
}

function assemble(
  order: Array<"y" | "M" | "d">,
  nums: number[],
): CalendarDate | null {
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  for (let i = 0; i < order.length; i++) {
    const kind = order[i];
    const n = nums[i];
    if (kind === undefined || n === undefined) continue;
    if (kind === "y") year = expandTwoDigitYear(n);
    else if (kind === "M") month = n;
    else if (kind === "d") day = n;
  }
  if (year == null || month == null || day == null) return null;
  const cd: CalendarDate = { year, month, day };
  if (!isValidCalendarDate(cd)) return null;
  return cd;
}

export function parseRaw(
  raw: string,
  format: string,
  mode: ParseMode,
): CalendarDate | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  if (mode === "strict") {
    const { re, order } = compileFormatRegex(format);
    const m = re.exec(trimmed);
    if (!m) return null;
    const nums: number[] = [];
    for (let i = 1; i < m.length; i++) {
      const g = m[i];
      if (g === undefined) return null;
      const n = Number(g);
      if (!Number.isFinite(n)) return null;
      nums.push(n);
    }
    return assemble(order, nums);
  }

  const order = extractTokenOrder(format);
  const parts = trimmed.split(/[^\d]+/).filter(Boolean);

  if (parts.length === 3) {
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => !Number.isFinite(n))) return null;
    return assemble(order, nums);
  }

  if (parts.length === 1 && parts[0] !== undefined && parts[0].length === 8) {
    const s = parts[0];
    const nums = [
      Number(s.slice(0, 4)),
      Number(s.slice(4, 6)),
      Number(s.slice(6, 8)),
    ];
    if (nums.some((n) => !Number.isFinite(n))) return null;
    return assemble(["y", "M", "d"], nums);
  }

  return null;
}
