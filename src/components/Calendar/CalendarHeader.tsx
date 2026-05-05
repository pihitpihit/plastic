import type { CSSProperties } from "react";
import type { CalendarHeaderProps } from "./Calendar.types";

export function CalendarHeader(props: CalendarHeaderProps) {
  const { className, style, children } = props;

  const baseStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 4px 8px",
    gap: 4,
    ...style,
  };

  return (
    <div className={className} style={baseStyle}>
      {children}
    </div>
  );
}

CalendarHeader.displayName = "Calendar.Header";
