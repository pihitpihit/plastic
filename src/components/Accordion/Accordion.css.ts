export const ACCORDION_CSS = `
.acc-root {
  background: var(--acc-root-bg);
  border-top: 1px solid var(--acc-item-border);
  border-bottom: 1px solid var(--acc-item-border);
}
.acc-item {
  background: var(--acc-item-bg);
  border-bottom: 1px solid var(--acc-item-border);
}
.acc-item:last-child {
  border-bottom: none;
}
.acc-header {
  margin: 0;
  padding: 0;
  font: inherit;
  font-weight: 500;
}
.acc-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: var(--acc-header-bg);
  color: var(--acc-trigger-fg);
  border: 0;
  outline: none;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background 120ms ease;
  touch-action: manipulation;
}
.acc-trigger:hover:not([disabled]) {
  background: var(--acc-header-bg-hover);
}
.acc-trigger[data-state="open"]:not([disabled]) {
  background: var(--acc-header-bg-active);
}
.acc-trigger:focus-visible {
  box-shadow: inset 0 0 0 2px var(--acc-focus-ring);
}
.acc-trigger[disabled],
.acc-trigger[aria-disabled="true"] {
  color: var(--acc-trigger-fg-disabled);
  cursor: not-allowed;
}
.acc-trigger-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.acc-chevron {
  flex-shrink: 0;
  color: var(--acc-chevron-fg);
  transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
.acc-trigger[data-state="open"] .acc-chevron {
  transform: rotate(180deg);
}
.acc-content {
  overflow: hidden;
  background: var(--acc-content-bg);
  color: var(--acc-content-fg);
  contain: layout paint;
}
.acc-content-inner {
  padding: 12px 16px 16px;
}
@media (prefers-reduced-motion: reduce) {
  .acc-chevron,
  .acc-content {
    transition: none !important;
  }
}
`;

let injected = false;

export function injectAccordionStyles(): void {
  if (injected) return;
  if (typeof document === "undefined") return;
  const styleId = "plastic-accordion-styles";
  if (document.getElementById(styleId)) {
    injected = true;
    return;
  }
  const styleEl = document.createElement("style");
  styleEl.id = styleId;
  styleEl.textContent = ACCORDION_CSS;
  document.head.appendChild(styleEl);
  injected = true;
}
