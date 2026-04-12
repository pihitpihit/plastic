import type { CardHeaderProps } from "./Card.types";

export function CardHeader({ className = "", children, ...rest }: CardHeaderProps) {
  return (
    <div
      {...rest}
      className={["border-b border-gray-200 px-4 py-3 font-semibold", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
