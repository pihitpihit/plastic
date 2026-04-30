import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  useMemo,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChatBubbleContext } from "./ChatBubbleContext";
import { ChatBubbleContent } from "./ChatBubbleContent";
import { defaultBubbleColors, pickContrastFg } from "./theme";
import { ensureChatBubbleStyles } from "./styles";
import type {
  ChatBubbleActionsPosition,
  ChatBubbleActionsProps,
  ChatBubbleAvatarPosition,
  ChatBubbleAvatarProps,
  ChatBubbleRootProps,
  ChatBubbleTailConfig,
  ChatBubbleTimePosition,
  ChatBubbleTimeProps,
} from "./ChatBubble.types";

interface PartType {
  __plasticChatBubblePart?: "avatar" | "content" | "time" | "footer" | "actions";
}

function getPart(child: ReactNode): PartType["__plasticChatBubblePart"] | null {
  if (!isValidElement(child)) return null;
  const t = child.type as PartType;
  return t.__plasticChatBubblePart ?? null;
}

interface Slots {
  avatar: ReactElement | null;
  avatarPosition: ChatBubbleAvatarPosition;
  content: ReactElement | null;
  timeChildren: ReactElement[];
  footer: ReactElement | null;
  actions: ReactElement | null;
  actionsPosition: ChatBubbleActionsPosition;
  rawBody: ReactNode[];
}

function partitionChildren(children: ReactNode): Slots {
  const slots: Slots = {
    avatar: null,
    avatarPosition: "outside",
    content: null,
    timeChildren: [],
    footer: null,
    actions: null,
    actionsPosition: "outside-bottom",
    rawBody: [],
  };

  Children.forEach(children, (child) => {
    if (child === null || child === undefined || child === false) return;
    const part = getPart(child);
    if (part === "avatar" && isValidElement(child)) {
      slots.avatar = child;
      const props = child.props as ChatBubbleAvatarProps;
      slots.avatarPosition = props.position ?? "outside";
    } else if (part === "content" && isValidElement(child)) {
      slots.content = child;
    } else if (part === "time" && isValidElement(child)) {
      slots.timeChildren.push(child);
    } else if (part === "footer" && isValidElement(child)) {
      slots.footer = child;
    } else if (part === "actions" && isValidElement(child)) {
      slots.actions = child;
      const props = child.props as ChatBubbleActionsProps;
      slots.actionsPosition = props.position ?? "outside-bottom";
    } else {
      slots.rawBody.push(child);
    }
  });

  return slots;
}

function resolveEffectivePosition(
  el: ReactElement,
  containerWidth: number,
): ChatBubbleTimePosition {
  const props = el.props as ChatBubbleTimeProps;
  const pos = props.position ?? "outside-bottom-end";
  if (!pos.startsWith("side-")) return pos;
  const threshold = props.fallbackWidth ?? 280;
  if (containerWidth < threshold) {
    return props.fallbackPosition ?? "outside-bottom-end";
  }
  return pos;
}

function pickTimes(
  times: Partial<Record<ChatBubbleTimePosition, ReactElement>>,
  positions: ChatBubbleTimePosition[],
): ReactElement[] {
  return positions
    .map((p) => times[p])
    .filter((x): x is ReactElement => Boolean(x));
}

function resolveTail(
  tail: ChatBubbleRootProps["tail"],
  align: "start" | "end",
): Required<ChatBubbleTailConfig> | null {
  if (!tail) return null;
  if (tail === true) {
    return { side: align, align: "start", size: 8 };
  }
  return {
    side: tail.side ?? align,
    align: tail.align ?? "start",
    size: tail.size ?? 8,
  };
}

function tailStyle(
  cfg: Required<ChatBubbleTailConfig>,
  bg: string,
): CSSProperties {
  const { side, align, size } = cfg;

  const base: CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    background: bg,
    pointerEvents: "none",
  };

  if (side === "start") {
    base.left = -size + 1;
    base.clipPath = "polygon(100% 0, 100% 100%, 0 50%)";
  } else {
    base.right = -size + 1;
    base.clipPath = "polygon(0 0, 0 100%, 100% 50%)";
  }

  if (align === "start") {
    base.top = 8;
  } else if (align === "end") {
    base.bottom = 8;
  } else {
    base.top = "50%";
    base.transform = "translateY(-50%)";
  }

  return base;
}

function timeAlignFor(pos: ChatBubbleTimePosition): "flex-start" | "flex-end" {
  if (pos.endsWith("-end")) return "flex-end";
  return "flex-start";
}

function SideSlot({
  top,
  bottom,
  paddingInline,
}: {
  top: ReactElement | undefined;
  bottom: ReactElement | undefined;
  paddingInline: string;
}) {
  const justifyContent =
    top && bottom ? "space-between" : top ? "flex-start" : "flex-end";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent,
        alignSelf: "stretch",
        padding: `0.125rem ${paddingInline}`,
        flexShrink: 0,
      }}
    >
      {top}
      {bottom}
    </div>
  );
}

export function ChatBubbleRoot({
  children,
  align = "start",
  color,
  textColor,
  tail = false,
  maxWidth = "70%",
  radius = 12,
  padding = "0.5rem 0.75rem",
  theme = "light",
  loading = false,
  className,
  style,
  ...rest
}: ChatBubbleRootProps) {
  const themeDefaults = defaultBubbleColors[theme];
  const bg = color ?? themeDefaults.bg;
  const fg = textColor ?? (color ? pickContrastFg(color) : themeDefaults.fg);

  useEffect(() => {
    ensureChatBubbleStyles();
  }, []);

  const ctxValue = useMemo(
    () => ({ align, theme, bg, fg }),
    [align, theme, bg, fg],
  );

  // Observe parent width for side-* fallback narrowing
  const rootRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(Infinity);

  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!parent) return;
    const measure = () =>
      setContainerWidth(parent.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const slots = partitionChildren(children);
  const tailCfg = resolveTail(tail, align);

  // Compute effective positions (side-* → fallback when narrow)
  const effectiveTimes: Partial<Record<ChatBubbleTimePosition, ReactElement>> =
    {};
  for (const el of slots.timeChildren) {
    const pos = resolveEffectivePosition(el, containerWidth);
    effectiveTimes[pos] = el;
  }

  const insideBottomTimes = pickTimes(effectiveTimes, [
    "inside-bottom-start",
    "inside-bottom-end",
  ]);
  const inlineAfterTimes = pickTimes(effectiveTimes, ["inline-after"]);
  const outsideTopTimes = pickTimes(effectiveTimes, [
    "outside-top-start",
    "outside-top-end",
  ]);
  const outsideBottomTimes = pickTimes(effectiveTimes, [
    "outside-bottom-start",
    "outside-bottom-end",
  ]);

  const sideRightTop = effectiveTimes["side-right-top"];
  const sideRightBottom = effectiveTimes["side-right-bottom"];
  const sideLeftTop = effectiveTimes["side-left-top"];
  const sideLeftBottom = effectiveTimes["side-left-bottom"];
  const hasSideRight = Boolean(sideRightTop || sideRightBottom);
  const hasSideLeft = Boolean(sideLeftTop || sideLeftBottom);

  const bubbleBody =
    slots.content ??
    (slots.rawBody.length > 0 ? (
      <ChatBubbleContent>{slots.rawBody}</ChatBubbleContent>
    ) : null);

  const outsideAvatar = slots.avatarPosition === "outside" ? slots.avatar : null;
  const insideAvatar =
    slots.avatarPosition === "inside-leading" ? slots.avatar : null;
  const inlineActions =
    slots.actions && slots.actionsPosition === "inline-end"
      ? slots.actions
      : null;
  const outsideActions =
    slots.actions && slots.actionsPosition === "outside-bottom"
      ? slots.actions
      : null;

  return (
    <ChatBubbleContext.Provider value={ctxValue}>
      {/*
       * Outer row: always flex-direction row (not row-reverse).
       * For align=end, justify-content: flex-end pushes everything right.
       * DOM order for align=start: [Avatar][SideLeft][Column][SideRight]
       * DOM order for align=end:   [SideLeft][Column][SideRight][Avatar]
       */}
      <div
        ref={rootRef}
        {...rest}
        data-plastic-chat-bubble=""
        data-align={align}
        data-theme={theme}
        className={className}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: align === "end" ? "flex-end" : "flex-start",
          gap: "0.5rem",
          ...style,
        }}
      >
        {align === "start" && outsideAvatar}

        {hasSideLeft && (
          <SideSlot
            top={sideLeftTop}
            bottom={sideLeftBottom}
            paddingInline="0"
          />
        )}

        {/* Main bubble column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: align === "end" ? "flex-end" : "flex-start",
            minWidth: 0,
            maxWidth: typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth,
          }}
        >
          {/* outside-top times */}
          {outsideTopTimes.map((el) => {
            const pos =
              (el.props as ChatBubbleTimeProps).position ?? "outside-top-end";
            return (
              <div
                key={`top-${pos}`}
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: timeAlignFor(pos),
                  marginBottom: "0.25rem",
                }}
              >
                {el}
              </div>
            );
          })}

          {/* Bubble */}
          <div
            style={{
              position: "relative",
              background: bg,
              color: fg,
              padding,
              borderRadius: radius,
              display: "flex",
              alignItems: "flex-start",
              gap: insideAvatar ? "0.5rem" : 0,
              maxWidth: "100%",
              boxSizing: "border-box",
              boxShadow:
                theme === "dark"
                  ? "0 1px 2px rgba(0,0,0,0.4)"
                  : "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            {tailCfg && (
              <span aria-hidden="true" style={tailStyle(tailCfg, bg)} />
            )}
            {insideAvatar}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                flex: 1,
              }}
            >
              <div
                style={{
                  display: inlineAfterTimes.length > 0 ? "flex" : "block",
                  alignItems: "baseline",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                {bubbleBody}
                {inlineAfterTimes.map((el, i) => (
                  <span key={`inline-${i}`}>{el}</span>
                ))}
                {loading && <LoadingDots />}
              </div>

              {insideBottomTimes.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: insideBottomTimes.some((el) =>
                      (
                        (el.props as ChatBubbleTimeProps).position ?? ""
                      ).endsWith("-end"),
                    )
                      ? "flex-end"
                      : "flex-start",
                    marginTop: "0.25rem",
                  }}
                >
                  {insideBottomTimes.map((el, i) => (
                    <span key={`inside-bottom-${i}`}>{el}</span>
                  ))}
                </div>
              )}
            </div>
            {inlineActions}
          </div>

          {/* outside-bottom times */}
          {outsideBottomTimes.map((el) => {
            const pos =
              (el.props as ChatBubbleTimeProps).position ??
              "outside-bottom-end";
            return (
              <div
                key={`bot-${pos}`}
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: timeAlignFor(pos),
                  marginTop: "0.25rem",
                }}
              >
                {el}
              </div>
            );
          })}

          {outsideActions}
          {slots.footer}
        </div>

        {hasSideRight && (
          <SideSlot
            top={sideRightTop}
            bottom={sideRightBottom}
            paddingInline="0"
          />
        )}

        {align === "end" && outsideAvatar}
      </div>
    </ChatBubbleContext.Provider>
  );
}

function LoadingDots() {
  return (
    <span
      aria-label="입력 중"
      style={{
        display: "inline-flex",
        gap: 3,
        alignItems: "center",
        marginLeft: 6,
        verticalAlign: "middle",
      }}
    >
      <Dot delay={0} />
      <Dot delay={0.2} />
      <Dot delay={0.4} />
    </span>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 5,
        height: 5,
        borderRadius: "50%",
        background: "currentColor",
        opacity: 0.4,
        animation: `plastic-cb-blink 1.2s ${delay}s infinite ease-in-out`,
      }}
    />
  );
}
