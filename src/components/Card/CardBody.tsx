import type { CardBodyProps } from "./Card.types";

export function CardBody({ className = "", children, ...rest }: CardBodyProps) {
  return (
    <div
      {...rest}
      className={["px-4 py-4", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
