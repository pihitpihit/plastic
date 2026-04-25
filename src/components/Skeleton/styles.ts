const STYLE_ID = "plastic-skeleton-styles";

const CSS_TEXT = `
.sk-root {
  position: relative;
  display: inline-block;
  background-color: var(--sk-bg);
  overflow: hidden;
  isolation: isolate;
  line-height: 1;
  vertical-align: middle;
}
.sk-root[data-shape="text"] { display: block; }
.sk-shimmer {
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent 0%, var(--sk-shine) 50%, transparent 100%);
  animation: sk-shimmer 1500ms linear infinite;
  will-change: transform;
  pointer-events: none;
}
@keyframes sk-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.sk-root--pulse { animation: sk-pulse 1500ms ease-in-out infinite; }
.sk-root--pulse > .sk-shimmer { display: none; }
@keyframes sk-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
.sk-root--none > .sk-shimmer { display: none; }
.sk-root--none { animation: none; }
.sk-content-fadein { animation: sk-fadein 180ms ease-out both; }
@keyframes sk-fadein { from { opacity: 0 } to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) {
  .sk-root, .sk-root--pulse { animation: none !important; }
  .sk-shimmer { display: none !important; animation: none !important; }
  .sk-content-fadein { animation: none !important; }
}
`;

export function ensureSkeletonStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = CSS_TEXT;
  document.head.appendChild(el);
}
