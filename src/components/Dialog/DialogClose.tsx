import {
  cloneElement,
  forwardRef,
  isValidElement,
  useState,
} from "react";
import type { MouseEventHandler, ReactElement } from "react";
import { useDialogContext } from "./DialogContext";
import { closeIconColor, closeIconHoverBg } from "./colors";
import type { DialogCloseProps } from "./Dialog.types";

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  );
}

type ChildProps = {
  onClick?: MouseEventHandler<HTMLElement> | undefined;
};

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose(
    { children, asChild, className, style, onClick, ...rest },
    ref,
  ) {
    const ctx = useDialogContext();
    const [hover, setHover] = useState(false);

    const handleClick: MouseEventHandler<HTMLElement> = (e) => {
      onClick?.(e as React.MouseEvent<HTMLButtonElement>);
      if (e.defaultPrevented) return;
      ctx.setOpen(false);
    };

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<ChildProps>;
      return cloneElement<ChildProps>(child, {
        onClick: (e) => {
          child.props.onClick?.(e);
          if (!e.defaultPrevented) handleClick(e);
        },
      });
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-label="Close dialog"
        onClick={handleClick}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "2rem",
          height: "2rem",
          borderRadius: "0.375rem",
          border: "none",
          background: hover ? closeIconHoverBg[ctx.theme] : "transparent",
          cursor: "pointer",
          color: closeIconColor[ctx.theme],
          transition: "background-color 150ms ease",
          ...style,
        }}
        {...rest}
      >
        {children ?? <XIcon />}
      </button>
    );
  },
);
