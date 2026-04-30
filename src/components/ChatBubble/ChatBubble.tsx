import { ChatBubbleRoot } from "./ChatBubbleRoot";
import { ChatBubbleContent } from "./ChatBubbleContent";
import { ChatBubbleAvatar } from "./ChatBubbleAvatar";
import { ChatBubbleTime } from "./ChatBubbleTime";
import { ChatBubbleFooter } from "./ChatBubbleFooter";
import { ChatBubbleActions } from "./ChatBubbleActions";

/**
 * Compound 컴포넌트 — 채팅 메시지 말풍선.
 *
 * Usage:
 *   <ChatBubble.Root align="end" color="#3b82f6" tail>
 *     <ChatBubble.Avatar src="..." fallback="A" />
 *     <ChatBubble.Content>안녕하세요</ChatBubble.Content>
 *     <ChatBubble.Time t={Date.now()} mode="both" />
 *   </ChatBubble.Root>
 */
export const ChatBubble = Object.assign(ChatBubbleRoot, {
  Root: ChatBubbleRoot,
  Content: ChatBubbleContent,
  Avatar: ChatBubbleAvatar,
  Time: ChatBubbleTime,
  Footer: ChatBubbleFooter,
  Actions: ChatBubbleActions,
});
