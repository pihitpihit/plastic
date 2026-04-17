import { Card, Button, CodeView } from "plastic";

const USAGE_CODE = `import { Card } from "plastic";

// 전체 구성
<Card.Root>
  <Card.Header>Card Title</Card.Header>
  <Card.Body>
    Card content goes here.
  </Card.Body>
  <Card.Footer>
    <Button size="sm">Confirm</Button>
    <Button size="sm" variant="ghost">Cancel</Button>
  </Card.Footer>
</Card.Root>

// 필요한 서브 컴포넌트만 사용 가능
<Card.Root>
  <Card.Body>Body only card</Card.Body>
</Card.Root>`;

export function CardPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Card</h1>
        <p className="text-gray-500 mt-1">
          Compound 컴포넌트 패턴의 카드입니다.{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Card.Root</code>,{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Card.Header</code>,{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Card.Body</code>,{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Card.Footer</code>를{" "}
          조합해서 사용합니다.
        </p>
      </div>

      <section id="full-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Full Card
        </p>
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <Card.Root className="max-w-sm">
            <Card.Header>Card Title</Card.Header>
            <Card.Body>
              <p className="text-sm text-gray-600">
                This is the card body. You can put any content here — text,
                images, forms, and more.
              </p>
            </Card.Body>
            <Card.Footer>
              <div className="flex gap-2">
                <Button size="sm">Confirm</Button>
                <Button size="sm" variant="ghost">
                  Cancel
                </Button>
              </div>
            </Card.Footer>
          </Card.Root>
        </div>
      </section>

      <section id="body-only">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Body Only
        </p>
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <Card.Root className="max-w-sm">
            <Card.Body>
              <p className="text-sm text-gray-600">
                서브 컴포넌트는 필요한 것만 골라 사용할 수 있습니다.
              </p>
            </Card.Body>
          </Card.Root>
        </div>
      </section>

      <section id="header-body">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Header + Body
        </p>
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <Card.Root className="max-w-sm">
            <Card.Header>Settings</Card.Header>
            <Card.Body>
              <p className="text-sm text-gray-600">
                푸터 없이 헤더 + 바디 구성도 가능합니다.
              </p>
            </Card.Body>
          </Card.Root>
        </div>
      </section>

      <section id="usage">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Usage
        </p>
        <CodeView code={USAGE_CODE} language="tsx" showAlternatingRows={false} />
      </section>
    </div>
  );
}
