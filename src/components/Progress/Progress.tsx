import type { ReactNode } from "react";
import type { ProgressProps } from "./Progress.types";
import { ProgressRoot } from "./ProgressRoot";
import { ProgressTrack } from "./ProgressTrack";
import { ProgressIndicator } from "./ProgressIndicator";
import { ProgressLabel } from "./ProgressLabel";
import { ProgressValueText } from "./ProgressValueText";

function ProgressShortcut(props: ProgressProps) {
  const {
    children,
    buffer,
    segments,
    labelPlacement = "none",
    shape = "linear",
    ...rest
  } = props;

  const showValueText =
    labelPlacement !== "none" && segments == null;

  let trackChildren: ReactNode;
  if (segments != null && shape !== "circular") {
    trackChildren = null;
  } else if (shape === "circular") {
    trackChildren = <ProgressIndicator />;
  } else {
    if (buffer != null) {
      trackChildren = (
        <>
          <ProgressIndicator kind="buffer" value={buffer} />
          <ProgressIndicator />
        </>
      );
    } else {
      trackChildren = <ProgressIndicator />;
    }
  }

  const centerChildren = shape === "circular" ? children : null;
  const outsideChildren = shape !== "circular" ? children : null;

  return (
    <ProgressRoot
      shape={shape}
      labelPlacement={labelPlacement}
      {...(buffer !== undefined ? { buffer } : {})}
      {...(segments !== undefined ? { segments } : {})}
      {...rest}
    >
      {outsideChildren != null && labelPlacement === "outside" ? (
        <ProgressLabel placement="outside">{outsideChildren}</ProgressLabel>
      ) : null}
      <ProgressTrack>{trackChildren}</ProgressTrack>
      {showValueText && shape !== "circular" ? <ProgressValueText /> : null}
      {shape === "circular" && centerChildren != null ? (
        <div className="plastic-progress__center">{centerChildren}</div>
      ) : shape === "circular" && labelPlacement !== "none" ? (
        <ProgressValueText />
      ) : null}
    </ProgressRoot>
  );
}

ProgressShortcut.displayName = "Progress";

const Progress = Object.assign(ProgressShortcut, {
  Root: ProgressRoot,
  Track: ProgressTrack,
  Indicator: ProgressIndicator,
  Label: ProgressLabel,
  ValueText: ProgressValueText,
});

export { Progress };
