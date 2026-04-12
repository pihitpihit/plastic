import type { CardRootProps } from "./Card.types";

export function CardRoot({ className = "", children, ...rest }: CardRootProps) {
  return (
    <div
      {...rest}
      className={["rounded-lg border border-gray-200 bg-white shadow-sm", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
