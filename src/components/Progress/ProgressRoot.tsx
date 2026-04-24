import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useControllable } from "../_shared/useControllable";
import { ProgressContext, type ProgressContextValue } from "./ProgressContext";
import { progressPalette } from "./theme";
import { ensureProgressStyles } from "./ProgressStyles";
import {
  clampBuffer,
  clampValue,
  resolveMode,
  resolveSegments,
  sanitizeMax,
  sizeToCircularDiameter,
  sizeToLabelFont,
  sizeToLinearHeight,
  sizeToStrokeWidth,
  toPercent,
} from "./Progress.utils";
import type {
  ProgressLabelPlacement,
  ProgressRootProps,
  ProgressShape,
  ProgressSize,
  ProgressStrokeLinecap,
  ProgressTheme,
  ProgressVariant,
} from "./Progress.types";

function defaultFormatLabel(value: number, max: number): ReactNode {
  return `${Math.round((value / max) * 100)}%`;
}

export function ProgressRoot(props: ProgressRootProps) {
  const {
    children,
    value: controlledValue,
    defaultValue,
    max: rawMax,
    indeterminate,
    shape = "linear" as ProgressShape,
    size = "md" as ProgressSize,
    variant = "default" as ProgressVariant,
    theme = "light" as ProgressTheme,
    segments: rawSegments,
    buffer: rawBuffer,
    striped = false,
    animated = false,
    labelPlacement = "none" as ProgressLabelPlacement,
    formatLabel,
    strokeWidth: rawStrokeWidth,
    strokeLinecap = "round" as ProgressStrokeLinecap,
    trackOpacity = 1,
    announce = false,
    className,
    style,
  } = props;

  const ariaLabel = props["aria-label"];
  const ariaLabelledBy = props["aria-labelledby"];

  const [rawValue] = useControllable<number | undefined>(
    controlledValue,
    defaultValue,
    undefined,
  );

  const max = sanitizeMax(rawMax);
  const clamped = clampValue(rawValue, max);
  const mode = resolveMode(rawValue, indeterminate);

  let bufferClamped = clampBuffer(rawBuffer, max);
  let segments = resolveSegments(rawSegments, clamped);

  const warnedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    ensureProgressStyles();
  }, []);

  const warnOnce = (key: string, msg: string) => {
    if (warnedRef.current.has(key)) return;
    warnedRef.current.add(key);
    console.warn(msg);
  };

  if (shape === "circular") {
    if (bufferClamped !== null) {
      warnOnce("circ-buffer", "[Progress] buffer is not supported in circular shape (v1). Ignored.");
      bufferClamped = null;
    }
    if (segments !== null) {
      warnOnce("circ-segments", "[Progress] segments is not supported in circular shape. Ignored.");
      segments = null;
    }
  } else {
    if (segments !== null && bufferClamped !== null) {
      warnOnce("seg-buffer", "[Progress] segments + buffer is invalid. buffer ignored.");
      bufferClamped = null;
    }
    if (segments !== null && indeterminate === true) {
      warnOnce("seg-indet", "[Progress] segments + indeterminate is invalid. indeterminate ignored.");
    }
    if (bufferClamped !== null && mode === "indeterminate") {
      warnOnce("indet-buffer", "[Progress] buffer + indeterminate is invalid. buffer ignored.");
      bufferClamped = null;
    }
  }

  const effectiveMode: "determinate" | "indeterminate" =
    segments !== null ? "determinate" : mode;

  if (!ariaLabel && !ariaLabelledBy) {
    warnOnce(
      "aria-label",
      "[Progress] aria-label or aria-labelledby is recommended for screen readers.",
    );
  }

  const percent = toPercent(clamped, max);
  const bufferPercent = toPercent(bufferClamped, max);

  const strokeWidth = rawStrokeWidth ?? sizeToStrokeWidth(size);

  const paletteTheme = progressPalette[theme];
  const variantPal = paletteTheme.variants[variant];

  const rootStyle: CSSProperties = {
    "--plastic-progress-track": paletteTheme.track,
    "--plastic-progress-track-segmented": paletteTheme.trackSegmented,
    "--plastic-progress-fill": variantPal.fill,
    "--plastic-progress-buffer": variantPal.buffer,
    "--plastic-progress-label-fg": paletteTheme.labelFg,
    "--plastic-progress-value-fg-inside": paletteTheme.valueTextFg,
    "--plastic-progress-value-fg-outside": paletteTheme.valueTextFgOut,
    "--plastic-progress-size-linear": `${sizeToLinearHeight(size)}px`,
    "--plastic-progress-size-circular": `${sizeToCircularDiameter(size)}px`,
    "--plastic-progress-stroke-width": String(strokeWidth),
    "--plastic-progress-label-font": `${sizeToLabelFont(size)}px`,
    "--plastic-progress-track-opacity": String(trackOpacity),
    ...(style ?? {}),
  } as CSSProperties;

  const ctx = useMemo<ProgressContextValue>(
    () => ({
      mode: effectiveMode,
      shape,
      size,
      variant,
      theme,
      value: clamped,
      max,
      percent,
      buffer: bufferClamped,
      bufferPercent,
      segments,
      striped,
      animated,
      labelPlacement,
      formatLabel: formatLabel ?? defaultFormatLabel,
      strokeWidth,
      strokeLinecap,
      trackOpacity,
      announce,
    }),
    [
      effectiveMode,
      shape,
      size,
      variant,
      theme,
      clamped,
      max,
      percent,
      bufferClamped,
      bufferPercent,
      segments,
      striped,
      animated,
      labelPlacement,
      formatLabel,
      strokeWidth,
      strokeLinecap,
      trackOpacity,
      announce,
    ],
  );

  const ariaValueMax =
    segments !== null ? segments.count : effectiveMode === "determinate" ? 100 : undefined;
  const ariaValueNow =
    segments !== null
      ? segments.filled
      : effectiveMode === "determinate"
        ? Math.round(percent ?? 0)
        : undefined;

  const dataAttrs: Record<string, string> = {
    "data-variant": variant,
    "data-size": size,
    "data-theme": theme,
    "data-mode": effectiveMode,
    "data-striped": striped ? "true" : "false",
    "data-animated": animated ? "true" : "false",
  };
  if (segments !== null) dataAttrs["data-segmented"] = "true";

  const ariaProps: Record<string, string | number> = {
    "aria-valuemin": 0,
  };
  if (ariaValueMax !== undefined) ariaProps["aria-valuemax"] = ariaValueMax;
  if (ariaValueNow !== undefined) ariaProps["aria-valuenow"] = ariaValueNow;
  if (ariaLabel) ariaProps["aria-label"] = ariaLabel;
  if (ariaLabelledBy) ariaProps["aria-labelledby"] = ariaLabelledBy;
  if (announce) {
    ariaProps["aria-live"] = "polite";
    ariaProps["aria-atomic"] = "true";
  }

  const cls = [
    "plastic-progress",
    shape === "linear" ? "plastic-progress--linear" : "plastic-progress--circular",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ProgressContext.Provider value={ctx}>
      <div
        className={cls}
        style={rootStyle}
        role="progressbar"
        {...dataAttrs}
        {...ariaProps}
      >
        {children}
      </div>
    </ProgressContext.Provider>
  );
}

ProgressRoot.displayName = "Progress.Root";
