# Image 컴포넌트 설계문서

## Context

native `<img>`만으로 처리 어려운 케이스를 흡수하는 `Image` 컴포넌트 추가:
- **로딩 중 표시** — Skeleton 또는 blur placeholder.
- **에러 시 fallback** — 실패 시 placeholder 또는 fallback URL.
- **Lazy load** — IntersectionObserver 기반.
- **Intrinsic ratio 보장** — width/height 비율 유지로 layout shift 방지.

참고:
- **Next.js `next/image`** — 가장 영향력. lazy, blur placeholder, sizes/srcSet 자동.
- **Mantine `Image`** — fallback prop, fit, radius.
- **Chakra `Image`** — fallbackSrc, ignoreFallback, htmlWidth/Height.

본 레포 내부 참조:
- `src/components/Skeleton/` (설계됨, plan 021) — 로딩 placeholder로 합성.
- `src/components/Icon/` (plan 023) — 에러 fallback 아이콘.

---

## 0. TL;DR

```tsx
// 1. 기본
<Image src="/photo.jpg" alt="My photo" />

// 2. 사이즈 (intrinsic ratio 유지)
<Image src="..." alt="..." width={400} height={300} />

// 3. fit
<Image src="..." alt="..." width={200} height={200} fit="cover" />
<Image src="..." alt="..." fit="contain" />

// 4. fallback
<Image src="/may-fail.jpg" alt="..." fallbackSrc="/default.png" />
<Image src="/may-fail.jpg" alt="..." fallback={<div>이미지 없음</div>} />

// 5. lazy
<Image src="..." alt="..." lazy />

// 6. blur placeholder
<Image src="..." alt="..." placeholder="blur" blurDataURL="data:..." />

// 7. radius
<Image src="..." alt="..." radius={8} />
<Image src="..." alt="..." radius="full" /> {/* 원형 */}

// 8. onLoad / onError
<Image src="..." alt="..." onLoad={...} onError={...} />

// 9. status 관찰
const status = useImageStatus(src); // "loading" | "loaded" | "error"
```

핵심 원칙:
- **intrinsic ratio 보장** — width × height 명시 시 박스 미리 차지 → CLS 방지.
- **로딩/에러 상태 자체 관리** — `<img>` 이벤트 listener.
- **fallback 우선순위**: `onError` 시 fallback ReactNode > fallbackSrc > 기본 placeholder.
- **lazy**: native `loading="lazy"` 우선, 미지원 브라우저는 IntersectionObserver fallback.
- **`object-fit` 매핑** — fit="cover" / "contain" / "fill" / "none" / "scale-down".

---

## 1. Goals / Non-goals

### Goals (v1)
1. src, alt 필수.
2. width, height (number/string).
3. fit: "cover" | "contain" | "fill" | "none" | "scale-down".
4. fallbackSrc (URL) + fallback (ReactNode) — 둘 중 우선.
5. lazy (boolean) — 기본 false. true면 native lazy + IntersectionObserver fallback.
6. placeholder: "skeleton" | "blur" | "none".
7. blurDataURL (placeholder=blur 일 때).
8. radius — number(px) | "full" (50%) | string.
9. onLoad, onError 콜백.
10. `useImageStatus(src)` 훅 — 사용자가 자체 UI 만들 때.
11. theme light/dark (placeholder 색상).
12. ImgHTMLAttributes pass-through (style, className 등).

### Non-goals (v1)
- 자동 srcSet / sizes — 사용자가 직접.
- WebP 자동 변환.
- 이미지 크롭 / resize 클라이언트 처리.
- Next.js Image처럼 서버 변환.
- progressive loading.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Image/Image.types.ts`

```ts
import type { CSSProperties, ImgHTMLAttributes, ReactNode } from "react";

export type ImageFit = "cover" | "contain" | "fill" | "none" | "scale-down";
export type ImagePlaceholder = "skeleton" | "blur" | "none";
export type ImageRadius = number | "full" | string;
export type ImageStatus = "loading" | "loaded" | "error";
export type ImageTheme = "light" | "dark";

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "placeholder"> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  fit?: ImageFit;
  radius?: ImageRadius;

  fallbackSrc?: string;
  fallback?: ReactNode;

  lazy?: boolean;
  placeholder?: ImagePlaceholder;
  blurDataURL?: string;

  theme?: ImageTheme;

  onLoad?: () => void;
  onError?: () => void;

  className?: string;
  style?: CSSProperties;
}
```

### 2.2 useImageStatus 훅 — `src/components/Image/useImageStatus.ts`

```ts
export function useImageStatus(src: string): ImageStatus {
  const [status, setStatus] = useState<ImageStatus>("loading");
  useEffect(() => {
    if (typeof Image === "undefined") return; // SSR
    setStatus("loading");
    const img = new window.Image();
    img.onload = () => setStatus("loaded");
    img.onerror = () => setStatus("error");
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
  return status;
}
```

### 2.3 Image 컴포넌트

```tsx
export function Image(props: ImageProps) {
  const {
    src, alt, width, height,
    fit, radius,
    fallbackSrc, fallback,
    lazy = false, placeholder = "none", blurDataURL,
    theme = "light",
    onLoad, onError,
    className, style,
    ...rest
  } = props;

  const [status, setStatus] = useState<ImageStatus>("loading");
  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    setStatus("loading");
    setResolvedSrc(src);
  }, [src]);

  const handleLoad = () => {
    setStatus("loaded");
    onLoad?.();
  };
  const handleError = () => {
    if (fallbackSrc && resolvedSrc === src) {
      setResolvedSrc(fallbackSrc);
      return;
    }
    setStatus("error");
    onError?.();
  };

  const radiusStyle = radius === "full" ? "50%" : typeof radius === "number" ? `${radius}px` : radius;

  const containerStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
    overflow: "hidden",
    borderRadius: radiusStyle,
    ...(width !== undefined ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
    background: placeholder === "skeleton" ? (theme === "dark" ? "#374151" : "#f3f4f6") : undefined,
    ...style,
  };

  const imgStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "block",
    ...(fit ? { objectFit: fit } : {}),
    opacity: status === "loaded" ? 1 : 0,
    transition: "opacity 200ms ease",
  };

  // 에러 상태 — fallback 노드 우선, 없으면 placeholder
  if (status === "error") {
    if (fallback) {
      return <div className={className} style={containerStyle}>{fallback}</div>;
    }
    return (
      <div className={className} style={{ ...containerStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="error" size="lg" />
      </div>
    );
  }

  // blur placeholder
  const blurOverlay = placeholder === "blur" && blurDataURL && status === "loading" ? (
    <img
      src={blurDataURL}
      alt=""
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: fit ?? "cover",
        filter: "blur(20px)",
        transform: "scale(1.1)",
      }}
    />
  ) : null;

  return (
    <span className={className} style={containerStyle}>
      {blurOverlay}
      <img
        src={resolvedSrc}
        alt={alt}
        loading={lazy ? "lazy" : undefined}
        onLoad={handleLoad}
        onError={handleError}
        style={imgStyle}
        {...rest}
      />
    </span>
  );
}
```

### 2.4 배럴

```ts
export { Image } from "./Image";
export { useImageStatus } from "./useImageStatus";
export type { ImageProps, ImageFit, ImagePlaceholder, ImageRadius, ImageStatus, ImageTheme } from "./Image.types";
```

---

## 3. 파일 구조

```
src/components/Image/
├── Image.tsx
├── Image.types.ts
├── useImageStatus.ts
└── index.ts
```

---

## 4. 데모 페이지

```tsx
export function ImagePage() {
  return (
    <div>
      <h1>Image</h1>

      <Card.Root><Card.Header>Basic</Card.Header><Card.Body>
        <Image src="https://picsum.photos/400/300" alt="Random" width={400} height={300} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>fit</Card.Header><Card.Body>
        <HStack gap={16}>
          {(["cover","contain","fill","scale-down"] as const).map(f => (
            <div key={f} style={{textAlign:"center"}}>
              <Image src="..." alt={f} width={150} height={150} fit={f} />
              <p>{f}</p>
            </div>
          ))}
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>radius</Card.Header><Card.Body>
        <HStack gap={16}>
          <Image src="..." alt="" width={120} height={120} radius={0} />
          <Image src="..." alt="" width={120} height={120} radius={12} />
          <Image src="..." alt="" width={120} height={120} radius="full" />
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>fallback</Card.Header><Card.Body>
        <Image src="https://broken-url.example.com/x.jpg" alt="broken" width={200} height={150} fallbackSrc="https://picsum.photos/200/150" />
        <Image src="https://broken-url.example.com/y.jpg" alt="broken2" width={200} height={150} fallback={<p>이미지 없음</p>} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>lazy</Card.Header><Card.Body>
        <p>스크롤 다운 시 로드</p>
        <div style={{height:1200}} />
        <Image src="..." alt="" lazy width={400} height={300} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>blur placeholder</Card.Header><Card.Body>
        <Image src="..." alt="" width={400} height={300} placeholder="blur" blurDataURL="data:image/jpeg;base64,..." />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>skeleton placeholder</Card.Header><Card.Body>
        <Image src="..." alt="" width={400} height={300} placeholder="skeleton" />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>useImageStatus 훅</Card.Header><Card.Body>
        <CustomImageRenderer src="..." />
      </Card.Body></Card.Root>
    </div>
  );
}

function CustomImageRenderer({ src }: { src: string }) {
  const status = useImageStatus(src);
  return <p>Status: {status}</p>;
}
```

---

## 5. 접근성

- alt 필수 (typescript에서도). 빈 문자열이면 장식으로 처리 (`alt=""`).
- 에러 fallback — alt 텍스트는 그대로 유지하지 않음 (fallback 컨텐츠 자체가 의미 표현).
- blur overlay — `aria-hidden="true"` (장식).

## 6. Edge cases

- **src 변경**: useEffect로 status 리셋.
- **fallbackSrc도 실패**: error 상태 → fallback ReactNode 또는 기본 아이콘.
- **lazy + IntersectionObserver 미지원**: native loading="lazy"가 fallback (대부분의 모던 브라우저 지원).
- **width/height 미지정**: intrinsic 사이즈 (CLS 위험 — 문서에 명시).
- **빈 src ("")**: status가 영구 loading. v1은 사용자 책임.
- **SSR**: useImageStatus는 useEffect 안 → 서버에서는 "loading" 그대로.

---

## 7. 구현 단계
- Phase 1: 컴포넌트 + 훅
- Phase 2: 데모
- Phase 3: 정리

## 8. 체크리스트
- [ ] 4개 파일
- [ ] typecheck/build
- [ ] 모든 fit / radius / placeholder
- [ ] fallback 작동
- [ ] lazy 작동 (스크롤 검증)
- [ ] candidates / README
