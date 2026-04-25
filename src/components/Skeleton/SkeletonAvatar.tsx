import type { SkeletonAvatarProps } from "./Skeleton.types";
import { SkeletonRoot } from "./SkeletonRoot";

export function SkeletonAvatar(props: SkeletonAvatarProps) {
  const {
    shape = "circle",
    size = 40,
    animation,
    theme,
    visible,
    fadeMs,
    children,
    className,
    style,
    "aria-label": ariaLabel,
  } = props;

  if (shape === "circle") {
    return (
      <SkeletonRoot
        shape="circle"
        size={size}
        {...(animation !== undefined ? { animation } : {})}
        {...(theme !== undefined ? { theme } : {})}
        {...(visible !== undefined ? { visible } : {})}
        {...(fadeMs !== undefined ? { fadeMs } : {})}
        {...(className !== undefined ? { className } : {})}
        {...(style !== undefined ? { style } : {})}
        {...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {})}
        {...(children !== undefined ? { children } : {})}
      />
    );
  }

  const borderRadius = shape === "rounded" ? 8 : 0;
  return (
    <SkeletonRoot
      shape="rect"
      width={size}
      height={size}
      borderRadius={borderRadius}
      {...(animation !== undefined ? { animation } : {})}
      {...(theme !== undefined ? { theme } : {})}
      {...(visible !== undefined ? { visible } : {})}
      {...(fadeMs !== undefined ? { fadeMs } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(style !== undefined ? { style } : {})}
      {...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {})}
      {...(children !== undefined ? { children } : {})}
    />
  );
}

SkeletonAvatar.displayName = "Skeleton.Avatar";
