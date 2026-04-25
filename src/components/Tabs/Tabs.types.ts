import type { CSSProperties, ReactNode } from "react";

export type TabsTheme = "light" | "dark";
export type TabsOrientation = "horizontal" | "vertical";
export type TabsActivationMode = "automatic" | "manual";

export interface TabsRootProps {
  defaultValue?: string | undefined;
  value?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;

  orientation?: TabsOrientation | undefined;
  activationMode?: TabsActivationMode | undefined;

  theme?: TabsTheme | undefined;

  disabled?: boolean | undefined;

  id?: string | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;

  children: ReactNode;
}

export interface TabsListProps {
  "aria-label"?: string | undefined;
  "aria-labelledby"?: string | undefined;

  scrollable?: boolean | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;

  children: ReactNode;
}

export interface TabsTriggerProps {
  value: string;

  disabled?: boolean | undefined;

  closable?: boolean | undefined;
  onClose?: ((value: string) => void) | undefined;

  icon?: ReactNode | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;

  children: ReactNode;
}

export interface TabsContentProps {
  value: string;

  forceMount?: boolean | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;

  children: ReactNode;
}
