import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type AccordionTheme = "light" | "dark";

export type AccordionType = "single" | "multiple";

export type AccordionDisabledFocus = "skip" | "stay";

interface AccordionRootCommonProps {
  disabled?: boolean;
  disabledFocus?: AccordionDisabledFocus;
  theme?: AccordionTheme;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface AccordionRootPropsSingle extends AccordionRootCommonProps {
  type?: "single";
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (next: string | null) => void;
  collapsible?: boolean;
}

export interface AccordionRootPropsMultiple extends AccordionRootCommonProps {
  type: "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (next: string[]) => void;
  collapsible?: never;
}

export type AccordionRootProps =
  | AccordionRootPropsSingle
  | AccordionRootPropsMultiple;

export interface AccordionItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export type AccordionHeadingTag =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "div";

export interface AccordionHeaderProps {
  as?: AccordionHeadingTag;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface AccordionTriggerProps
  extends Omit<HTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  hideChevron?: boolean;
}

export interface AccordionContentProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  forceMount?: boolean;
}
