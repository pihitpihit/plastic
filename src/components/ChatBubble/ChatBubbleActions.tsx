import { useChatBubbleContext } from "./ChatBubbleContext";
import type { ChatBubbleActionsProps } from "./ChatBubble.types";

const PART = "actions" as const;

export function ChatBubbleActions({
  children,
  showOnHover = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  position: _position,
  className,
  style,
  ...rest
}: ChatBubbleActionsProps) {
  const { align } = useChatBubbleContext();
  return (
    <div
      {...rest}
      data-show-on-hover={showOnHover ? "true" : undefined}
      className={className}
      style={{
        display: "flex",
        gap: "0.25rem",
        alignItems: "center",
        justifyContent: align === "end" ? "flex-end" : "flex-start",
        marginTop: "0.25rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

ChatBubbleActions.__plasticChatBubblePart = PART;
