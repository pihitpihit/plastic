# Component Candidates

이 문서는 컴포넌트 후보를 추적합니다. plan 문서가 작성되면 `Plan 작성 완료` 섹션으로 이동하고, 구현이 완료되면 `docs/plans/complete/`로 이동합니다.

---

## 상태 표기

| 상태 | 의미 |
|---|---|
| Plan 작성 완료 | `docs/plans/NNN-*.md` 작성됨, 구현 대기 |
| 잠정 후보 | 진행 의사 표시됨, plan 문서 작성 대기 |
| 검토 대상 | 후보로 거론되었으나 아직 결정 보류 |
| 후순위 | 가치는 인정되나 우선순위 낮음, 나중 라운드 검토 |
| 드롭 | 명시적으로 진행 안 하기로 결정 |

---

## Plan 작성 완료 (Plan Documents Written)

의존 순서 기반으로 023~039 번호 배정.

### Tier 0 — 인프라 / 추출
| # | 컴포넌트 | Plan 문서 |
|---|---|---|
| 023 | `Icon` + `IconRegistry` (foundation) | [023-icon-component.md](plans/023-icon-component.md) |
| 024 | `LineNumbers` (CodeView 추출) | [024-linenumbers-component.md](plans/024-linenumbers-component.md) |
| 025 | `Calendar` (DatePicker 추출) | [025-calendar-component.md](plans/025-calendar-component.md) |
| 026 | `CopyButton` + `useCopyToClipboard` (HexView 마이그레이션 포함) | [026-copybutton-component.md](plans/026-copybutton-component.md) |

### Tier 1 — 독립 primitive
| # | 컴포넌트 | Plan 문서 |
|---|---|---|
| 027 | `Tag` / `Chip` | [027-tag-component.md](plans/027-tag-component.md) |
| 028 | `NumberInput` | [028-numberinput-component.md](plans/028-numberinput-component.md) |
| 029 | `Stack` / `HStack` / `VStack` / `Grid` | [029-stack-grid-component.md](plans/029-stack-grid-component.md) |
| 030 | `FileUpload` / `Dropzone` | [030-fileupload-component.md](plans/030-fileupload-component.md) |
| 031 | `Image` | [031-image-component.md](plans/031-image-component.md) |
| 032 | `ConfirmInline` | [032-confirminline-component.md](plans/032-confirminline-component.md) |
| 033 | `ErrorBoundary` wrapper | [033-errorboundary-component.md](plans/033-errorboundary-component.md) |
| 034 | `SmartSearch` | [034-smartsearch-component.md](plans/034-smartsearch-component.md) |
| 035 | `QRCode` | [035-qrcode-component.md](plans/035-qrcode-component.md) |
| 036 | `Changelog` | [036-changelog-component.md](plans/036-changelog-component.md) |

### Tier 2 — severity 의존
| # | 컴포넌트 | Plan 문서 |
|---|---|---|
| 037 | `Alert` (Phase 0: `_shared/severity.ts` 추출 포함) | [037-alert-component.md](plans/037-alert-component.md) |
| 038 | `Banner` | [038-banner-component.md](plans/038-banner-component.md) |

### Tier 3 — 다른 후보 의존
| # | 컴포넌트 | Plan 문서 |
|---|---|---|
| 039 | `Sidebar` + `Header` + `Footer` (AppShell parts) | [039-appshell-parts-component.md](plans/039-appshell-parts-component.md) |

---

## 잠정 후보 (Tentative Candidates)

(없음 — 17개 모두 plan 작성 완료)

---

## 횡단 추상 (Cross-cutting Abstractions)

### `_shared/severity.ts` — 심각도 토큰
plan 037 Phase 0에서 추출 예정. 알림류 컴포넌트(Toast / Alert / Banner / InlineMessage / Field error / ConfirmDialog destructive 등) 전반을 가로지르는 횡단 추상.

#### severity가 담는 것
| 측면 | 내용 |
|---|---|
| **레벨** | `success` / `error` / `warning` / `info` / `default` (필요 시 `critical` 추가) |
| **색상 팔레트** | 배경·테두리·전경·아이콘 색 (light/dark 테마별) |
| **기본 아이콘** | 체크/엑스/느낌표/i — 레벨에 매핑 |
| **ARIA 시맨틱** | `error`/`warning` → `role="alert"`/`aria-live="assertive"`, `info`/`success` → `role="status"`/`aria-live="polite"` |

#### 추출 시 효과
1. **색·아이콘·접근성 정책 한 곳에서 관리** — 토큰 변경이 모든 알림 컴포넌트에 즉시 전파.
2. **새 컴포넌트 진입 장벽 낮음** — 알림류 신설 시 토큰 import만으로 시각·접근성 일관 보장.
3. **테마 전환 일관성** — light↔dark 매핑이 단일 파일.

#### 함정
- severity ≠ 모든 색상 시맨틱.
  - **brand color**(primary/secondary), **카테고리 컬러**(예: 사용자 태그 색)는 severity와 **분리**되어야 함.
  - severity는 "**상태/의미** 색상"이지 "**시각 강조** 색상"이 아님.
  - Button의 primary는 brand 영역, severity 아님.

#### 수반되는 부품 추출 (강도 2 패턴 — plan 037 Phase 0)
```
_shared/severity.ts             ← 토큰 (palette + icon mapping)
_shared/SeverityIcon.tsx        ← severity → 아이콘 자동 매핑 컴포넌트
_shared/DismissButton.tsx       ← X 버튼 (Toast·Banner·Alert·Dialog 공유)
```
- Banner·Alert는 외곽 컨테이너 + 내부 레이아웃만 자기가 작성, 부품은 공유.
- Toast가 plan 037 Phase 0에서 동시 마이그레이션됨.

---

## 검토 대상 (Discussed, Not Yet Adopted)

이전 라운드에서 거론되었으나 잠정 후보로 채택되지 않은 것들. 향후 라운드에서 재검토 가능.

### 폼 입력
- `TextField` / `TextArea` / `Checkbox` / `Radio` / `Switch` / `Slider` (폼 기본 4~6종) — 라이브러리 사용 범위를 가장 크게 넓히는 묶음. 채택 시 `Field` / `Form` 컴포지션 계층과 함께 가는 게 자연스러움.
- `Field` — label + control + helper + error + required 마커 wrapper.
- `Form` — validation context + submit 핸들링.
- `SegmentedControl` — pill 형태 단일값 선택.
- `ButtonGroup` — Button들을 한 덩어리로 시각적 결합.
- `SearchInput` — 검색 아이콘 + clear + debounce.
- `MultiSelect` — Select의 다중 변형.
- `ColorPicker` — 색 swatch + hex/rgb 입력.
- `PasswordInput` — show/hide 토글 + caps lock 경고.
- `ToggleGroup` — pill 토글 모음, 단일/다중.
- `RangeSlider` — 두 thumb (min/max).
- `MaskedInput` — 전화번호/카드/날짜 포맷 마스크.
- `OtpInput` / `PinInput` — 숫자 칸 N개, 자동 다음 칸 이동.
- `Editable` — 텍스트 클릭 시 인라인 편집.
- `FieldArray` — 반복 필드.
- `ConditionalField` — 조건부 표시 필드.
- `UnsavedChanges` 경고 + `AutoSave` 인디케이터.
- `WordCount` / `MaxLengthIndicator`.
- `AutoExpand` textarea.

### 표시 / 데이터
- `Avatar` + `AvatarGroup` — 이미지/이니셜/fallback, AvatarGroup은 max 처리.
- `Spinner` — 로딩 인디케이터 (Skeleton과 보완).
- `Badge` — 카운트/라벨.
- `EmptyState` — "데이터 없음" 일러스트 + 메시지 + 액션.
- `Stat` / `Metric` — 큰 숫자 + 라벨 + 추세.
- `KeyValueList` / `DescriptionList` — 단일 record의 필드 나열.
- `InlineCode` — `<code>` 인라인.
- `Markdown` — md → React.
- `Highlight` / `Mark` — 검색 매치 강조.
- `Truncate` / `Ellipsis` — 긴 텍스트 + 옵션 Tooltip.
- `Number` / `Duration` / `UnitDisplay` / `TimeAgo` — 표시 포맷터 묶음.
- `Sparkline` — 셀 사이즈 미니 차트.
- `Heatmap` — GitHub 활동 그리드 스타일.
- `Status` indicator — 생사 도트/필.
- `Pulse` — 활성/실시간 펄스.
- `Inspector` / `PropertyGrid` — IDE 인스펙터.
- `KeyValueEditor` — KEY=VALUE 행 편집.
- `OperationLog` — 최근 작업 + 상태.

### 레이아웃 / 네비
- `AspectRatio` — 비율 고정.
- `Container` — max-width centered.
- `Box` — 단일 styled div.
- `Center` / `Spacer` — flex micro 유틸.
- `Sticky` / `StickyContainer` — sticky 포지셔닝 helper.
- `ScrollArea` — 커스텀 스크롤바 (현재 우선순위 낮음, 가시 문제 발생 시 도입).
- `AppShell` — 사이드바 + 헤더 + 컨텐츠 grid (plan 039의 부품들이 들어감).
- `PageHeader` — 제목 + 부제 + 브레드크럼 + 액션.
- `Anchor` / `SectionNav` — 스크롤 추적 사이드 내비.
- `Breadcrumbs` — 경로 표시.
- `Pagination` — DataTable 짝.
- `Link` — styled `<a>`.
- `Toolbar` 가족 — Toolbar + Group + Button + Separator.
- `Panel` / `SidePanel` — collapsible/resizable 패널.
- `FullBleed` — 부모 폭 넘기.
- `FormSection` / `FormGrid` — 폼 레이아웃.

### 오버레이
- `Sheet` / `Drawer` — 사이드 패널 (Dialog 인프라 80% 재사용).
- `BottomSheet` — 하단 시트.
- `HoverCard` — Tooltip의 부자 버전.
- `DropdownMenu` — 액션 메뉴 (Select=값, DropdownMenu=행동).
- `SplitButton` — 기본 액션 + 우측 드롭다운.
- `ConfirmDialog` — promise 기반 확인 다이얼로그.
- `Lightbox` / `ImageViewer` — 이미지 확대 모달.
- `LoadingOverlay` + `Backdrop`.
- `ActionSheet` — iOS 시트.
- `Tour` / `Coachmark` / `Spotlight` — 온보딩.
- `WhatsNew` / `OnboardingChecklist`.

### 인터랙션
- `Sortable` — 드래그-앤-드롭 재정렬.
- `Carousel` — 슬라이드 전환.
- `MentionsInput` — `@` 자동완성.
- `VirtualList` — 가상 스크롤 컨테이너.
- `TagInput` / `ChipInput` — 다중 값 입력.
- `Draggable` + `DropTarget` — 일반 DnD primitive.
- `LongPress` / `DoubleClick`.
- `PullToRefresh` / `SwipeAction`.

### 알림
- `InlineMessage` — 한 줄 인라인 알림 (Alert보다 가벼움).
- `Notifications` center — 헤더 벨 + 누적 알림 보관.
- `NotificationDot` — 작은 빨간 점 + 카운트.
- `Note` / `Callout` — 문서 스타일 노트 박스.

### Date / Time 변종
- `DateRangePicker` — 두 날짜 선택. `Calendar` 분리 후 자연스러움.
- `TimePicker` — 시간만.
- `DatePresets` — "최근 7일/지난달" 빠른 선택 칩.
- `WeekView` / `MonthView` / `AgendaView` — Calendar derivatives.
- `DurationPicker` — 시간 길이 선택.
- `TimezonePicker`.
- `Countdown`.

### 개발자 도구 색깔
- `KbdHint` / `Shortcut` — 단일 키캡 시각화.
- `KbdShortcuts` overlay — `?` 키로 전체 단축키 모달.
- `KeyBinding` display + editor.
- `HelpHint` — `(?)` 아이콘 + Tooltip 합성.
- `StatusBar` / `Toolbar` — IDE-like 셸.
- `Timeline` / `ActivityLog` — 시계열 이벤트.
- `HttpStatusChip` — 200/404/500 색상 칩.
- `EnvBadge` — dev/staging/prod 환경 라벨.
- `ThemeToggle` — light/dark 전환 스위치.
- `RegexInput` — 실시간 매칭 미리보기.
- `CodeFold` / `BlameAnnotation` / `Minimap` — CodeView 확장.

### 채팅 / AI
- `ChatBubble` + `MessageThread`.
- `StreamingText`.
- `MessageInput` + `TypingIndicator` + `MessageReaction`.

### 협업 / 실시간
- `Presence` / `Cursor` / `LiveSelection`.

### 시스템 / 메타
- `OnlineStatus` / `IdleTimer`.
- `RetryButton` / `RetryState`.
- `SaveBar` — 폼 dirty 시 하단 액션 바.
- `FloatingActionButton` (FAB) / `BackToTop`.
- `Wizard` — 다단계 폼.

### 미디어
- `BeforeAfter` — 두 이미지 비교 슬라이더.
- `AudioPlayer` / `VideoPlayer` / `WaveformDisplay`.
- `Gauge` — 속도계 게이지.

### 문서 / 도움말
- `Detail` / `Disclosure` — `<details>` 래퍼.
- `Quote` / `Blockquote`.
- `Definition` / `Glossary` / `FAQ`.
- `Prose` / `Article` — typography wrapper.
- `TableOfContents` — heading 자동 목차.
- `ReadingProgress` — 페이지 진행률.
- `Printable` / `PrintOnly` / `ScreenOnly`.

### 동의 / 마케팅
- `CookieBanner` — 쿠키 동의.
- `NewsletterSignup`.

### 비동기 / 데이터
- `InfiniteScroll` / `LoadMore`.
- `AsyncSelect` / `AsyncCombobox`.
- `ExportButton` — PDF/CSV/JSON 드롭다운.
- `PrintPreview`.

### 접근성 / 메타
- `VisuallyHidden` / `SkipLink` / `LiveRegion`.
- `ThemeProvider` + `useTheme`.
- `MediaQuery` / `Hidden` / `Show` (반응형 primitive).

### 작은 인터랙션 / 시각 피드백
- `Ripple` / `Shake` / `Confetti`.
- `Collapse` / `Fade` / `Slide` / `Reveal` / `ScrollReveal` — 애니메이션 primitive.
- `ButtonToggle` / `IconToggle`.
- `Sound` / `Haptic`.

### DataTable 액세서리
- `DataTable.Column.Resizable` / `DataTable.GroupBy` / `DataTable.SubRows`.
- `BulkActions` / `ColumnConfigurator` / `RowExpander` / `DataTable.Toolbar`.

### 컴포지션 / 합성
- `SettingsPanel` — 카테고리 설정.
- `Comparison` / `FeatureMatrix`.
- `Widget` / `WidgetGrid` — 대시보드.
- `List` / `SelectableList`.
- `ChatBubble` / `MessageThread`.

### 기타
- `Rating` — 별점.
- `SignaturePad` — canvas 서명.
- `Knob` — 회전식 컨트롤.
- `WeekdayPicker` — M T W T F S S 토글.
- `EmojiPicker`.
- `EmailInput` / `URLInput` / `PhoneInput` (도메인 전용 입력).
- `FilterBuilder` / `FilterBar`.

---

## 드롭 (Dropped)

### `DiffView`
- **이유**: 너무 고급 기능, 현 시점 논의 불필요.

### `JsonView` / `TreeDataView`
- **이유**: 현 시점 우선순위 낮음.

### `LogView`
- **이유**: 현 시점 우선순위 낮음.

---

## 큰 작업 (참고만)

라이브러리 정체성을 크게 바꿀 수 있어 별도 결정 필요한 항목들.

| 항목 | 설명 |
|---|---|
| `Charts` 라이브러리 (`LineChart` / `BarChart` / `PieChart` / `AreaChart`) | recharts·visx 의존 vs 자체 구현 결정 필요. 큰 스코프, 라이브러리 정체성 변화. |
| `RichTextEditor` | Tiptap·ProseMirror 의존 필수. 매우 큰 작업. |
| `MapView` | Leaflet/Mapbox 의존. 라이브러리 범위 넘어섬. |

---

## 기록 정책

- 새 후보가 거론되어 잠정 후보로 채택되면 → **잠정 후보** 섹션에 추가.
- 거론되었으나 채택 보류 → **검토 대상** 섹션에 추가.
- 명시적으로 드롭됨 → **드롭** 섹션으로 이동 + 사유 기록.
- 잠정 후보가 plan 문서로 승격되면 → **Plan 작성 완료** 섹션으로 이동 + plan 링크.
- 구현이 완료되어 PR merge되면 → 이 파일에서 제거 + plan 문서가 `docs/plans/complete/`로 이동.
