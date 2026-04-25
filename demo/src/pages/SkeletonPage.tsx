import { useEffect, useState, type ReactNode } from "react";
import { CodeView, Skeleton } from "plastic";

function Section({
  id,
  title,
  desc,
  children,
}: {
  id?: string;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {title}
      </p>
      {desc && <p className="text-sm text-gray-500 mb-3">{desc}</p>}
      {children}
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      {children}
    </div>
  );
}

function DarkCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="p-6 rounded-lg border"
      style={{ background: "#0b0c10", borderColor: "#23262d" }}
    >
      {children}
    </div>
  );
}

function SwapDemo() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, [loading]);
  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => setLoading(true)}
          className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
        >
          replay (1.5s)
        </button>
        <span className="text-xs text-gray-500">
          visible={String(loading)}
        </span>
      </div>
      <Skeleton.Card visible={loading} hasMedia hasAvatar lines={3}>
        <div>
          <img
            src="https://placehold.co/400x160/3b82f6/ffffff?text=Loaded"
            alt=""
            className="w-full h-40 object-cover rounded"
          />
          <div className="flex items-center gap-3 mt-3">
            <div className="w-10 h-10 rounded-full bg-blue-500" />
            <div>
              <p className="text-sm font-semibold">Real Title</p>
              <p className="text-xs text-gray-500">Loaded content body…</p>
            </div>
          </div>
        </div>
      </Skeleton.Card>
    </Card>
  );
}

const USAGE_BASIC = `import { Skeleton } from "plastic";

<Skeleton.Root shape="text" width={200} />
<Skeleton.Root shape="rect" width={160} height={80} />
<Skeleton.Root shape="circle" size={56} />`;

const USAGE_PRESETS = `<Skeleton.Text lines={3} />
<Skeleton.Avatar size={48} />
<Skeleton.Card hasMedia hasAvatar lines={2} />
<Skeleton.Table rows={5} cols={4} hasHeader />`;

const USAGE_SWAP = `<Skeleton.Card visible={isLoading} hasMedia lines={2}>
  <RealCard data={data} />
</Skeleton.Card>`;

export default function SkeletonPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Skeleton</h1>
        <p className="text-sm text-gray-500">
          로딩 플레이스홀더. shape 3종 + 프리셋 4종 + shimmer/pulse 애니메이션
          + prefers-reduced-motion 감지 + visible swap.
        </p>
      </header>

      <Section
        id="basic"
        title="Basic shapes"
        desc="Skeleton.Root 원자. shape=text / rect / circle."
      >
        <Card>
          <div className="flex gap-6 items-center">
            <Skeleton.Root shape="text" width={200} />
            <Skeleton.Root shape="rect" width={160} height={80} />
            <Skeleton.Root shape="circle" size={56} />
          </div>
        </Card>
      </Section>

      <Section
        id="text"
        title="Text multi-line"
        desc="lines / lastLineWidth / randomize."
      >
        <Card>
          <div className="space-y-6">
            <Skeleton.Text lines={3} />
            <Skeleton.Text lines={4} randomize seed={7} />
          </div>
        </Card>
      </Section>

      <Section id="avatar" title="Avatar" desc="circle / rounded / square 모양.">
        <Card>
          <div className="flex items-center gap-6">
            <Skeleton.Avatar size={32} shape="circle" />
            <Skeleton.Avatar size={48} shape="rounded" />
            <Skeleton.Avatar size={64} shape="square" />
          </div>
        </Card>
      </Section>

      <Section id="card" title="Card preset">
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton.Card hasMedia hasAvatar lines={3} />
            <Skeleton.Card hasMedia hasFooter lines={2} />
          </div>
        </Card>
      </Section>

      <Section id="table" title="Table preset">
        <Card>
          <Skeleton.Table rows={5} cols={4} hasHeader />
        </Card>
      </Section>

      <Section
        id="animation"
        title="Pulse vs Shimmer"
        desc="animation prop으로 스타일 전환."
      >
        <Card>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-2">shimmer (default)</p>
              <Skeleton.Root shape="rect" width="100%" height={60} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">pulse</p>
              <Skeleton.Root
                shape="rect"
                width="100%"
                height={60}
                animation="pulse"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">none</p>
              <Skeleton.Root
                shape="rect"
                width="100%"
                height={60}
                animation={false}
              />
            </div>
          </div>
        </Card>
      </Section>

      <Section
        id="dark"
        title="Dark"
        desc="theme='dark' — palette는 CSS 변수로 주입."
      >
        <DarkCard>
          <div className="space-y-4">
            <Skeleton.Text lines={3} theme="dark" />
            <Skeleton.Card hasMedia hasAvatar lines={2} theme="dark" />
          </div>
        </DarkCard>
      </Section>

      <Section
        id="swap"
        title="Swap to real content"
        desc="visible prop으로 스켈레톤↔실콘텐츠 페이드 전환."
      >
        <SwapDemo />
      </Section>

      <Section id="props" title="Props">
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase">
                <th className="py-2 pr-4">Prop</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-t border-gray-100">
                <td className="py-2 pr-4 font-mono">shape</td>
                <td className="py-2 pr-4 font-mono">"text" | "rect" | "circle"</td>
                <td className="py-2">Skeleton.Root 모양.</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-2 pr-4 font-mono">animation</td>
                <td className="py-2 pr-4 font-mono">"shimmer" | "pulse" | false</td>
                <td className="py-2">prefers-reduced-motion이 켜져 있으면 자동으로 정적.</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-2 pr-4 font-mono">visible</td>
                <td className="py-2 pr-4 font-mono">boolean</td>
                <td className="py-2">false 시 children으로 fade swap.</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-2 pr-4 font-mono">fadeMs</td>
                <td className="py-2 pr-4 font-mono">number</td>
                <td className="py-2">swap 페이드 지속시간 (default 200).</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-2 pr-4 font-mono">theme</td>
                <td className="py-2 pr-4 font-mono">"light" | "dark"</td>
                <td className="py-2">CSS 변수 팔레트.</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </Section>

      <Section id="usage" title="Usage">
        <div className="space-y-4">
          <Card>
            <p className="text-xs text-gray-500 mb-2">Basic shapes</p>
            <CodeView
              code={USAGE_BASIC}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-2">Presets</p>
            <CodeView
              code={USAGE_PRESETS}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-2">Swap to real content</p>
            <CodeView
              code={USAGE_SWAP}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
        </div>
      </Section>
    </div>
  );
}
