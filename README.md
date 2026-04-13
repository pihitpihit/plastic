# plastic

TypeScript + React 기반 UI 컴포넌트 라이브러리.

**[데모 보기 →](https://pihitpihit.github.io/plastic/)**

---

## Installation

### GitHub에서 직접 설치 (npm 7+)

```bash
# 최신 main 브랜치
npm install github:pihitpihit/plastic

# 특정 태그/커밋 고정
npm install github:pihitpihit/plastic#v0.1.0
```

npm이 설치 후 자동으로 `prepare` 스크립트를 실행해 `dist/`를 빌드합니다.  
**npm 7 이상** 필요 (npm 7+는 GitHub dependency 설치 시 devDependencies 설치 및 `prepare` 자동 실행).

### npm 배포판 설치 (추후)

```bash
npm install @pihitpihit/plastic
```

> **참고** — plastic 컴포넌트는 Tailwind CSS 클래스를 사용합니다.  
> 프로젝트의 `tailwind.config.js` `content` 배열에 아래 경로를 추가하세요.
>
> ```js
> content: [
>   "./src/**/*.{ts,tsx}",
>   "./node_modules/@pihitpihit/plastic/dist/**/*.js",
> ]
> ```

---

## Quick Start

```ts
import { Button, Card, CodeView } from "@pihitpihit/plastic";
import type { ButtonProps, CardRootProps, CodeViewProps } from "@pihitpihit/plastic";
```

모든 컴포넌트와 타입은 `"@pihitpihit/plastic"` 단일 진입점에서 import합니다.

---

## Components

### Button

클릭 가능한 기본 버튼 컴포넌트. `HTMLButtonElement`의 모든 속성(`onClick`, `type`, `aria-*` 등)을 그대로 사용할 수 있습니다.

![Button preview](docs/previews/button-preview.svg)

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"primary" \| "secondary" \| "ghost"` | `"primary"` | 버튼 스타일 |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | 버튼 크기 |
| `loading` | `boolean` | `false` | 로딩 상태 (자동으로 `disabled` 처리) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `children` | `ReactNode` | 필수 | 버튼 내용 |

#### Usage

```tsx
import { Button } from "plastic";

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>

// HTML 속성 그대로 사용
<Button type="submit" onClick={() => console.log("clicked")}>
  Submit
</Button>
```

---

### Card

Compound 컴포넌트 패턴의 카드. `Card.Root`, `Card.Header`, `Card.Body`, `Card.Footer`를 조합해서 사용합니다. 서브 컴포넌트는 필요한 것만 선택적으로 사용할 수 있습니다.

![Card preview](docs/previews/card-preview.svg)

#### Sub-components

| Component | Description |
|---|---|
| `Card.Root` | 카드 외곽 컨테이너 (필수) |
| `Card.Header` | 상단 제목 영역 (선택) |
| `Card.Body` | 본문 영역 (선택) |
| `Card.Footer` | 하단 액션 영역 (선택) |

모든 서브 컴포넌트는 `HTMLDivElement` 속성(`className`, `style`, `aria-*` 등)을 지원합니다.

#### Usage

```tsx
import { Card, Button } from "plastic";

// 전체 구성
<Card.Root>
  <Card.Header>Card Title</Card.Header>
  <Card.Body>
    <p>Card content goes here.</p>
  </Card.Body>
  <Card.Footer>
    <Button size="sm">Confirm</Button>
    <Button size="sm" variant="ghost">Cancel</Button>
  </Card.Footer>
</Card.Root>

// 필요한 서브 컴포넌트만 사용
<Card.Root>
  <Card.Body>Body only card</Card.Body>
</Card.Root>

// className으로 커스터마이징
<Card.Root className="max-w-sm shadow-lg">
  <Card.Header className="text-blue-700">Custom Header</Card.Header>
  <Card.Body>Content</Card.Body>
</Card.Root>
```

---

### CodeView

라인 번호, 홀짝 배경, syntax highlighting을 갖춘 코드 표시 컴포넌트. `prism-react-renderer` 기반으로 동작합니다.

![CodeView preview](docs/previews/codeview-preview.svg)

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `code` | `string` | 필수 | 표시할 코드 문자열 |
| `language` | `Language` | `"typescript"` | 문법 강조 언어 ([지원 언어 목록](https://github.com/FormidableLabs/prism-react-renderer/blob/master/packages/generate-prism-languages/index.ts)) |
| `theme` | `"light" \| "dark"` | `"light"` | 색상 테마 (light: VS Light, dark: VS Dark) |
| `showLineNumbers` | `boolean` | `true` | 라인 번호 표시 여부 |
| `showAlternatingRows` | `boolean` | `true` | 홀짝 라인 배경색 구분 여부 |
| `showInvisibles` | `boolean` | `false` | 탭·공백·불가시 유니코드 문자 시각화 여부 |
| `tabSize` | `number` | `2` | 탭 너비 (`tab-size` CSS 및 불가시 문자 렌더링에 적용) |
| `editable` | `boolean` | `false` | 인라인 편집 활성화. 포커스 시 줄 배경이 파란 계열로 전환. Tab/Shift+Tab 들여쓰기, Enter 자동 들여쓰기 지원 |
| `onValueChange` | `(value: string) => void` | — | 편집 시 호출되는 콜백 |
| `highlightLines` | `number[]` | — | 강조할 라인 번호 배열 (1-indexed, 황색 배경 적용) |
| `wordWrap` | `boolean` | `false` | 긴 줄 자동 줄바꿈 여부 |
| `gutterWidth` | `string` | auto | 라인번호 컬럼 너비 (예: `"3rem"`). 미설정 시 줄 수에 따라 자동 계산 |
| `gutterGap` | `string` | `"1rem"` | 라인번호와 코드 내용 사이 간격 |
| `className` | `string` | — | 외부 컨테이너에 추가할 클래스 |

#### Usage

```tsx
import { CodeView } from "plastic";

// 기본 (light 테마, 라인 번호, 홀짝 배경 모두 활성)
<CodeView
  code={`const x: number = 42;`}
  language="typescript"
/>

// 다크 테마
<CodeView
  code={myCode}
  language="python"
  theme="dark"
/>

// 라인 번호 없이, 단색 배경
<CodeView
  code={myCode}
  language="json"
  showLineNumbers={false}
  showAlternatingRows={false}
/>

// 불가시 문자 시각화 (showInvisibles)
const sample = `function greet(name: string) {\n\tconst msg = "Hello, " + name;\n\tconst esc = "\x1b[31mred\x1b[0m";\n\tconst url = "https://example.com\u200B/path";\n\treturn msg;\n}`;

<CodeView code={sample} language="typescript" showInvisibles tabSize={2} />
```

**`showInvisibles` 렌더링 결과:**

![showInvisibles preview](docs/previews/codeview-invisibles-preview.svg)

| 문자 | 표시 | 설명 |
|---|---|---|
| `\t` (U+0009) | `→` | 탭 — `tabSize` ch 너비 inline-block |
| ` ` (U+0020) | `·` | 공백 |
| U+0000–U+001F, U+007F | `ESC` `NUL` `BEL` … | ASCII 제어 문자 32종 — 니모닉 칩 |
| U+00A0, U+200B … | `ZWS` `NBS` `BOM` … | Unicode 불가시 문자 20종 — 니모닉 칩 |

모든 칩은 hover 시 `U+001B ESC` 형식의 툴팁을 표시합니다.

---

## Demo

각 컴포넌트의 실제 렌더링 결과를 로컬에서 확인하려면 데모 앱을 실행하세요.

```bash
cd demo
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 열면 좌측 사이드바에서 각 컴포넌트 페이지를 탐색할 수 있습니다.

---

## Project Structure

```
src/
├── index.ts                    ← 단일 public API 진입점
└── components/
    ├── Button/
    │   ├── Button.tsx          ← 구현 (미노출)
    │   ├── Button.types.ts     ← 타입 정의
    │   └── index.ts            ← Button의 공개 surface
    ├── Card/
    │   ├── Card.tsx            ← Compound assembly (미노출)
    │   ├── CardRoot.tsx        ← 서브 컴포넌트 (미노출)
    │   ├── CardHeader.tsx      ← 서브 컴포넌트 (미노출)
    │   ├── CardBody.tsx        ← 서브 컴포넌트 (미노출)
    │   ├── CardFooter.tsx      ← 서브 컴포넌트 (미노출)
    │   ├── Card.types.ts       ← 타입 정의
    │   └── index.ts            ← Card의 공개 surface
    └── CodeView/
        ├── CodeView.tsx        ← 구현 (미노출)
        ├── CodeView.types.ts   ← 타입 정의
        └── index.ts            ← CodeView의 공개 surface
```

`src/index.ts`에서 명시적으로 export된 심볼만 외부에 노출됩니다. 내부 구현 파일(`CardRoot.tsx`, 스타일 맵, 컨텍스트 등)은 직접 import할 수 없습니다.

---

## CodeView Layout Contract

CodeView를 다른 프로젝트에 통합할 때 안전하게 조작할 수 있는 부분과 주의해야 할 부분입니다.

### 안전한 외부 조작

| 방법 | 설명 |
|------|------|
| `className` | 외부 컨테이너(scroll wrapper)에 클래스 추가. `max-w-*`, `shadow-*`, `border-*` 등 레이아웃 외부 스타일에 사용 |
| `gutterWidth` | 라인번호 컬럼 너비 명시적 지정. textarea paddingLeft에 자동 반영됨 |
| `gutterGap` | 라인번호와 코드 내용 사이 간격 지정. textarea paddingLeft에 자동 반영됨 |
| `tabSize`, `showLineNumbers`, `wordWrap` 등 | 모든 공개 prop은 안전하게 사용 가능 |

### 주의사항 — geometry가 깨지는 경우

| 금지 사항 | 이유 |
|-----------|------|
| `className`으로 `padding` 추가 | 내부 textarea는 `inset: 0`으로 컨테이너를 꽉 채우므로, outer padding이 생기면 textarea와 렌더링 영역이 misalign됨 |
| `<pre>` / gutter `<span>` 직접 스타일 조작 | flex 레이아웃 계산이 gutterWidth·gutterGap 기준으로 이루어지므로, 직접 조작 시 textarea overlay와 위치가 어긋남 |
| `editable` 모드에서 font-size 변경 | `fontSize: "inherit"`으로 맞춰져 있지만, 외부에서 font-size를 계단식으로 바꾸면 줄 높이가 달라져 caret 위치가 어긋날 수 있음 |

### editable 모드 통합 시

```tsx
// ✅ 안전 — 외부 컨테이너에 크기 제한
<CodeView editable className="max-w-2xl" ... />

// ❌ 위험 — outer padding이 textarea overlay와 misalign 유발
<CodeView editable className="p-4" ... />

// ✅ 안전 — gutter 간격 조정은 prop으로
<CodeView editable gutterWidth="2rem" gutterGap="0.75rem" ... />
```

---

## Build

```bash
npm run build      # dist/ 에 ESM + CJS + .d.ts 생성
npm run dev        # watch 모드
npm run typecheck  # 타입 검사만
```
