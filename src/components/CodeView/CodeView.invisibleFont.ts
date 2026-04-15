/**
 * PlasticMono 번들 폰트 런타임 로더.
 *
 * `invisibleFontStrategy: "bundled"` 일 때만 호출되며, 첫 호출 시 @font-face
 * 를 단 한 번 주입하고 `document.fonts.load()` 로 실제 로드 완료를 대기한다.
 * 이후 호출은 동일 Promise 를 재사용.
 */
import { PLASTIC_MONO_WOFF2_BASE64, PLASTIC_MONO_VERSION } from "./assets/plastic-mono.woff2-base64";

// 버전을 family 이름에 포함시켜 폰트 데이터가 바뀌면 완전히 새 family 로
// 인식되게 한다. 이렇게 하지 않으면 HMR / 브라우저 폰트 캐시가 같은 이름
// 아래 이전 버전의 폰트를 계속 사용해 변경이 반영되지 않는다.
export const PLASTIC_MONO_FAMILY = `PlasticMono-${PLASTIC_MONO_VERSION}`;
const STYLE_ID_PREFIX = "plastic-cv-font-";
const STYLE_ID = `${STYLE_ID_PREFIX}${PLASTIC_MONO_VERSION}`;

let loadPromise: Promise<void> | null = null;

export function ensurePlasticMono(): Promise<void> {
  if (loadPromise) return loadPromise;
  if (typeof document === "undefined") {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  // 과거 버전의 style element 를 제거 (HMR 후에도 깨끗한 상태 유지).
  document.querySelectorAll(`style[id^="${STYLE_ID_PREFIX}"]`).forEach((el) => {
    if (el.id !== STYLE_ID) el.remove();
  });

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      `@font-face {` +
      `font-family: "${PLASTIC_MONO_FAMILY}";` +
      `font-style: normal; font-weight: 400; font-display: block;` +
      `src: url("data:font/woff2;base64,${PLASTIC_MONO_WOFF2_BASE64}") format("woff2");` +
      `}`;
    document.head.appendChild(style);
  }

  const d = document as Document & { fonts?: FontFaceSet };
  if (d.fonts && typeof d.fonts.load === "function") {
    loadPromise = d.fonts.load(`16px "${PLASTIC_MONO_FAMILY}"`).then(() => undefined);
  } else {
    loadPromise = Promise.resolve();
  }
  return loadPromise;
}

export const PLASTIC_MONO_STACK = `"${PLASTIC_MONO_FAMILY}", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`;

export { C0_TO_PUA, PUA_TO_C0, C0_REGEX, PUA_REGEX } from "./assets/plastic-mono.pua-map";

import { C0_TO_PUA as _C0, PUA_TO_C0 as _PUA } from "./assets/plastic-mono.pua-map";
/** 원 제어 문자열 → PlasticMono 의 PUA alias 로 치환. non-bundled 에서는 호출 금지. */
export function toPuaDisplay(s: string): string {
  // 핫 패스: 제어 문자가 없을 가능성이 높으므로 빠른 테스트 후 치환.
  let out = "";
  for (const ch of s) {
    const pua = _C0[ch];
    out += pua ?? ch;
  }
  return out;
}
/** PUA alias → 원 제어 문자 역치환. */
export function fromPuaDisplay(s: string): string {
  let out = "";
  for (const ch of s) {
    const c0 = _PUA[ch];
    out += c0 ?? ch;
  }
  return out;
}
