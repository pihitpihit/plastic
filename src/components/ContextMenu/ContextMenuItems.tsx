import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import {
  ContextMenuRadioGroupContext,
  useContextMenuContentContext,
  useContextMenuRadioGroupContext,
} from "./ContextMenuContext";
import type { MenuItemDescriptor } from "./ContextMenuContext";
import type {
  ContextMenuCheckboxItemProps,
  ContextMenuItemEvent,
  ContextMenuItemProps,
  ContextMenuLabelProps,
  ContextMenuRadioGroupProps,
  ContextMenuRadioItemProps,
  ContextMenuSeparatorProps,
  ContextMenuShortcutProps,
} from "./ContextMenu.types";
import { contextMenuPalette } from "./theme";
import type { ContextMenuTheme } from "./ContextMenu.types";

function inferTextValue(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(inferTextValue).join("");
  return "";
}

interface BaseItemRowProps {
  kind: "item" | "checkbox" | "radio" | "label";
  disabled?: boolean;
  textValue?: string;
  className?: string;
  style?: CSSProperties;
  onSelect?: (e: ContextMenuItemEvent) => void;
  onCheckedToggle?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  dataAttrs?: Record<string, unknown>;
  ariaChecked?: boolean | "mixed";
  role?: string;
  theme?: ContextMenuTheme;
}

function rowStyle(
  hovered: boolean,
  active: boolean,
  disabled: boolean,
  isDanger: boolean,
  theme: ContextMenuTheme,
  custom?: CSSProperties,
): CSSProperties {
  const p = contextMenuPalette[theme];
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    margin: "0 4px",
    borderRadius: 4,
    cursor: disabled ? "default" : "pointer",
    color: disabled
      ? p.itemDisabledFg
      : isDanger
        ? p.itemDangerFg
        : "inherit",
    background: disabled
      ? "transparent"
      : active
        ? isDanger
          ? p.itemDangerBg
          : p.itemActiveBg
        : hovered
          ? isDanger
            ? p.itemDangerBg
            : p.itemHoverBg
          : "transparent",
    outline: "none",
    userSelect: "none",
    boxSizing: "border-box",
    ...custom,
  };
}

function getThemeFromContent(): ContextMenuTheme {
  return "light";
}

function ItemRow(props: BaseItemRowProps) {
  const {
    kind,
    disabled = false,
    textValue,
    className,
    style,
    onSelect,
    onCheckedToggle,
    leading,
    trailing,
    children,
    dataAttrs,
    ariaChecked,
    role,
    theme: themeProp,
  } = props;

  const ctx = useContextMenuContentContext();
  const id = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const tv = textValue ?? inferTextValue(children);

  const isDanger = !!(dataAttrs && dataAttrs["data-danger"]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const descriptor: MenuItemDescriptor = {
      kind: kind === "label" ? "label" : kind,
      disabled,
      textValue: tv,
      node,
      id,
    };
    return ctx.registerItem(descriptor);
  }, [ctx, disabled, tv, id, kind]);

  const idx = useMemo(() => {
    const list = ctx.getDescriptors();
    return list.findIndex((d) => d.id === id);
  }, [ctx, id]);

  const handleSelect = useCallback(() => {
    if (disabled) return;
    if (onCheckedToggle) onCheckedToggle();
    ctx.onItemSelect(onSelect);
  }, [disabled, onSelect, onCheckedToggle, ctx]);

  const onClick = useCallback(
    (_e: ReactMouseEvent) => {
      handleSelect();
    },
    [handleSelect],
  );

  const onMouseEnter = useCallback(() => {
    if (disabled) return;
    setHovered(true);
    if (ref.current) {
      ref.current.focus({ preventScroll: true });
      const list = ctx.getDescriptors();
      const i = list.findIndex((d) => d.id === id);
      if (i >= 0) ctx.setActiveIndex(i);
    }
  }, [disabled, ctx, id]);

  const onMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect();
      }
    },
    [handleSelect],
  );

  const theme: ContextMenuTheme =
    themeProp ??
    ((ctx.contentRef.current?.getAttribute("data-theme") as ContextMenuTheme) ??
      getThemeFromContent());

  void idx;
  const isActive =
    ctx.activeIndex >= 0 &&
    ctx.getDescriptors()[ctx.activeIndex]?.id === id;

  const dataProps: Record<string, unknown> = {};
  if (dataAttrs) {
    for (const k of Object.keys(dataAttrs)) {
      if (k.startsWith("data-")) dataProps[k] = dataAttrs[k];
    }
  }

  return (
    <div
      ref={ref}
      role={role ?? "menuitem"}
      tabIndex={disabled ? -1 : -1}
      aria-disabled={disabled || undefined}
      {...(ariaChecked !== undefined ? { "aria-checked": ariaChecked } : {})}
      data-plastic-cm-item=""
      data-active={isActive ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...dataProps}
      {...(className !== undefined ? { className } : {})}
      style={rowStyle(hovered, isActive, disabled, isDanger, theme, style)}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
    >
      {leading !== undefined ? (
        <span
          style={{
            width: 16,
            display: "inline-flex",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {leading}
        </span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {trailing !== undefined ? (
        <span style={{ flexShrink: 0 }}>{trailing}</span>
      ) : null}
    </div>
  );
}

function pickDataAttrs(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(props)) {
    if (k.startsWith("data-")) out[k] = props[k];
  }
  return out;
}

export function ContextMenuItem(props: ContextMenuItemProps) {
  const {
    onSelect,
    disabled,
    textValue,
    className,
    style,
    children,
    ...rest
  } = props;
  const dataAttrs = pickDataAttrs(rest as Record<string, unknown>);
  return (
    <ItemRow
      kind="item"
      {...(disabled !== undefined ? { disabled } : {})}
      {...(textValue !== undefined ? { textValue } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(style !== undefined ? { style } : {})}
      {...(onSelect !== undefined ? { onSelect } : {})}
      dataAttrs={dataAttrs}
    >
      {children}
    </ItemRow>
  );
}
ContextMenuItem.displayName = "ContextMenu.Item";

export function ContextMenuCheckboxItem(props: ContextMenuCheckboxItemProps) {
  const {
    checked: controlled,
    defaultChecked,
    onCheckedChange,
    onSelect,
    disabled,
    textValue,
    className,
    style,
    children,
    ...rest
  } = props;
  const [unc, setUnc] = useState<boolean>(defaultChecked ?? false);
  const isControlled = controlled !== undefined;
  const value = isControlled ? !!controlled : unc;

  const handleToggle = useCallback(() => {
    const next = !value;
    if (!isControlled) setUnc(next);
    if (onCheckedChange) onCheckedChange(next);
  }, [value, isControlled, onCheckedChange]);

  const dataAttrs = pickDataAttrs(rest as Record<string, unknown>);
  const checkMark = value ? "✓" : "";
  return (
    <ItemRow
      kind="checkbox"
      role="menuitemcheckbox"
      ariaChecked={value}
      {...(disabled !== undefined ? { disabled } : {})}
      {...(textValue !== undefined ? { textValue } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(style !== undefined ? { style } : {})}
      {...(onSelect !== undefined ? { onSelect } : {})}
      onCheckedToggle={handleToggle}
      leading={
        <span
          aria-hidden="true"
          style={{ fontSize: 12, lineHeight: "16px" }}
        >
          {checkMark}
        </span>
      }
      dataAttrs={dataAttrs}
    >
      {children}
    </ItemRow>
  );
}
ContextMenuCheckboxItem.displayName = "ContextMenu.CheckboxItem";

export function ContextMenuRadioGroup(props: ContextMenuRadioGroupProps) {
  const { value: controlled, defaultValue, onValueChange, children } = props;
  const [unc, setUnc] = useState<string | undefined>(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : unc;

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setUnc(next);
      if (onValueChange) onValueChange(next);
    },
    [isControlled, onValueChange],
  );

  const ctxValue = useMemo(
    () => ({ value, onValueChange: setValue }),
    [value, setValue],
  );

  return (
    <ContextMenuRadioGroupContext.Provider value={ctxValue}>
      <div role="group">{children}</div>
    </ContextMenuRadioGroupContext.Provider>
  );
}
ContextMenuRadioGroup.displayName = "ContextMenu.RadioGroup";

export function ContextMenuRadioItem(props: ContextMenuRadioItemProps) {
  const {
    value,
    onSelect,
    disabled,
    textValue,
    className,
    style,
    children,
    ...rest
  } = props;
  const group = useContextMenuRadioGroupContext();
  const checked = group?.value === value;

  const handleToggle = useCallback(() => {
    if (group) group.onValueChange(value);
  }, [group, value]);

  const dataAttrs = pickDataAttrs(rest as Record<string, unknown>);
  return (
    <ItemRow
      kind="radio"
      role="menuitemradio"
      ariaChecked={!!checked}
      {...(disabled !== undefined ? { disabled } : {})}
      {...(textValue !== undefined ? { textValue } : {})}
      {...(className !== undefined ? { className } : {})}
      {...(style !== undefined ? { style } : {})}
      {...(onSelect !== undefined ? { onSelect } : {})}
      onCheckedToggle={handleToggle}
      leading={
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: checked ? "currentColor" : "transparent",
            border: "1px solid currentColor",
            opacity: checked ? 1 : 0.5,
          }}
        />
      }
      dataAttrs={dataAttrs}
    >
      {children}
    </ItemRow>
  );
}
ContextMenuRadioItem.displayName = "ContextMenu.RadioItem";

export function ContextMenuSeparator(props: ContextMenuSeparatorProps) {
  const { className, style } = props;
  const ctx = useContextMenuContentContext();
  const theme =
    (ctx.contentRef.current?.getAttribute("data-theme") as ContextMenuTheme) ??
    "light";
  const p = contextMenuPalette[theme];
  return (
    <div
      role="separator"
      data-plastic-cm-separator=""
      {...(className !== undefined ? { className } : {})}
      style={{
        height: 1,
        margin: "4px 6px",
        background: p.separatorBg,
        ...style,
      }}
    />
  );
}
ContextMenuSeparator.displayName = "ContextMenu.Separator";

export function ContextMenuLabel(props: ContextMenuLabelProps) {
  const { className, style, children } = props;
  const ctx = useContextMenuContentContext();
  const theme =
    (ctx.contentRef.current?.getAttribute("data-theme") as ContextMenuTheme) ??
    "light";
  const p = contextMenuPalette[theme];
  return (
    <div
      data-plastic-cm-label=""
      {...(className !== undefined ? { className } : {})}
      style={{
        padding: "6px 14px 2px 14px",
        fontSize: 11,
        fontWeight: 600,
        color: p.labelFg,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
ContextMenuLabel.displayName = "ContextMenu.Label";

export function ContextMenuShortcut(props: ContextMenuShortcutProps) {
  const { className, style, children } = props;
  const ctx = useContextMenuContentContext();
  const theme =
    (ctx.contentRef.current?.getAttribute("data-theme") as ContextMenuTheme) ??
    "light";
  const p = contextMenuPalette[theme];
  return (
    <span
      data-plastic-cm-shortcut=""
      {...(className !== undefined ? { className } : {})}
      style={{
        marginLeft: "auto",
        fontSize: 11,
        color: p.shortcutFg,
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
ContextMenuShortcut.displayName = "ContextMenu.Shortcut";
