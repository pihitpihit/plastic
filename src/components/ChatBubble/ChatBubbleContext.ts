import { createContext, useContext } from "react";
import type { ChatBubbleAlign, ChatBubbleTheme } from "./ChatBubble.types";

export interface ChatBubbleContextValue {
  align: ChatBubbleAlign;
  theme: ChatBubbleTheme;
  /** 해석된 배경색. */
  bg: string;
  /** 해석된 텍스트 색상. */
  fg: string;
}

export const ChatBubbleContext = createContext<ChatBubbleContextValue | null>(
  null,
);

export function useChatBubbleContext(): ChatBubbleContextValue {
  const ctx = useContext(ChatBubbleContext);
  if (ctx === null) {
    throw new Error(
      "ChatBubble compound components must be used within <ChatBubble.Root>",
    );
  }
  return ctx;
}
