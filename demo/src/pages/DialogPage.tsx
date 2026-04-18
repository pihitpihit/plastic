import { Button, Dialog } from "plastic";
import type { DialogSize } from "plastic";

function Section({
  id,
  title,
  desc,
  children,
}: {
  id?: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200 flex flex-wrap gap-3">
      {children}
    </div>
  );
}

function BasicDemo() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button>기본 다이얼로그 열기</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content size="md">
          <Dialog.Header>
            <Dialog.Title>기본 다이얼로그</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Body>
            <Dialog.Description>
              이것은 기본 다이얼로그입니다. Overlay 클릭 또는 Escape 키로 닫을 수 있습니다.
            </Dialog.Description>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close asChild>
              <Button variant="ghost">취소</Button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Button>확인</Button>
            </Dialog.Close>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SizeDemo({ size }: { size: DialogSize }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="sm" variant="secondary">{size}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content size={size}>
          <Dialog.Header>
            <Dialog.Title>Size: {size}</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Body>
            <Dialog.Description>
              이 다이얼로그는 <code>size="{size}"</code>로 설정되었습니다.
            </Dialog.Description>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close asChild>
              <Button>닫기</Button>
            </Dialog.Close>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DialogPage() {
  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Dialog</h1>
        <p className="text-sm text-gray-500 mt-1">
          접근성을 갖춘 모달 다이얼로그. 포커스 트랩, 스크롤 잠금, 키보드/포인터 인터랙션 포함.
        </p>
      </header>

      <Section id="basic" title="Basic">
        <Card>
          <BasicDemo />
        </Card>
      </Section>

      <Section id="sizes" title="Sizes" desc="sm · md · lg · xl · full">
        <Card>
          {(["sm", "md", "lg", "xl", "full"] as const).map((s) => (
            <SizeDemo key={s} size={s} />
          ))}
        </Card>
      </Section>
    </div>
  );
}
