import { createContext, useContext, useRef, useState, useEffect, useCallback, useId } from "react";
import type { RefObject } from "react";
import type {
  PathInputRootProps,
  PathInputTheme,
  ValidationState,
} from "./PathInput.types";
import { useControllable } from "../_shared/useControllable";

interface PathInputContextValue {
  value: string;
  setValue: (next: string) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  validationState: ValidationState;
  isValidating: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  triggerBrowse: () => void;
  disabled: boolean;
  accept: string | undefined;
  multiple: boolean;
  directory: boolean;
  theme: PathInputTheme;
  onFilesSelected: ((files: File[]) => void) | undefined;
  statusId: string;
}

const PathInputContext = createContext<PathInputContextValue | null>(null);

export function usePathInputContext() {
  const ctx = useContext(PathInputContext);
  if (!ctx) throw new Error("PathInput sub-components must be used within PathInput.Root");
  return ctx;
}

export function PathInputRoot({
  children,
  value: controlledValue,
  defaultValue = "",
  onChange,
  disabled = false,
  accept,
  multiple = false,
  directory = false,
  validate,
  validateDebounce = 300,
  validationStatus,
  validationMessage,
  theme = "light",
  onFilesSelected,
  className = "",
  style,
  ...rest
}: PathInputRootProps) {
  const [value, setValue] = useControllable(controlledValue, defaultValue, onChange);
  const [files, setFiles] = useState<File[]>([]);
  const [validationState, setValidationState] = useState<ValidationState>({ status: "idle", message: "" });
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusId = useId();

  const sequenceRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // 외부 제어 검증
  useEffect(() => {
    if (validationStatus !== undefined) {
      setValidationState({ status: validationStatus, message: validationMessage ?? "" });
      setIsValidating(false);
    }
  }, [validationStatus, validationMessage]);

  // 내부 검증 (디바운스)
  useEffect(() => {
    if (validationStatus !== undefined) return;
    if (!validate) {
      setValidationState({ status: "idle", message: "" });
      setIsValidating(false);
      return;
    }
    if (value === "") {
      setValidationState({ status: "idle", message: "" });
      setIsValidating(false);
      return;
    }

    clearTimeout(timerRef.current);
    const seq = ++sequenceRef.current;

    timerRef.current = setTimeout(async () => {
      setIsValidating(true);
      try {
        const result = await validate(value);
        if (seq !== sequenceRef.current) return;
        setValidationState({ status: result.status, message: result.message ?? "" });
      } catch {
        if (seq !== sequenceRef.current) return;
        setValidationState({ status: "invalid", message: "Validation failed" });
      } finally {
        if (seq === sequenceRef.current) setIsValidating(false);
      }
    }, validateDebounce);

    return () => clearTimeout(timerRef.current);
  }, [value, validate, validateDebounce, validationStatus]);

  const triggerBrowse = useCallback(() => {
    if (!disabled) fileInputRef.current?.click();
  }, [disabled]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files ?? []);
      if (selectedFiles.length === 0) return;

      setFiles(selectedFiles);
      onFilesSelected?.(selectedFiles);

      const file = selectedFiles[0]!;
      const path = file.webkitRelativePath || file.name;

      if (multiple && selectedFiles.length > 1) {
        setValue(selectedFiles.map((f) => f.webkitRelativePath || f.name).join(", "));
      } else {
        setValue(path);
      }

      e.target.value = "";
    },
    [multiple, setValue, onFilesSelected],
  );

  const ctx: PathInputContextValue = {
    value,
    setValue,
    files,
    setFiles,
    validationState,
    isValidating,
    fileInputRef,
    triggerBrowse,
    disabled,
    accept,
    multiple,
    directory,
    theme,
    onFilesSelected,
    statusId,
  };

  return (
    <div
      role="group"
      aria-label="File path input"
      className={className}
      style={style}
      {...rest}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory={directory ? "" : undefined}
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />
      <PathInputContext.Provider value={ctx}>
        {children}
      </PathInputContext.Provider>
    </div>
  );
}
