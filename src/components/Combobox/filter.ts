import { fuzzyMatchOptimized } from "../CommandPalette/fuzzyMatch";
import type {
  ComboboxOption,
  ComboboxMatchResult,
} from "./Combobox.types";

const LABEL_WEIGHT = 2.0;
const KEYWORDS_WEIGHT = 0.8;

export function scoreOption(
  query: string,
  option: ComboboxOption,
): ComboboxMatchResult | null {
  if (option.disabled) return null;
  if (query.trim() === "") {
    return { option, score: 0, labelMatches: [] };
  }

  let bestScore = -Infinity;
  let labelMatches: number[] = [];
  let matched = false;

  const labelResult = fuzzyMatchOptimized(query, option.label);
  if (labelResult !== null) {
    matched = true;
    const weighted = labelResult[0] * LABEL_WEIGHT;
    if (weighted > bestScore) {
      bestScore = weighted;
      labelMatches = labelResult[1];
    }
  }

  if (option.keywords !== undefined) {
    for (const kw of option.keywords) {
      const kwResult = fuzzyMatchOptimized(query, kw);
      if (kwResult !== null) {
        matched = true;
        const weighted = kwResult[0] * KEYWORDS_WEIGHT;
        if (weighted > bestScore) {
          bestScore = weighted;
        }
      }
    }
  }

  if (!matched) return null;
  return { option, score: bestScore, labelMatches };
}

export function filterOptions(
  query: string,
  options: ComboboxOption[],
  maxResults = 50,
): ComboboxMatchResult[] {
  const out: ComboboxMatchResult[] = [];

  if (query.trim() === "") {
    for (const option of options) {
      if (option.disabled) continue;
      out.push({ option, score: 0, labelMatches: [] });
      if (out.length >= maxResults) break;
    }
    return out;
  }

  for (const option of options) {
    const r = scoreOption(query, option);
    if (r !== null) out.push(r);
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, maxResults);
}
