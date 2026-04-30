import { useState } from "react";
import { useChatBubbleContext } from "./ChatBubbleContext";
import type { ChatBubbleAvatarProps } from "./ChatBubble.types";

const PART = "avatar" as const;

export function ChatBubbleAvatar({
  src,
  alt,
  fallback,
  size = 32,
  className,
  style,
}: ChatBubbleAvatarProps) {
  const { theme } = useChatBubbleContext();
  const [errored, setErrored] = useState(false);

  const showImage = src && !errored;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme === "dark" ? "#4b5563" : "#e5e7eb",
        color: theme === "dark" ? "#e5e7eb" : "#374151",
        fontSize: Math.max(10, Math.round(size * 0.4)),
        fontWeight: 600,
        userSelect: "none",
        ...style,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? ""}
          onError={() => setErrored(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        fallback ?? null
      )}
    </div>
  );
}

ChatBubbleAvatar.__plasticChatBubblePart = PART;
