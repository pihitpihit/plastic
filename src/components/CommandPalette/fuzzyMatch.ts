export const SCORE = {
  SEQUENTIAL: 15,
  SEPARATOR_BONUS: 10,
  CAMEL_BONUS: 10,
  FIRST_LETTER_BONUS: 8,
  MATCH: 1,
  GAP_PENALTY: -1,
  LEADING_GAP_PENALTY: -3,
  LABEL_WEIGHT: 2.0,
  DESCRIPTION_WEIGHT: 1.0,
  KEYWORDS_WEIGHT: 0.8,
} as const;

function isSeparator(ch: string): boolean {
  return (
    ch === " " ||
    ch === "-" ||
    ch === "_" ||
    ch === "/" ||
    ch === "." ||
    ch === ":"
  );
}

function isCamelBoundary(target: string, idx: number): boolean {
  if (idx === 0) return false;
  const prev = target[idx - 1]!;
  const cur = target[idx]!;
  return (
    prev === prev.toLowerCase() &&
    cur === cur.toUpperCase() &&
    cur !== cur.toLowerCase()
  );
}

export function fuzzyMatchOptimized(
  query: string,
  target: string,
): [number, number[]] | null {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  const qLen = queryLower.length;
  const tLen = targetLower.length;

  if (qLen === 0) return [0, []];
  if (qLen > tLen) return null;

  const forwardMatches: number[] = [];
  let qi = 0;
  for (let ti = 0; ti < tLen && qi < qLen; ti++) {
    if (queryLower[qi] === targetLower[ti]) {
      forwardMatches.push(ti);
      qi++;
    }
  }
  if (qi !== qLen) return null;

  const matches: number[] = new Array(qLen);
  matches[qLen - 1] = forwardMatches[qLen - 1]!;

  for (let idx = qLen - 2; idx >= 0; idx--) {
    const upperBound = matches[idx + 1]! - 1;
    const lowerBound = forwardMatches[idx]!;
    let bestPos = lowerBound;
    for (let j = upperBound; j >= lowerBound; j--) {
      if (queryLower[idx] === targetLower[j]) {
        bestPos = j;
        if (j + 1 === matches[idx + 1]) break;
      }
    }
    matches[idx] = bestPos;
  }

  let score = 0;
  for (let i = 0; i < qLen; i++) {
    const idx = matches[i]!;
    score += SCORE.MATCH;

    if (i > 0 && idx === matches[i - 1]! + 1) {
      score += SCORE.SEQUENTIAL;
    }

    if (idx === 0) {
      score += SCORE.FIRST_LETTER_BONUS;
    } else {
      const prev = target[idx - 1]!;
      if (isSeparator(prev)) {
        score += SCORE.SEPARATOR_BONUS;
      } else if (isCamelBoundary(target, idx)) {
        score += SCORE.CAMEL_BONUS;
      }
    }

    const prevEnd = i === 0 ? 0 : matches[i - 1]! + 1;
    const gap = idx - prevEnd;
    if (gap > 0) {
      score += gap * (i === 0 ? SCORE.LEADING_GAP_PENALTY : SCORE.GAP_PENALTY);
    }
  }

  return [score, matches];
}
