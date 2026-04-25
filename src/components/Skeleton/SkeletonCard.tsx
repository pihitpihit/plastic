import type { CSSProperties } from "react";
import type { SkeletonCardProps } from "./Skeleton.types";
import { toCssLength } from "./Skeleton.utils";
import { SkeletonRoot } from "./SkeletonRoot";
import { SkeletonText } from "./SkeletonText";
import { skeletonPalette } from "./theme";

export function SkeletonCard(props: SkeletonCardProps) {
  const {
    hasMedia = false,
    mediaHeight = 160,
    hasTitle = true,
    lines = 2,
    hasFooter = false,
    hasAvatar = false,
    width = "100%",
    padding = 16,
    animation,
    theme = "light",
    visible,
    fadeMs,
    children,
    className,
    style,
    "aria-label": ariaLabel,
  } = props;

  const isVisible = visible ?? true;
  const ms = fadeMs ?? 180;

  if (!isVisible) {
    if (children === undefined || children === null) return null;
    if (ms === 0) return <>{children}</>;
    return (
      <div
        className="sk-content-fadein"
        style={{ animationDuration: `${ms}ms` }}
      >
        {children}
      </div>
    );
  }

  const palette = skeletonPalette[theme];
  const containerStyle: CSSProperties = {
    boxSizing: "border-box",
    background: palette.cardBg,
    border: `1px solid ${palette.cardBorder}`,
    borderRadius: 8,
    overflow: "hidden",
    width: toCssLength(width),
    display: "flex",
    flexDirection: "column",
    ...style,
  };

  const innerPadding: CSSProperties = {
    padding: `${padding}px`,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const forwardCommon = {
    ...(animation !== undefined ? { animation } : {}),
    theme,
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel ?? "Loading"}
      className={className}
      style={containerStyle}
    >
      {hasMedia && (
        <SkeletonRoot
          shape="rect"
          width="100%"
          height={mediaHeight}
          borderRadius={0}
          {...forwardCommon}
          _suppressAria
        />
      )}
      <div style={innerPadding}>
        {hasAvatar && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <SkeletonRoot
              shape="circle"
              size={40}
              {...forwardCommon}
              _suppressAria
            />
            <SkeletonRoot
              shape="rect"
              width="40%"
              height={14}
              {...forwardCommon}
              _suppressAria
            />
          </div>
        )}
        {hasTitle && (
          <SkeletonRoot
            shape="rect"
            width="70%"
            height={20}
            {...forwardCommon}
            _suppressAria
          />
        )}
        {lines > 0 && (
          <SkeletonText lines={lines} {...forwardCommon} _suppressAria />
        )}
        {hasFooter && (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <SkeletonRoot
              shape="rect"
              width={72}
              height={28}
              borderRadius={6}
              {...forwardCommon}
              _suppressAria
            />
            <SkeletonRoot
              shape="rect"
              width={72}
              height={28}
              borderRadius={6}
              {...forwardCommon}
              _suppressAria
            />
          </div>
        )}
      </div>
    </div>
  );
}

SkeletonCard.displayName = "Skeleton.Card";
