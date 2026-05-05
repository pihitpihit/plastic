# QRCode 컴포넌트 설계문서

## Context

텍스트/URL을 SVG 기반 QR code로 렌더링하는 `QRCode` 컴포넌트.

자체 구현 vs 라이브러리 의존 결정:
- **option A — 자체 구현**: QR 알고리즘은 ISO/IEC 18004 표준이지만 정확한 구현은 비용 큼 (Reed-Solomon 에러 코드 + 마스킹 + 인코딩 모드 4종).
- **option B — qrcode-generator (npm, ~10kb)**: 가장 가볍고 의존 없음.
- **option C — qrcode (npm, ~50kb)**: 풀 기능 (canvas/svg/string 변환).

**결정**: option B — `qrcode-generator` 사용. 단일 의존, MIT, ~10kb gzipped, ESM 호환. 자체 구현은 라이브러리 정체성과 안 맞고 (UI 라이브러리), 검증된 알고리즘이 더 안전.

참고:
- **react-qr-code** — `qrcode.react` 또는 자체 구현. 다양한 패키지 존재.
- **Mantine** — 자체 미제공, 외부 의존.
- **Mantine UI 호환 패턴** — value, size, level, fgColor, bgColor 표준 props.

본 레포 내부 참조:
- `package.json` — peer dependencies 검토 (qrcode-generator 추가).
- `src/components/Image/` (plan 031) — fallback 패턴 참고.

---

## 0. TL;DR

```tsx
// 1. 가장 단순
<QRCode value="https://example.com" />

// 2. 사이즈
<QRCode value="..." size={240} />

// 3. error correction level
<QRCode value="..." level="H" /> // H = highest, L/M/Q/H

// 4. 색상
<QRCode value="..." fgColor="#3b82f6" bgColor="#fff" />

// 5. margin (quiet zone)
<QRCode value="..." margin={4} />

// 6. 중앙 로고
<QRCode value="https://example.com" level="H">
  <img src="/logo.png" width={48} height={48} />
</QRCode>

// 7. label (스크린리더)
<QRCode value="..." label="결제 QR" />
```

핵심 원칙:
- **SVG 출력** — 벡터, 무한 확대, 인쇄 안전.
- **error correction**: L (~7%) / M (~15%) / Q (~25%) / H (~30%).
- **중앙 로고 슬롯**: children 사용 시 가운데 absolute 배치 (logo 크기는 사용자 책임, level=H 권장).
- **최대한 단순**: prop 적게.
- **a11y**: `role="img"` + `aria-label`.

---

## 1. Goals / Non-goals

### Goals (v1)
1. value (string).
2. size (number, px).
3. level: "L" | "M" | "Q" | "H".
4. fgColor, bgColor.
5. margin (모듈 단위, default 4).
6. children 슬롯 (중앙 로고).
7. label (a11y).
8. 외부 의존: `qrcode-generator`.

### Non-goals (v1)
- Canvas 출력.
- PNG export 버튼 (별도 합성).
- 동적 데이터 인코딩 모드 자동 선택.
- byte 모드 외 (numeric/alphanumeric/kanji 자동 선택은 라이브러리가 처리).

---

## 2. 공개 API

### 2.1 타입 — `src/components/QRCode/QRCode.types.ts`

```ts
import type { CSSProperties, ReactNode } from "react";

export type QRCodeLevel = "L" | "M" | "Q" | "H";

export interface QRCodeProps {
  value: string;
  size?: number;             // 기본 200
  level?: QRCodeLevel;        // 기본 "M"
  fgColor?: string;           // 기본 "#000"
  bgColor?: string;           // 기본 "#fff"
  margin?: number;            // 모듈 단위. 기본 4
  label?: string;             // a11y aria-label
  children?: ReactNode;       // 중앙 로고
  className?: string;
  style?: CSSProperties;
}
```

### 2.2 컴포넌트 — `src/components/QRCode/QRCode.tsx`

```tsx
import { useMemo } from "react";
// @ts-expect-error: qrcode-generator는 default export
import qrcodeGenerator from "qrcode-generator";
import type { QRCodeProps } from "./QRCode.types";

export function QRCode(props: QRCodeProps) {
  const {
    value, size = 200, level = "M",
    fgColor = "#000", bgColor = "#fff",
    margin = 4, label, children,
    className, style,
  } = props;

  const matrix = useMemo(() => {
    // qrcode-generator 사용
    const qr = qrcodeGenerator(0, level); // 0 = type number 자동
    qr.addData(value);
    qr.make();
    const moduleCount = qr.getModuleCount();
    const m: boolean[][] = [];
    for (let r = 0; r < moduleCount; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < moduleCount; c++) {
        row.push(qr.isDark(r, c));
      }
      m.push(row);
    }
    return m;
  }, [value, level]);

  const moduleCount = matrix.length;
  const totalModules = moduleCount + margin * 2;
  const modulePx = size / totalModules;

  return (
    <div
      role="img"
      aria-label={label ?? `QR code for ${value}`}
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: size, height: size,
        background: bgColor,
        ...style,
      }}
    >
      <svg
        viewBox={`0 0 ${totalModules} ${totalModules}`}
        width={size}
        height={size}
        style={{ display: "block" }}
        aria-hidden="true"
      >
        <rect width={totalModules} height={totalModules} fill={bgColor} />
        {matrix.flatMap((row, r) =>
          row.map((dark, c) => dark ? (
            <rect
              key={`${r}-${c}`}
              x={c + margin}
              y={r + margin}
              width={1}
              height={1}
              fill={fgColor}
            />
          ) : null)
        )}
      </svg>
      {children && (
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: bgColor,
          padding: 4,
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
```

### 2.3 배럴

```ts
export { QRCode } from "./QRCode";
export type { QRCodeProps, QRCodeLevel } from "./QRCode.types";
```

---

## 3. 파일 구조

```
src/components/QRCode/
├── QRCode.tsx
├── QRCode.types.ts
└── index.ts
```

---

## 4. package.json 추가

```json
"dependencies": {
  "qrcode-generator": "^1.4.4",
  ...기존
}
```

---

## 5. 데모 페이지

```tsx
export function QRCodePage() {
  return (
    <div>
      <h1>QRCode</h1>
      <Card.Root><Card.Header>Basic</Card.Header><Card.Body>
        <QRCode value="https://example.com" />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Sizes</Card.Header><Card.Body>
        <HStack gap={16}>
          <QRCode value="A" size={80} />
          <QRCode value="A" size={150} />
          <QRCode value="A" size={240} />
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Error correction levels</Card.Header><Card.Body>
        <HStack gap={16}>
          {(["L","M","Q","H"] as const).map(l => (
            <div key={l} style={{textAlign:"center"}}>
              <QRCode value="https://example.com" level={l} />
              <p>{l}</p>
            </div>
          ))}
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>색상</Card.Header><Card.Body>
        <HStack gap={16}>
          <QRCode value="A" fgColor="#3b82f6" />
          <QRCode value="A" fgColor="#10b981" />
          <QRCode value="A" fgColor="#fff" bgColor="#0f172a" />
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>중앙 로고</Card.Header><Card.Body>
        <QRCode value="https://example.com" level="H" size={200}>
          <div style={{width:40,height:40,background:"#3b82f6",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700}}>P</div>
        </QRCode>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>긴 텍스트</Card.Header><Card.Body>
        <QRCode value="The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog." level="L" />
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 6. 접근성

- `role="img"` + `aria-label` (필수 — 라벨 미지정 시 value 사용).
- 내부 SVG는 `aria-hidden="true"` (장식).

---

## 7. Edge cases

- **빈 value**: `qrcode-generator`가 어떻게 처리하는지 확인 필요. 빈 매트릭스 또는 에러. → 권장: value 빈 문자열 시 placeholder div 표시 (v1 단순 — 사용자 책임).
- **매우 긴 value (~3000자+)**: type number 자동 증가. 너무 길면 라이브러리 에러 throw → ErrorBoundary로 처리.
- **유니코드/한글**: byte 모드 자동 선택 → UTF-8 인코딩.
- **중앙 로고가 너무 큼**: QR 인식 실패. level=H 권장 + 로고 크기 ≤ 25% 사이즈.

---

## 8. 구현 단계
- Phase 1: package.json 의존 추가 + 컴포넌트
- Phase 2: 데모
- Phase 3: 정리

## 9. 체크리스트
- [ ] 3개 파일 + package.json
- [ ] typecheck/build
- [ ] 다양한 사이즈/level/색상 시각 확인
- [ ] 실제 QR 스캐너로 인식 확인
- [ ] 중앙 로고 표시 + level=H 인식 검증
- [ ] candidates / README
