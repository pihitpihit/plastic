import type { ProgressTrackProps } from "./Progress.types";
import { useProgressContext } from "./ProgressContext";
import { ProgressTrackLinear } from "./ProgressTrackLinear";
import { ProgressTrackCircular } from "./ProgressTrackCircular";

export function ProgressTrack(props: ProgressTrackProps) {
  const { shape } = useProgressContext();
  if (shape === "circular") {
    return (
      <ProgressTrackCircular
        {...(props.className !== undefined ? { className: props.className } : {})}
        {...(props.style !== undefined ? { style: props.style } : {})}
      >
        {props.children}
      </ProgressTrackCircular>
    );
  }
  return (
    <ProgressTrackLinear
      {...(props.className !== undefined ? { className: props.className } : {})}
      {...(props.style !== undefined ? { style: props.style } : {})}
    >
      {props.children}
    </ProgressTrackLinear>
  );
}

ProgressTrack.displayName = "Progress.Track";
