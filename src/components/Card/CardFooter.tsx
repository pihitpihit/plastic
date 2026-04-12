import type { CardFooterProps } from "./Card.types";

export function CardFooter({ className = "", children, ...rest }: CardFooterProps) {
  return (
    <div
      {...rest}
      className={["border-t border-gray-200 px-4 py-3", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
