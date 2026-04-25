import { createContext, useContext } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from "react";
import type {
  TabsActivationMode,
  TabsOrientation,
  TabsTheme,
} from "./Tabs.types";

export interface RegisteredTab {
  value: string;
  element: HTMLElement;
  disabled: boolean;
  closable: boolean;
  onClose?: ((value: string) => void) | undefined;
}

export interface TabsContextValue {
  rootId: string;
  value: string | null;
  setValue: (v: string) => void;
  orientation: TabsOrientation;
  activationMode: TabsActivationMode;
  theme: TabsTheme;
  disabled: boolean;
  rtl: boolean;

  register: (tab: RegisteredTab) => () => void;
  getTabs: () => RegisteredTab[];
  onTriggerKeyDown: (
    e: ReactKeyboardEvent<HTMLElement>,
    value: string,
  ) => void;

  listRef: MutableRefObject<HTMLDivElement | null>;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (ctx === null) {
    throw new Error(
      "Tabs compound components must be used within <Tabs.Root>.",
    );
  }
  return ctx;
}
