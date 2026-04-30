import { useChatBubbleContext } from "./ChatBubbleContext";
import { defaultBubbleColors } from "./theme";
import type { ChatBubbleFooterProps } from "./ChatBubble.types";

const PART = "footer" as const;

export function ChatBubbleFooter({
  children,
  className,
  style,
  ...rest
}: ChatBubbleFooterProps) {
  const { theme, align } = useChatBubbleContext();
  return (
    <div
      {...rest}
      className={className}
      style={{
        fontSize: "0.75rem",
        color: defaultBubbleColors[theme].metaFg,
        display: "flex",
        gap: "0.5rem",
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

ChatBubbleFooter.__plasticChatBubblePart = PART;
