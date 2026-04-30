const STYLE_ID = "plastic-chat-bubble-styles";

const CSS = `
@keyframes plastic-cb-blink {
  0%, 80%, 100% { opacity: 0.2; }
  40% { opacity: 1; }
}
[data-plastic-chat-bubble] [data-show-on-hover="true"] {
  opacity: 0;
  transition: opacity 120ms ease-out;
}
[data-plastic-chat-bubble]:hover [data-show-on-hover="true"],
[data-plastic-chat-bubble]:focus-within [data-show-on-hover="true"] {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  [data-plastic-chat-bubble] [data-show-on-hover="true"] {
    transition: none;
  }
}
`;

let injected = false;

export function ensureChatBubbleStyles(): void {
  if (injected) return;
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.setAttribute("data-plastic-chat-bubble-style", "injected");
  el.textContent = CSS;
  document.head.appendChild(el);
  injected = true;
}
