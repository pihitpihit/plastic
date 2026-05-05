# NumberInput 컴포넌트 설계문서

## Context

숫자 전용 입력 컴포넌트 `NumberInput` 추가. native `<input type="number">`는 다음 한계가 있어 라이브러리에서 자체 컴포넌트가 필요:

1. **시각 일관성 부재** — 브라우저별 stepper UI 다름 (Chrome 화살표, Firefox 스피너, Safari 미표시).
2. **정밀도 제어 불가** — 0.1 + 0.2 = 0.30000000000000004 같은 부동소수점 문제.
3. **휠 스크롤 동작이 위험** — 페이지 스크롤 중 의도치 않은 값 변경.
4. **format / locale 미지원** — "1,234.56" 같은 천 단위 콤마 표시 불가.
5. **prefix/suffix 슬롯 부재** — "$100", "75%" 같은 단위 표시 어려움.
6. **range constraint 시각 피드백 부재** — min/max 초과 시 invalid 시각 약함.

본 컴포넌트는 발견·필터·금액·수량 등 모든 숫자 입력 시나리오 흡수.

참고 (prior art):
- **Mantine NumberInput** — 가장 풍부. min/max/step/precision/clampBehavior/decimalSeparator/thousandsSeparator/fixedDecimalScale/allowDecimal/allowNegative/prefix/suffix.
- **Chakra `NumberInput`** — Compound (Root, Field, IncrementStepper, DecrementStepper). a11y 표준.
- **react-aria `useNumberField`** — 가장 완성도 높은 a11y. Intl.NumberFormat 기반 locale 자동.
- **Ant Design `InputNumber`** — formatter/parser 함수 prop. step·precision.
- **Material UI** — TextField + type="number" 정도, 자체 NumberInput 없음.
- **HTML5 spec** — `<input type="number">`의 `valueAsNumber`, `stepUp()`, `stepDown()` API 참고.

본 레포 내부 참조:
- `src/components/Icon/` (plan 023) — stepper 버튼의 `<Icon name="chevron-up" />`, `<Icon name="chevron-down" />`.
- `src/components/PathInput/PathInputRoot.tsx` — 텍스트 입력 패턴 (focus/blur, onChange) 참조.
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 통합.
- `src/components/Toast/colors.ts` — invalid state 색상 참고 (severity 추출 후 통일).

---

## 0. TL;DR

```tsx
// 1. 가장 단순
<NumberInput defaultValue={0} />

// 2. min/max/step
<NumberInput min={0} max={100} step={5} defaultValue={50} />

// 3. controlled
<NumberInput value={value} onValueChange={setValue} />

// 4. precision (소수점 자릿수)
<NumberInput precision={2} step={0.01} defaultValue={1.5} />
// → 입력값이 1.5 → blur 시 "1.50" 표시 (precision=2 강제)

// 5. format (천 단위 콤마)
<NumberInput format="thousand" defaultValue={1000000} />
// → "1,000,000"

// 6. prefix / suffix
<NumberInput prefix="$" defaultValue={99.99} precision={2} />
<NumberInput suffix="%" min={0} max={100} />

// 7. 비활성 / readonly
<NumberInput disabled defaultValue={42} />
<NumberInput readOnly defaultValue={42} />

// 8. 사이즈
<NumberInput size="sm" />
<NumberInput size="md" />
<NumberInput size="lg" />

// 9. compound (커스텀 stepper UI)
<NumberInput.Root value={v} onValueChange={setV}>
  <NumberInput.Decrement>−</NumberInput.Decrement>
  <NumberInput.Field />
  <NumberInput.Increment>+</NumberInput.Increment>
</NumberInput.Root>

// 10. allowNegative / allowDecimal
<NumberInput allowNegative={false} allowDecimal={false} />
```

핵심 원칙:
- **외부 value: number | null** (string 아님). null = 빈 입력.
- **내부 표시: string** — locale 포맷 적용된 표시 문자열. blur 시 정규화.
- **clamp**: min/max 초과 시 blur 시점에 자동 보정 (또는 즉시, `clampBehavior` prop).
- **stepper 버튼**: 우측 세로 위/아래. 또는 사용자 compound 자유 합성.
- **키보드**: Arrow Up/Down (±step), Shift+Arrow (×10), PgUp/PgDn (×10), Home/End (min/max).
- **휠**: 포커스 중에만 작동 (페이지 스크롤 보호). `disableWheel` 옵션.
- **a11y**: `role="spinbutton"`, `aria-valuenow/min/max`, `aria-invalid`.

---

## 1. Goals / Non-goals

### Goals (v1)
1. value: `number | null`. null = 빈 입력 허용.
2. min/max/step/precision props.
3. `format: "plain" | "thousand"` — 천 단위 콤마.
4. `prefix`, `suffix` — string 또는 ReactNode.
5. `size: "sm" | "md" | "lg"`.
6. `theme: "light" | "dark"`.
7. `allowNegative` (기본 true), `allowDecimal` (기본 true).
8. `clampBehavior: "blur" | "input" | "none"` — 기본 "blur".
9. `disableWheel: boolean` — 기본 false (포커스 중 휠 작동).
10. 키보드: Arrow ±step, Shift+Arrow ±step×10, PgUp/PgDn ±step×10, Home/End min/max.
11. stepper 버튼 (자동) + compound 패턴 (커스텀).
12. controlled/uncontrolled.
13. validation 시각: invalid 시 `aria-invalid="true"` + 빨간 outline.
14. focus/blur/keydown 표준 props pass-through.
15. compound: `NumberInput.Root`, `.Field`, `.Increment`, `.Decrement`.
16. 배럴 export.

### Non-goals (v1)
- 통화·언어별 자동 포맷 (Intl.NumberFormat 통합) — v1.1.
- 분수 표시 (1/2) — v1 안 함.
- 단위 변환 (kg ↔ lb) — v1 안 함.
- BigInt 지원 — v1은 Number만. 1e15 이상은 정밀도 보장 안 함.
- 자동 RTL — v1 LTR 가정.
- 슬라이더와의 동기화 (Slider+NumberInput compound) — v1 별도.

---

## 2. 공개 API

### 2.1 타입 — `src/components/NumberInput/NumberInput.types.ts`

```ts
import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

export type NumberInputSize = "sm" | "md" | "lg";
export type NumberInputTheme = "light" | "dark";
export type NumberInputFormat = "plain" | "thousand";
export type ClampBehavior = "blur" | "input" | "none";

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type" | "size"> {
  /** controlled value. null = 빈 입력. */
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;

  min?: number;
  max?: number;
  /** 기본 1. */
  step?: number;
  /** 소수점 자릿수. precision=2 면 1.5 → "1.50" 표시 + 강제 반올림. */
  precision?: number;

  /** 기본 "plain". */
  format?: NumberInputFormat;

  /** 음수 허용. 기본 true. */
  allowNegative?: boolean;

  /** 소수 허용. 기본 true. false면 정수만. */
  allowDecimal?: boolean;

  /** 기본 "blur". */
  clampBehavior?: ClampBehavior;

  /** 기본 false. true면 포커스 중 휠 비활성. */
  disableWheel?: boolean;

  /** 좌측 prefix. "$", "₩" 등. */
  prefix?: ReactNode;

  /** 우측 suffix. "%", "kg" 등. */
  suffix?: ReactNode;

  /** stepper 버튼 표시. 기본 true. */
  showStepper?: boolean;

  size?: NumberInputSize;
  theme?: NumberInputTheme;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;     // 외부에서 invalid 강제 (form validation 등)
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;

  className?: string;
  style?: CSSProperties;

  inputClassName?: string;
  inputStyle?: CSSProperties;
}

export interface NumberInputRootProps extends Omit<NumberInputProps, "showStepper" | "prefix" | "suffix"> {
  children: ReactNode;
}

export interface NumberInputFieldProps {
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  "aria-label"?: string;
}

export interface NumberInputStepButtonProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  "aria-label"?: string;
}
```

### 2.2 utils — `src/components/NumberInput/NumberInput.utils.ts`

```ts
/** 부동소수점 안전 round. precision=2 → Math.round(v*100)/100. */
export function roundToPrecision(v: number, precision: number): number {
  if (precision <= 0) return Math.round(v);
  const factor = Math.pow(10, precision);
  return Math.round(v * factor) / factor;
}

/** clamp. */
export function clamp(v: number, min: number | undefined, max: number | undefined): number {
  let r = v;
  if (min !== undefined && r < min) r = min;
  if (max !== undefined && r > max) r = max;
  return r;
}

/** number → 표시 문자열. */
export function formatNumber(
  v: number,
  precision: number | undefined,
  format: "plain" | "thousand",
): string {
  let s: string;
  if (precision !== undefined) {
    s = v.toFixed(precision);
  } else {
    s = String(v);
  }
  if (format === "thousand") {
    const [intPart, decPart] = s.split(".");
    const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    s = decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  }
  return s;
}

/** 사용자 입력 문자열 → number | null. */
export function parseNumber(s: string, allowNegative: boolean, allowDecimal: boolean): number | null {
  if (s.trim() === "") return null;
  // 콤마 제거
  let cleaned = s.replace(/,/g, "");
  // 음수 차단
  if (!allowNegative && cleaned.startsWith("-")) cleaned = cleaned.replace(/-/g, "");
  // 소수점 차단
  if (!allowDecimal) cleaned = cleaned.replace(/\./g, "");
  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;
  return n;
}

/** 입력 문자열 검증 (typing 중간 단계 허용 — "-", "1.", ".5" 등). */
export function isValidPartialInput(s: string, allowNegative: boolean, allowDecimal: boolean): boolean {
  if (s === "") return true;
  if (!allowNegative && s.includes("-")) return false;
  if (!allowDecimal && s.includes(".")) return false;
  // 정규식
  const allowedChars = allowNegative
    ? (allowDecimal ? /^-?\d*(\.\d*)?$/ : /^-?\d*$/)
    : (allowDecimal ? /^\d*(\.\d*)?$/ : /^\d*$/);
  // thousand 콤마는 표시만 — 입력 중에는 콤마 허용 후 parse 단계 제거
  const withoutCommas = s.replace(/,/g, "");
  return allowedChars.test(withoutCommas);
}
```

### 2.3 컴포넌트 — `src/components/NumberInput/NumberInput.tsx`

(주요 로직 — 전체 구현은 §2.4 참조)

```tsx
export function NumberInput(props: NumberInputProps) {
  const {
    value: controlledValue, defaultValue, onValueChange,
    min, max, step = 1, precision,
    format = "plain", allowNegative = true, allowDecimal = true,
    clampBehavior = "blur", disableWheel = false,
    prefix, suffix, showStepper = true,
    size = "md", theme = "light",
    disabled, readOnly, invalid: invalidProp, placeholder, autoFocus, required,
    className, style, inputClassName, inputStyle,
    onFocus, onBlur, onKeyDown, onWheel,
    ...rest
  } = props;

  // value (controlled / uncontrolled)
  const [internalValue, setInternalValue] = useState<number | null>(defaultValue ?? null);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = useCallback((next: number | null) => {
    if (controlledValue === undefined) setInternalValue(next);
    onValueChange?.(next);
  }, [controlledValue, onValueChange]);

  // 표시 문자열
  const [displayValue, setDisplayValue] = useState<string>(() =>
    value === null ? "" : formatNumber(value, precision, format)
  );
  const [isFocused, setIsFocused] = useState(false);

  // value 변경 시 displayValue 동기화 (단 focus 중엔 사용자 입력 우선)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value === null ? "" : formatNumber(value, precision, format));
    }
  }, [value, precision, format, isFocused]);

  const isOutOfRange = value !== null && (
    (min !== undefined && value < min) || (max !== undefined && value > max)
  );
  const computedInvalid = invalidProp || isOutOfRange;

  // 키보드 / 휠 / 스텝 / 포커스 / blur / change 핸들러는 §2.4 참조

  return (
    <div ... wrapper>
      {prefix && <span ...>{prefix}</span>}
      <input ... />
      {suffix && <span ...>{suffix}</span>}
      {showStepper && (
        <div ... stepper>
          <button onClick={() => stepUp()}>↑</button>
          <button onClick={() => stepDown()}>↓</button>
        </div>
      )}
    </div>
  );
}
```

### 2.4 핵심 동작 명세

#### 4.1 stepUp / stepDown
```ts
const stepUp = () => {
  const cur = value ?? 0;
  let next = cur + step;
  if (precision !== undefined) next = roundToPrecision(next, precision);
  if (clampBehavior !== "none") next = clamp(next, min, max);
  setValue(next);
};
const stepDown = () => { /* same with -step */ };
```

#### 4.2 onChange (typing)
```ts
const handleChange = (e) => {
  const raw = e.target.value;
  if (!isValidPartialInput(raw, allowNegative, allowDecimal)) return; // 무시
  setDisplayValue(raw);
  // value 즉시 갱신 — 단 빈 문자열은 null
  if (raw.trim() === "") {
    setValue(null);
  } else {
    let n = parseNumber(raw, allowNegative, allowDecimal);
    if (n !== null) {
      if (clampBehavior === "input") n = clamp(n, min, max);
      setValue(n);
    }
  }
};
```

#### 4.3 onBlur (정규화)
```ts
const handleBlur = (e) => {
  setIsFocused(false);
  if (value !== null) {
    let v = value;
    if (precision !== undefined) v = roundToPrecision(v, precision);
    if (clampBehavior !== "none") v = clamp(v, min, max);
    setValue(v);
    setDisplayValue(formatNumber(v, precision, format));
  } else {
    setDisplayValue("");
  }
  onBlur?.(e);
};
```

#### 4.4 키보드
```ts
const handleKeyDown = (e) => {
  onKeyDown?.(e);
  if (e.defaultPrevented) return;
  let multiplier = 1;
  if (e.shiftKey) multiplier = 10;

  switch (e.key) {
    case "ArrowUp":
      e.preventDefault();
      stepBy(step * multiplier); return;
    case "ArrowDown":
      e.preventDefault();
      stepBy(-step * multiplier); return;
    case "PageUp":
      e.preventDefault();
      stepBy(step * 10); return;
    case "PageDown":
      e.preventDefault();
      stepBy(-step * 10); return;
    case "Home":
      if (min !== undefined) {
        e.preventDefault();
        setValue(min);
      }
      return;
    case "End":
      if (max !== undefined) {
        e.preventDefault();
        setValue(max);
      }
      return;
  }
};
```

#### 4.5 휠
```ts
const handleWheel = (e) => {
  if (disableWheel || !isFocused || disabled || readOnly) return;
  e.preventDefault();
  if (e.deltaY < 0) stepUp();
  else stepDown();
};
```

### 2.5 compound 패턴

```tsx
// NumberInput.Root → Context provider
// NumberInput.Field → input
// NumberInput.Increment / Decrement → step 버튼

const Ctx = createContext<{ stepUp, stepDown, value, ... }>(null);

export function NumberInputRoot(props: NumberInputRootProps) {
  // ... 동일 state 관리
  return <Ctx.Provider value={...}>{children}</Ctx.Provider>;
}

export function NumberInputField(props: NumberInputFieldProps) {
  const ctx = useContext(Ctx);
  return <input ... />;
}

export function NumberInputIncrement(props: NumberInputStepButtonProps) {
  const ctx = useContext(Ctx);
  return <button onClick={ctx.stepUp}>{props.children ?? "+"}</button>;
}
```

NumberInput 단일 컴포넌트는 내부적으로 NumberInput.Root + Field + Increment + Decrement 합성.

### 2.6 배럴 — `src/components/NumberInput/index.ts`

```ts
export { NumberInput } from "./NumberInput";
export type {
  NumberInputProps,
  NumberInputRootProps,
  NumberInputFieldProps,
  NumberInputStepButtonProps,
  NumberInputSize,
  NumberInputTheme,
  NumberInputFormat,
  ClampBehavior,
} from "./NumberInput.types";
```

---

## 3. 파일 구조

```
src/components/NumberInput/
├── NumberInput.tsx
├── NumberInput.types.ts
├── NumberInput.utils.ts
├── NumberInputRoot.tsx
├── NumberInputField.tsx
├── NumberInputStepButton.tsx (Increment/Decrement 공유)
├── NumberInput.styles.ts
└── index.ts
```

---

## 4. 데모 페이지 — `demo/src/pages/NumberInputPage.tsx`

```tsx
export function NumberInputPage() {
  const [v, setV] = useState<number | null>(50);

  return (
    <div>
      <h1>NumberInput</h1>

      <Card.Root><Card.Header>Basic</Card.Header><Card.Body>
        <NumberInput defaultValue={0} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>min/max/step</Card.Header><Card.Body>
        <NumberInput min={0} max={100} step={5} defaultValue={50} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Controlled</Card.Header><Card.Body>
        <NumberInput value={v} onValueChange={setV} min={0} max={100} />
        <p>Value: {v}</p>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>precision=2 + step=0.01</Card.Header><Card.Body>
        <NumberInput precision={2} step={0.01} defaultValue={1.5} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Thousand format</Card.Header><Card.Body>
        <NumberInput format="thousand" defaultValue={1234567} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Prefix / Suffix</Card.Header><Card.Body>
        <NumberInput prefix="$" defaultValue={99.99} precision={2} />
        <NumberInput suffix="%" min={0} max={100} defaultValue={75} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>allowNegative=false / allowDecimal=false</Card.Header><Card.Body>
        <NumberInput allowNegative={false} allowDecimal={false} placeholder="positive integer only" />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Sizes</Card.Header><Card.Body>
        <NumberInput size="sm" defaultValue={1} />
        <NumberInput size="md" defaultValue={2} />
        <NumberInput size="lg" defaultValue={3} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Disabled / readOnly / invalid</Card.Header><Card.Body>
        <NumberInput disabled defaultValue={42} />
        <NumberInput readOnly defaultValue={42} />
        <NumberInput invalid defaultValue={42} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Compound (custom UI)</Card.Header><Card.Body>
        <NumberInput.Root defaultValue={5} min={0} max={20}>
          <NumberInput.Decrement>−</NumberInput.Decrement>
          <NumberInput.Field />
          <NumberInput.Increment>+</NumberInput.Increment>
        </NumberInput.Root>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dark theme</Card.Header><Card.Body style={{background:"#1f2937",padding:16}}>
        <NumberInput theme="dark" defaultValue={42} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Wheel disabled</Card.Header><Card.Body>
        <NumberInput disableWheel defaultValue={0} />
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 5. 접근성 (a11y)

- `role="spinbutton"` (input에).
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- `aria-invalid` 동기화.
- stepper 버튼: `aria-label="Increase"`, `aria-label="Decrease"`.
- 키보드: Arrow Up/Down 표준. 스크린리더가 자동 안내.
- 휠: 포커스 중에만 — 페이지 스크롤 보호.

---

## 6. Edge cases

- **빈 입력 → null** — placeholder 표시.
- **min > max** — 무시 (사용자 잘못). 콘솔 경고 가능 (v1 미포함).
- **step=0** — 무한 step 방지 위해 stepBy 호출 시 무시 (또는 기본 1).
- **precision 음수** — 무시 (정수 처리 동일).
- **부동소수점**: 0.1 + 0.2 → roundToPrecision으로 처리.
- **format="thousand" + decimal**: "1,234.56" 형식 유지.
- **paste**: 사용자가 "1,234"를 붙여넣기 → cleaned = "1234" → 1234.
- **IME**: 한글 IME는 숫자 입력에 영향 없음.
- **clampBehavior="input"**: 100인 max에 사용자가 200 타이핑 시 즉시 100으로 clamp → 사용자가 100 이상 입력 불가능. UX 거슬릴 수 있어 기본 "blur".
- **focus 중 prop value 외부에서 변경**: displayValue는 사용자 입력 보존, value만 prop 따라감.

---

## 7. 구현 단계

### Phase 1: 코어
1. types, utils
2. NumberInput 단일 컴포넌트 (Root + Field + Stepper 합성)
3. compound exports
4. 배럴

### Phase 2: 데모

### Phase 3: 정리
- candidates.md에서 3번 제거 + 링크
- README 업데이트

---

## 8. 체크리스트
- [ ] 8개 파일 작성
- [ ] typecheck / build 통과
- [ ] 데모 페이지 모든 섹션 정상 (light/dark)
- [ ] 키보드 (Arrow, Shift+Arrow, PgUp/PgDn, Home/End) 작동
- [ ] 휠 (disableWheel 분기 포함) 작동
- [ ] precision 부동소수점 안전
- [ ] format=thousand 천 단위 콤마
- [ ] prefix/suffix 정렬
- [ ] compound API 작동
- [ ] candidates.md / README 업데이트
