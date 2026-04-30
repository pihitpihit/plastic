import type { ChatBubbleContentProps } from "./ChatBubble.types";

const PART = "content" as const;

export function ChatBubbleContent({
  children,
  className,
  style,
  ...rest
}: ChatBubbleContentProps) {
  return (
    <div
      {...rest}
      className={className}
      style={{
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        lineHeight: 1.5,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

ChatBubbleContent.__plasticChatBubblePart = PART;
