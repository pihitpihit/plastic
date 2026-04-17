import { useState, useCallback } from "react";
import { Actionable, CodeView } from "plastic";
import type { ActionableAction, ActionableTrigger, ActionableTheme, DismissAnimation } from "plastic";

// ── 공통 아이콘 (SVG inline) ─────────────────────────────────────────────

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const MoreIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

// ── 샘플 데이터 ──────────────────────────────────────────────────────────

interface Item {
  id: number;
  title: string;
  desc: string;
}

const INITIAL_ITEMS: Item[] = [
  { id: 1, title: "프로젝트 킥오프 미팅", desc: "10:00 AM — 회의실 B" },
  { id: 2, title: "디자인 리뷰", desc: "2:00 PM — 온라인" },
  { id: 3, title: "코드 리뷰 PR #42", desc: "3:30 PM — Slack" },
  { id: 4, title: "배포 준비", desc: "5:00 PM — CI/CD" },
];

// ── 아이템 카드 ──────────────────────────────────────────────────────────

function ItemCard({ item, theme }: { item: Item; theme: ActionableTheme }) {
  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        borderBottom: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        background: theme === "dark" ? "#1f2937" : "#ffffff",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: theme === "dark" ? "#f3f4f6" : "#111827" }}>
        {item.title}
      </div>
      <div style={{ fontSize: "0.75rem", color: theme === "dark" ? "#9ca3af" : "#6b7280", marginTop: "0.15rem" }}>
        {item.desc}
      </div>
    </div>
  );
}

// ── 리스트 래퍼 ──────────────────────────────────────────────────────────

function ListWrapper({ children, theme }: { children: React.ReactNode; theme: ActionableTheme }) {
  return (
    <div
      style={{
        borderRadius: "0.5rem",
        border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        overflow: "hidden",
        background: theme === "dark" ? "#111827" : "#ffffff",
      }}
    >
      {children}
    </div>
  );
}

// ── 복원 버튼 ────────────────────────────────────────────────────────────

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
    >
      초기화
    </button>
  );
}

// ── 섹션 헬퍼 ────────────────────────────────────────────────────────────

function Section({ id, title, desc, children }: { id?: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      {desc && <p className="text-sm text-gray-500 mb-3">{desc}</p>}
      {children}
    </section>
  );
}

// ── 각 Trigger 데모 ──────────────────────────────────────────────────────

function IconDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const remove = useCallback((id: number) => setItems((p) => p.filter((i) => i.id !== id)), []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end"><ResetButton onClick={() => setItems(INITIAL_ITEMS)} /></div>
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="icon"
            theme={theme}
            iconShowOnHover
            dismissAnimation="slide-left"
            actions={[
              { key: "edit", label: "편집", icon: <EditIcon />, onClick: () => alert(`편집: ${item.title}`) },
              { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: () => {} },
            ]}
            onDismiss={(k) => k === "delete" && remove(item.id)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
        {items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
            모든 항목이 삭제되었습니다
          </div>
        )}
      </ListWrapper>
    </div>
  );
}

function IconConfirmDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const remove = useCallback((id: number) => setItems((p) => p.filter((i) => i.id !== id)), []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end"><ResetButton onClick={() => setItems(INITIAL_ITEMS)} /></div>
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="icon-confirm"
            theme={theme}
            confirmTimeout={3000}
            dismissAnimation="collapse"
            actions={[
              { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", confirm: "정말 삭제?", onClick: () => {} },
            ]}
            onDismiss={() => remove(item.id)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
        {items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
            모든 항목이 삭제되었습니다
          </div>
        )}
      </ListWrapper>
    </div>
  );
}

function SwipeDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const remove = useCallback((id: number) => setItems((p) => p.filter((i) => i.id !== id)), []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end"><ResetButton onClick={() => setItems(INITIAL_ITEMS)} /></div>
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="swipe"
            theme={theme}
            swipeThreshold={80}
            dismissAnimation="slide-left"
            actions={[
              { key: "pin", label: "고정", icon: <PinIcon />, onClick: () => alert(`고정: ${item.title}`) },
              { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: () => {} },
            ]}
            onDismiss={(k) => k === "delete" && remove(item.id)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
        {items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
            모든 항목이 삭제되었습니다
          </div>
        )}
      </ListWrapper>
    </div>
  );
}

function FadeDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS.slice(0, 3));
  const remove = useCallback((id: number) => setItems((p) => p.filter((i) => i.id !== id)), []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end"><ResetButton onClick={() => setItems(INITIAL_ITEMS.slice(0, 3))} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="fade"
            theme={theme}
            fadePosition="top"
            fadeDuration={200}
            dismissAnimation="fade"
            actions={[
              { key: "share", label: "공유", icon: <ShareIcon />, onClick: () => alert(`공유: ${item.title}`) },
              { key: "edit", label: "편집", icon: <EditIcon />, onClick: () => alert(`편집: ${item.title}`) },
              { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: () => {} },
            ]}
            onDismiss={(k) => k === "delete" && remove(item.id)}
          >
            <div
              style={{
                padding: "1.25rem 1rem",
                borderRadius: "0.5rem",
                border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                background: theme === "dark" ? "#1f2937" : "#ffffff",
                minHeight: "80px",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: theme === "dark" ? "#f3f4f6" : "#111827" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: theme === "dark" ? "#9ca3af" : "#6b7280", marginTop: "0.25rem" }}>
                {item.desc}
              </div>
            </div>
          </Actionable>
        ))}
      </div>
    </div>
  );
}

function CheckboxDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number, sel: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (sel) next.add(id); else next.delete(id);
      return next;
    });
  };

  const deleteSelected = () => {
    setItems((p) => p.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {selectedIds.size > 0 ? `${selectedIds.size}개 선택됨` : "항목을 선택하세요"}
        </span>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={deleteSelected}
              className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              선택 삭제
            </button>
          )}
          <ResetButton onClick={() => { setItems(INITIAL_ITEMS); setSelectedIds(new Set()); }} />
        </div>
      </div>
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="checkbox"
            theme={theme}
            actions={[]}
            selected={selectedIds.has(item.id)}
            onSelectedChange={(sel) => toggleSelect(item.id, sel)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
        {items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
            모든 항목이 삭제되었습니다
          </div>
        )}
      </ListWrapper>
    </div>
  );
}

function DragOutDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const remove = useCallback((id: number) => setItems((p) => p.filter((i) => i.id !== id)), []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end"><ResetButton onClick={() => setItems(INITIAL_ITEMS)} /></div>
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="drag-out"
            theme={theme}
            dragThreshold={100}
            dragZoneLabel="놓으면 삭제"
            dismissAnimation="fade"
            actions={[
              { key: "delete", label: "삭제", variant: "danger", onClick: () => {} },
            ]}
            onDismiss={() => remove(item.id)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
        {items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
            모든 항목이 삭제되었습니다
          </div>
        )}
      </ListWrapper>
    </div>
  );
}

// ── Reveal 데모 (2단계 삭제) ─────────────────────────────────────────────

function RevealDeleteDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const remove = useCallback((id: number) => setItems((p) => p.filter((i) => i.id !== id)), []);

  return (
    <div className="space-y-2">
      <div className="flex justify-end"><ResetButton onClick={() => setItems(INITIAL_ITEMS)} /></div>
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="reveal"
            theme={theme}
            dismissAnimation="slide-left"
            actions={[
              { key: "delete", label: "삭제 확인", icon: <TrashIcon />, variant: "danger", onClick: () => {} },
            ]}
            onDismiss={() => remove(item.id)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
        {items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
            모든 항목이 삭제되었습니다
          </div>
        )}
      </ListWrapper>
    </div>
  );
}

// ── Reveal 데모 (멀티 액션 + 방향) ──────────────────────────────────────

function RevealMultiDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const remove = useCallback((id: number) => setItems((p) => p.filter((i) => i.id !== id)), []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(["left", "right"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                direction === d ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <ResetButton onClick={() => setItems(INITIAL_ITEMS)} />
      </div>
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="reveal"
            theme={theme}
            revealDirection={direction}
            revealTriggerRender={() => <MoreIcon />}
            dismissAnimation="slide-left"
            actions={[
              { key: "edit", label: "편집", icon: <EditIcon />, onClick: () => alert(`편집: ${item.title}`) },
              { key: "share", label: "공유", icon: <ShareIcon />, onClick: () => alert(`공유: ${item.title}`) },
              { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: () => {} },
            ]}
            onDismiss={(k) => k === "delete" && remove(item.id)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
        {items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
            모든 항목이 삭제되었습니다
          </div>
        )}
      </ListWrapper>
    </div>
  );
}

// ── Dismiss Animation 비교 ───────────────────────────────────────────────

function DismissDemo({ theme }: { theme: ActionableTheme }) {
  const animations: DismissAnimation[] = ["slide-left", "slide-right", "fade", "collapse"];
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(animations.map((a) => [a, true])),
  );
  const resetAll = () => setVisible(Object.fromEntries(animations.map((a) => [a, true])));

  return (
    <div className="space-y-2">
      <div className="flex justify-end"><ResetButton onClick={resetAll} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
        {animations.map((anim) =>
          visible[anim] ? (
            <Actionable
              key={anim}
              trigger="icon"
              theme={theme}
              dismissAnimation={anim}
              actions={[
                { key: "dismiss", label: anim, icon: <TrashIcon />, variant: "danger", onClick: () => {} },
              ]}
              onDismiss={() => setVisible((p) => ({ ...p, [anim]: false }))}
            >
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                  background: theme === "dark" ? "#1f2937" : "#ffffff",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: theme === "dark" ? "#f3f4f6" : "#111827" }}>
                  {anim}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.15rem" }}>
                  X 버튼으로 dismiss
                </div>
              </div>
            </Actionable>
          ) : (
            <div
              key={anim}
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                border: `1px dashed ${theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                textAlign: "center",
                color: "#9ca3af",
                fontSize: "0.75rem",
              }}
            >
              dismissed
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ── Usage 코드 ───────────────────────────────────────────────────────────

const USAGE_CODE = `import { Actionable } from "plastic";

// Swipe to reveal actions
<Actionable
  trigger="swipe"
  actions={[
    { key: "edit", label: "편집", icon: <EditIcon />, onClick: handleEdit },
    { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: handleDelete },
  ]}
  dismissAnimation="slide-left"
  onDismiss={(actionKey) => removeItem(id)}
>
  <MyListItem />
</Actionable>

// Icon with 2-step confirm
<Actionable
  trigger="icon-confirm"
  actions={[
    { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", confirm: "정말 삭제?", onClick: handleDelete },
  ]}
  onDismiss={() => removeItem(id)}
>
  <MyCard />
</Actionable>

// Reveal: 2-stage delete
<Actionable
  trigger="reveal"
  actions={[
    { key: "delete", label: "삭제 확인", icon: <TrashIcon />, variant: "danger", onClick: handleDelete },
  ]}
  onDismiss={() => removeItem(id)}
>
  <MyListItem />
</Actionable>

// Reveal: multi-action with custom trigger
<Actionable
  trigger="reveal"
  revealDirection="right"
  revealTriggerRender={() => <MoreIcon />}
  actions={[
    { key: "edit", label: "편집", icon: <EditIcon />, onClick: handleEdit },
    { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: handleDelete },
  ]}
>
  <MyListItem />
</Actionable>`;

// ── Props 테이블 ─────────────────────────────────────────────────────────

const PROPS_COMMON = [
  ["children", "ReactNode", "—", "감쌀 콘텐츠 (필수)"],
  ["actions", "ActionableAction[]", "—", "액션 정의 배열 (필수)"],
  ["trigger", "ActionableTrigger", "—", "액션 노출 방식 (필수)"],
  ["theme", '"light" | "dark"', '"light"', "색상 테마"],
  ["dismissAnimation", '"slide-left" | "slide-right" | "fade" | "collapse" | "none"', '"collapse"', "dismiss 애니메이션"],
  ["dismissDuration", "number", "300", "dismiss 애니메이션 지속 시간 (ms)"],
  ["onDismiss", "(actionKey: string) => void", "—", "dismiss 완료 콜백"],
  ["onAction", "(actionKey: string) => void | false", "—", "액션 실행 시 콜백. false 반환 시 dismiss 방지"],
  ["disabled", "boolean", "false", "전체 비활성화"],
];

const PROPS_ACTION = [
  ["key", "string", "—", "React key + 식별자 (필수)"],
  ["label", "string", "—", "접근성 라벨, 툴팁 (필수)"],
  ["icon", "ReactNode", "—", "버튼 아이콘"],
  ["variant", '"default" | "danger" | "warning"', '"default"', "색상 프리셋"],
  ["confirm", "boolean | string", "—", "icon-confirm 용 2단계 확인"],
  ["onClick", "() => void | Promise<void>", "—", "액션 실행 함수 (필수)"],
  ["disabled", "boolean", "—", "개별 버튼 비활성화"],
  ["style", "CSSProperties", "—", "개별 버튼 커스텀 스타일"],
];

const PROPS_ICON = [
  ["iconPosition", '"top-right" | "top-left" | "bottom-right" | "bottom-left"', '"top-right"', "아이콘 버튼 위치"],
  ["iconShowOnHover", "boolean", "false", "hover/focus 시에만 버튼 표시"],
  ["confirmTimeout", "number", "3000", "confirm 자동 원복 시간 (ms)"],
  ["confirmingAction", "string | null", "—", "controlled confirm 상태"],
  ["onConfirmChange", "(key: string | null) => void", "—", "confirm 상태 변경 콜백"],
];

const PROPS_SWIPE = [
  ["swipeOpen", "boolean", "—", "controlled 패널 열림 상태"],
  ["onSwipeOpenChange", "(open: boolean) => void", "—", "패널 열림 변경 콜백"],
  ["swipeThreshold", "number", "80", "snap open 기준 거리 (px)"],
  ["swipeDirection", '"left" | "right"', '"left"', "스와이프 방향"],
];

const PROPS_CHECKBOX = [
  ["selected", "boolean", "—", "controlled 선택 상태"],
  ["defaultSelected", "boolean", "false", "초기 선택 상태 (uncontrolled)"],
  ["onSelectedChange", "(selected: boolean) => void", "—", "선택 변경 콜백"],
  ["checkboxPosition", '"left" | "right"', '"left"', "체크박스 위치"],
];

const PROPS_DRAGOUT = [
  ["dragThreshold", "number", "100", "실행 기준 드래그 거리 (px)"],
  ["onDragThreshold", "(crossed: boolean) => void", "—", "threshold 경계 통과 콜백"],
  ["dragZoneLabel", "string", "—", "drop zone 표시 라벨"],
];

const PROPS_FADE = [
  ["fadeDuration", "number", "200", "페이드 전환 시간 (ms)"],
  ["fadePosition", '"top" | "bottom" | "center"', '"top"', "오버레이 위치"],
];

const PROPS_REVEAL = [
  ["revealOpen", "boolean", "—", "controlled 패널 열림 상태"],
  ["onRevealOpenChange", "(open: boolean) => void", "—", "패널 열림 변경 콜백"],
  ["revealDirection", '"left" | "right"', '"right"', "오버레이 및 패널 위치"],
  ["revealTriggerIndex", "number", "0", "오버레이 트리거로 사용할 액션 인덱스"],
  ["revealTriggerRender", "(action) => ReactNode", "—", "커스텀 오버레이 트리거 렌더"],
  ["revealOverlayWidth", "number", "40", "오버레이 트리거 버튼 너비 (px)"],
  ["revealPanelWidth", "number", "auto", "고정 패널 너비 (미지정 시 자동 측정)"],
  ["revealAnimationDuration", "number", "250", "애니메이션 지속 시간 (ms)"],
];

function PropsTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 mb-1.5">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Prop", "Type", "Default", "Description"].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(([prop, type, def, desc]) => (
              <tr key={prop}>
                <td className="px-4 py-2 font-mono text-xs text-blue-700">{prop}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{type}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-400">{def}</td>
                <td className="px-4 py-2 text-gray-600">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reveal Playground ────────────────────────────────────────────────────

function RevealPlayground({ theme }: { theme: ActionableTheme }) {
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [overlayWidth, setOverlayWidth] = useState(40);
  const [animDuration, setAnimDuration] = useState(250);
  const [triggerIndex, setTriggerIndex] = useState(0);
  const [useCustomTrigger, setUseCustomTrigger] = useState(false);
  const [dismissAnim, setDismissAnim] = useState<DismissAnimation>("collapse");
  const [isDisabled, setIsDisabled] = useState(false);
  const [useCustomStyle, setUseCustomStyle] = useState(false);
  const [items, setItems] = useState(INITIAL_ITEMS);
  const remove = useCallback((id: number) => setItems((p) => p.filter((i) => i.id !== id)), []);

  const actions: ActionableAction[] = [
    {
      key: "edit", label: "편집", icon: <EditIcon />, onClick: () => alert("편집"),
      ...(useCustomStyle ? { style: { background: "#7c3aed", color: "#fff", borderRadius: 0, flex: 1, height: "auto", margin: 0 } } : {}),
    },
    {
      key: "share", label: "공유", icon: <ShareIcon />, onClick: () => alert("공유"),
      ...(useCustomStyle ? { style: { background: "#0891b2", color: "#fff", borderRadius: 0, flex: 1, height: "auto", margin: 0 } } : {}),
    },
    {
      key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: () => {},
      ...(useCustomStyle ? { style: { background: "#dc2626", color: "#fff", borderRadius: 0, flex: 1, height: "auto", margin: 0 } } : {}),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-gray-600 w-36 shrink-0">revealDirection</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "left" | "right")}
            className="border rounded px-2 py-0.5 text-xs"
          >
            <option value="right">right</option>
            <option value="left">left</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-600 w-36 shrink-0">overlayWidth</span>
          <input
            type="range"
            min={24}
            max={80}
            value={overlayWidth}
            onChange={(e) => setOverlayWidth(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-400 w-8">{overlayWidth}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-600 w-36 shrink-0">animationDuration</span>
          <input
            type="range"
            min={100}
            max={800}
            step={50}
            value={animDuration}
            onChange={(e) => setAnimDuration(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-400 w-8">{animDuration}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-600 w-36 shrink-0">triggerIndex</span>
          <select
            value={triggerIndex}
            onChange={(e) => setTriggerIndex(Number(e.target.value))}
            className="border rounded px-2 py-0.5 text-xs"
          >
            {actions.map((a, i) => (
              <option key={a.key} value={i}>
                {i}: {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-600 w-36 shrink-0">customTrigger</span>
          <input
            type="checkbox"
            checked={useCustomTrigger}
            onChange={(e) => setUseCustomTrigger(e.target.checked)}
          />
          <span className="text-xs text-gray-400">revealTriggerRender</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-600 w-36 shrink-0">dismissAnimation</span>
          <select
            value={dismissAnim}
            onChange={(e) => setDismissAnim(e.target.value as DismissAnimation)}
            className="border rounded px-2 py-0.5 text-xs"
          >
            {(["collapse", "slide-left", "slide-right", "fade", "none"] as const).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-600 w-36 shrink-0">disabled</span>
          <input
            type="checkbox"
            checked={isDisabled}
            onChange={(e) => setIsDisabled(e.target.checked)}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-600 w-36 shrink-0">action.style</span>
          <input
            type="checkbox"
            checked={useCustomStyle}
            onChange={(e) => setUseCustomStyle(e.target.checked)}
          />
          <span className="text-xs text-gray-400">커스텀 버튼 스타일</span>
        </label>
      </div>

      <div className="flex justify-end">
        <ResetButton onClick={() => setItems(INITIAL_ITEMS)} />
      </div>
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="reveal"
            theme={theme}
            revealDirection={direction}
            revealOverlayWidth={overlayWidth}
            revealAnimationDuration={animDuration}
            revealTriggerIndex={triggerIndex}
            revealTriggerRender={useCustomTrigger ? () => <MoreIcon /> : undefined}
            dismissAnimation={dismissAnim}
            disabled={isDisabled}
            actions={actions}
            onDismiss={(k) => k === "delete" && remove(item.id)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
        {items.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
            모든 항목이 삭제되었습니다
          </div>
        )}
      </ListWrapper>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────

export function ActionablePage() {
  const [theme, setTheme] = useState<ActionableTheme>("light");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Actionable</h1>
        <p className="text-gray-500 mt-1">
          임의의 콘텐츠를 감싸서 사용자 정의 액션 버튼의 노출 방식과 애니메이션을 제공하는 래퍼 컴포넌트.
          삭제뿐 아니라 편집·공유·고정 등 다양한 액션을 지원합니다.
        </p>
      </div>

      <div className="flex gap-1.5">
        {(["light", "dark"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              theme === t ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <Section id="icon-trigger" title="Icon Trigger" desc="hover 시 아이콘 버튼 표시. 클릭 → 즉시 실행.">
        <IconDemo theme={theme} />
      </Section>

      <Section id="icon-confirm" title="Icon Confirm" desc="첫 클릭 → 확인 상태 전환, 재클릭 시 실행. 3초 후 자동 원복.">
        <IconConfirmDemo theme={theme} />
      </Section>

      <Section id="swipe" title="Swipe" desc="좌로 스와이프하여 액션 패널 노출. 마우스 드래그도 지원.">
        <SwipeDemo theme={theme} />
      </Section>

      <Section id="fade" title="Fade" desc="hover/focus 시 반투명 오버레이와 액션 툴바가 페이드인.">
        <FadeDemo theme={theme} />
      </Section>

      <Section id="checkbox" title="Checkbox" desc="체크박스로 다중 선택 후 상단 툴바에서 일괄 액션.">
        <CheckboxDemo theme={theme} />
      </Section>

      <Section id="drag-out" title="Drag-out" desc="항목을 영역 밖으로 드래그하면 삭제. 시각적 피드백 제공.">
        <DragOutDemo theme={theme} />
      </Section>

      <Section id="reveal-delete" title="Reveal (2단계 삭제)" desc="hover → 삭제 아이콘 오버레이 → 클릭 → 삭제 확인 버튼 패널.">
        <RevealDeleteDemo theme={theme} />
      </Section>

      <Section id="reveal-multi" title="Reveal (멀티 액션)" desc="커스텀 '...' 오버레이 + 다중 액션 패널. 방향 토글 가능.">
        <RevealMultiDemo theme={theme} />
      </Section>

      <Section id="dismiss-animations" title="Dismiss Animations" desc="4가지 dismiss 애니메이션 비교.">
        <DismissDemo theme={theme} />
      </Section>

      <Section id="props" title="Props">
        <PropsTable title="Common" rows={PROPS_COMMON} />
        <PropsTable title="ActionableAction" rows={PROPS_ACTION} />
        <PropsTable title="Icon / Icon-confirm" rows={PROPS_ICON} />
        <PropsTable title="Swipe" rows={PROPS_SWIPE} />
        <PropsTable title="Checkbox" rows={PROPS_CHECKBOX} />
        <PropsTable title="Drag-out" rows={PROPS_DRAGOUT} />
        <PropsTable title="Fade" rows={PROPS_FADE} />
        <PropsTable title="Reveal" rows={PROPS_REVEAL} />
      </Section>

      <Section id="usage" title="Usage">
        <CodeView code={USAGE_CODE} language="tsx" showAlternatingRows={false} />
      </Section>

      <Section id="playground" title="Playground" desc="모든 reveal props를 실시간 조작.">
        <RevealPlayground theme={theme} />
      </Section>
    </div>
  );
}
