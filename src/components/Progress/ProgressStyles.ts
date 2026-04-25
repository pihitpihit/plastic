const STYLE_ID = "plastic-progress-styles";

const CSS = `
.plastic-progress {
  position: relative;
  width: 100%;
  color: var(--plastic-progress-label-fg);
  font-family: inherit;
}
.plastic-progress--linear {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.plastic-progress__track {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: var(--plastic-progress-size-linear, 8px);
  background: var(--plastic-progress-track);
  border-radius: 9999px;
}
.plastic-progress__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  transform-origin: left center;
  transform: scaleX(0);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: inherit;
}
.plastic-progress__fill--primary {
  background: var(--plastic-progress-fill);
  z-index: 2;
}
.plastic-progress__fill--buffer {
  background: var(--plastic-progress-buffer);
  z-index: 1;
}
.plastic-progress[data-mode="indeterminate"] .plastic-progress__fill--primary {
  transform: none;
  transition: none;
  width: 40%;
  animation: plastic-progress-linear-indeterminate 1.6s ease-in-out infinite;
}
.plastic-progress[data-mode="indeterminate"] .plastic-progress__fill--buffer {
  display: none;
}
.plastic-progress__track--segmented {
  display: flex;
  gap: 4px;
  background: transparent;
  overflow: visible;
  border-radius: 0;
}
.plastic-progress__seg {
  flex: 1 1 0;
  height: 100%;
  background: var(--plastic-progress-track-segmented);
  border-radius: 2px;
  transition: background 160ms ease;
}
.plastic-progress__seg[data-filled="true"] {
  background: var(--plastic-progress-fill);
}
.plastic-progress__label {
  font-size: var(--plastic-progress-label-font, 12px);
  color: var(--plastic-progress-label-fg);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plastic-progress__label--outside {
  display: block;
}
.plastic-progress__label--inside {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--plastic-progress-value-fg-inside);
  font-weight: 600;
  z-index: 3;
  pointer-events: none;
}
.plastic-progress__value-text {
  font-size: var(--plastic-progress-label-font, 12px);
  color: var(--plastic-progress-value-fg-outside);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.plastic-progress__value-text--outside {
  align-self: flex-end;
}
.plastic-progress__value-text--inside {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--plastic-progress-value-fg-inside);
  font-weight: 600;
  z-index: 3;
  pointer-events: none;
}
.plastic-progress[data-striped="true"] .plastic-progress__fill--primary {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.2) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.2) 75%,
    transparent 75%
  );
  background-size: 16px 16px;
}
.plastic-progress[data-striped="true"][data-animated="true"] .plastic-progress__fill--primary {
  animation: plastic-progress-stripes 1s linear infinite;
}
.plastic-progress[data-mode="indeterminate"][data-striped="true"] .plastic-progress__fill--primary {
  animation:
    plastic-progress-linear-indeterminate 1.6s ease-in-out infinite,
    plastic-progress-stripes 1s linear infinite;
}
.plastic-progress--circular {
  display: inline-flex;
  position: relative;
  width: var(--plastic-progress-size-circular, 40px);
  height: var(--plastic-progress-size-circular, 40px);
  vertical-align: middle;
}
.plastic-progress__svg {
  width: 100%;
  height: 100%;
  display: block;
}
.plastic-progress__circle--track {
  stroke: var(--plastic-progress-track);
  opacity: var(--plastic-progress-track-opacity, 1);
}
.plastic-progress__circle--indicator {
  stroke: var(--plastic-progress-fill);
  transition: stroke-dashoffset 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.plastic-progress--circular[data-mode="indeterminate"] .plastic-progress__svg {
  animation: plastic-progress-circular-rotate 1.4s linear infinite;
}
.plastic-progress--circular[data-mode="indeterminate"] .plastic-progress__circle--indicator {
  stroke-dasharray: 80, 200;
  stroke-dashoffset: 0;
  transition: none;
  animation: plastic-progress-circular-dash 1.4s ease-in-out infinite;
}
.plastic-progress__center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--plastic-progress-label-font, 12px);
  color: var(--plastic-progress-value-fg-outside);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
@keyframes plastic-progress-linear-indeterminate {
  0% {
    left: -40%;
    right: 100%;
  }
  60% {
    left: 100%;
    right: -40%;
  }
  100% {
    left: 100%;
    right: -40%;
  }
}
@keyframes plastic-progress-circular-rotate {
  100% {
    transform: rotate(360deg);
  }
}
@keyframes plastic-progress-circular-dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 100, 200;
    stroke-dashoffset: -15;
  }
  100% {
    stroke-dasharray: 100, 200;
    stroke-dashoffset: -125;
  }
}
@keyframes plastic-progress-stripes {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 16px 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .plastic-progress__fill--primary,
  .plastic-progress__circle--indicator {
    transition: none;
  }
  .plastic-progress[data-mode="indeterminate"] .plastic-progress__fill--primary,
  .plastic-progress--circular[data-mode="indeterminate"] .plastic-progress__svg,
  .plastic-progress--circular[data-mode="indeterminate"] .plastic-progress__circle--indicator,
  .plastic-progress[data-striped="true"][data-animated="true"] .plastic-progress__fill--primary {
    animation: none !important;
  }
}
`;

let injected = false;

export function ensureProgressStyles(): void {
  if (injected) return;
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) {
    injected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.setAttribute("data-plastic-progress", "injected");
  el.textContent = CSS;
  document.head.appendChild(el);
  injected = true;
}
