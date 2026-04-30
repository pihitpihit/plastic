import { useEffect, useMemo, useState } from "react";
import { useChatBubbleContext } from "./ChatBubbleContext";
import { defaultBubbleColors } from "./theme";
import type { ChatBubbleTimeProps } from "./ChatBubble.types";

const PART = "time" as const;

function toDate(t: number | Date | string): Date {
  if (t instanceof Date) return t;
  if (typeof t === "number") return new Date(t);
  return new Date(t);
}

function defaultAbsoluteFormatter(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function defaultRelativeFormatter(deltaMs: number): string {
  const sign = deltaMs >= 0 ? 1 : -1;
  const abs = Math.abs(deltaMs);
  const sec = Math.round(abs / 1000);
  if (sec < 5) return sign > 0 ? "방금" : "잠시 후";
  if (sec < 60) return sign > 0 ? `${sec}초 전` : `${sec}초 후`;
  const min = Math.round(sec / 60);
  if (min < 60) return sign > 0 ? `${min}분 전` : `${min}분 후`;
  const hr = Math.round(min / 60);
  if (hr < 24) return sign > 0 ? `${hr}시간 전` : `${hr}시간 후`;
  const day = Math.round(hr / 24);
  if (day < 30) return sign > 0 ? `${day}일 전` : `${day}일 후`;
  const month = Math.round(day / 30);
  if (month < 12) return sign > 0 ? `${month}달 전` : `${month}달 후`;
  const yr = Math.round(month / 12);
  return sign > 0 ? `${yr}년 전` : `${yr}년 후`;
}

export function ChatBubbleTime({
  t,
  mode = "absolute",
  absoluteFormatter,
  relativeFormatter,
  separator = " · ",
  refreshInterval = 60_000,
  className,
  style,
}: ChatBubbleTimeProps) {
  const { theme } = useChatBubbleContext();
  const date = useMemo(() => toDate(t), [t]);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (mode === "absolute" || refreshInterval <= 0) return;
    const id = window.setInterval(
      () => setTick((n) => n + 1),
      refreshInterval,
    );
    return () => window.clearInterval(id);
  }, [mode, refreshInterval]);

  const absStr = (absoluteFormatter ?? defaultAbsoluteFormatter)(date);
  const delta = Date.now() - date.getTime();
  const relStr = (relativeFormatter ?? defaultRelativeFormatter)(delta);

  let display = absStr;
  if (mode === "relative") display = relStr;
  else if (mode === "both") display = `${absStr}${separator}${relStr}`;

  return (
    <time
      className={className}
      style={{
        fontSize: "0.75rem",
        color: defaultBubbleColors[theme].metaFg,
        whiteSpace: "nowrap",
        ...style,
      }}
      title={date.toLocaleString()}
      dateTime={date.toISOString()}
    >
      {display}
    </time>
  );
}

ChatBubbleTime.__plasticChatBubblePart = PART;
