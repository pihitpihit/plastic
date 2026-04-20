import { useMemo, useState } from "react";
import { HexView, Button } from "plastic";
import type {
  HexViewBytesPerRow,
  HexViewEndian,
  HexViewGroupSize,
  HexViewTheme,
} from "plastic";

const ELF_HEADER = new Uint8Array([
  0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x3e, 0x00, 0x01, 0x00, 0x00, 0x00,
  0x50, 0x0b, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xe0, 0x1a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x38, 0x00,
  0x0d, 0x00, 0x40, 0x00, 0x1e, 0x00, 0x1d, 0x00,
]);

const LOREM = new TextEncoder().encode(
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " +
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
);

function makeLargeData(sizeKiB: number): Uint8Array {
  const out = new Uint8Array(sizeKiB * 1024);
  let s = 0x12345678;
  for (let i = 0; i < out.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out[i] = s & 0xff;
  }
  return out;
}

const USAGE_CODE = `import { HexView } from "plastic";

<HexView
  data={uint8Array}
  bytesPerRow={16}
  groupSize={4}
  endian="big"
  showAscii
  highlightRanges={[
    { start: 0, end: 4, label: "magic", color: "rgba(253,224,71,0.5)" },
  ]}
/>`;

export default function HexViewPage() {
  const [theme, setTheme] = useState<HexViewTheme>("light");

  const largeData = useMemo(() => makeLargeData(512), []);

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HexView</h1>
        <p className="text-gray-500 mt-1">
          바이너리를 offset · hex · ASCII 3 컬럼으로 표시하는 hex 뷰어. 가상
          스크롤, hover 링크, 범위 선택, 포맷별 복사 (hex / ASCII / C array)
          지원.
        </p>
      </div>

      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant={theme === "light" ? "primary" : "secondary"}
          onClick={() => setTheme("light")}
        >
          Light
        </Button>
        <Button
          size="sm"
          variant={theme === "dark" ? "primary" : "secondary"}
          onClick={() => setTheme("dark")}
        >
          Dark
        </Button>
      </div>

      <section id="basic">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Basic — ELF Header (64 bytes)
        </p>
        <HexView data={ELF_HEADER} theme={theme} />
      </section>

      <section id="bytes-per-row">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Bytes per row
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[4, 8, 32].map((n) => (
            <div key={n}>
              <p className="text-xs text-gray-500 mb-1">bytesPerRow = {n}</p>
              <HexView
                data={ELF_HEADER}
                bytesPerRow={n as HexViewBytesPerRow}
                theme={theme}
              />
            </div>
          ))}
        </div>
      </section>

      <section id="grouping-endian">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Grouping + Endian
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">
              groupSize = 4, endian = big
            </p>
            <HexView
              data={ELF_HEADER}
              groupSize={4}
              endian="big"
              theme={theme}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">
              groupSize = 4, endian = little (그룹 내 바이트 역순)
            </p>
            <HexView
              data={ELF_HEADER}
              groupSize={4}
              endian="little"
              theme={theme}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">groupSize = 2</p>
            <HexView data={ELF_HEADER} groupSize={2} theme={theme} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">groupSize = 8</p>
            <HexView data={ELF_HEADER} groupSize={8} theme={theme} />
          </div>
        </div>
      </section>

      <section id="ascii-toggle">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          ASCII toggle
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">showAscii = true</p>
            <HexView data={LOREM} theme={theme} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">showAscii = false</p>
            <HexView data={LOREM} showAscii={false} theme={theme} />
          </div>
        </div>
      </section>

      <section id="offset-toggle">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Offset column / header toggle
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">
              showOffsetColumn = false
            </p>
            <HexView
              data={ELF_HEADER}
              showOffsetColumn={false}
              theme={theme}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">
              showOffsetHeader = false
            </p>
            <HexView
              data={ELF_HEADER}
              showOffsetHeader={false}
              theme={theme}
            />
          </div>
        </div>
      </section>

      <section id="highlight">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Highlight ranges
        </p>
        <p className="text-sm text-gray-500 mb-3">
          ELF magic (4B), class/endian/version/OSABI (4B), e_type (2B), e_machine (2B) 을 하이라이트.
        </p>
        <HexView
          data={ELF_HEADER}
          theme={theme}
          highlightRanges={[
            {
              start: 0,
              end: 4,
              color: "rgba(253,224,71,0.55)",
              label: "ELF magic",
            },
            {
              start: 4,
              end: 8,
              color: "rgba(134,239,172,0.55)",
              label: "class / data / version / OS ABI",
            },
            {
              start: 16,
              end: 18,
              color: "rgba(251,146,60,0.50)",
              label: "e_type",
            },
            {
              start: 18,
              end: 20,
              color: "rgba(196,181,253,0.55)",
              label: "e_machine",
            },
          ]}
        />
      </section>

      <section id="selection">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Selection + Copy
        </p>
        <p className="text-sm text-gray-500 mb-3">
          드래그로 바이트 범위 선택 → 우상단 <code className="bg-gray-100 px-1 rounded">HEX / ASC / C</code> 로 포맷 선택 후 <code className="bg-gray-100 px-1 rounded">복사</code>. 선택 없이 복사하면 전체가 복사됩니다. Cmd/Ctrl+A 전체 선택, Cmd/Ctrl+C 키 복사도 지원.
        </p>
        <HexView data={LOREM} theme={theme} />
      </section>

      <section id="virtualized">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Virtualized — 512 KiB (32,768 rows)
        </p>
        <p className="text-sm text-gray-500 mb-3">
          threshold = 512 rows 이상일 때 가상화 활성. DevTools Elements 에서 실제 렌더되는 row DOM 수가 viewport 에 보이는 만큼만인지 확인하세요.
        </p>
        <HexView data={largeData} theme={theme} maxHeight="400px" />
      </section>

      <section id="dark">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Dark theme (고정)
        </p>
        <HexView data={ELF_HEADER} theme="dark" />
      </section>

      <section id="props">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Props
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Prop", "Type", "Default", "Description"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PROPS_ROWS.map(([name, type, def, desc]) => (
                <tr key={name}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-800">
                    {name}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                    {type}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                    {def}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="usage">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Usage
        </p>
        <pre className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre">
          {USAGE_CODE}
        </pre>
      </section>

      <section id="playground">
        <Playground />
      </section>
    </div>
  );
}

const PROPS_ROWS: Array<[string, string, string, string]> = [
  ["data", "Uint8Array | ArrayBuffer | number[]", "—", "표시할 바이너리 (필수)"],
  ["bytesPerRow", "4 | 8 | 16 | 32 | 64", "16", "한 줄 바이트 수"],
  ["groupSize", "1 | 2 | 4 | 8", "1", "그룹 크기 (bytesPerRow 의 약수)"],
  ["endian", '"big" | "little"', '"big"', "그룹 내 바이트 렌더 순서"],
  ["showAscii", "boolean", "true", "ASCII 컬럼"],
  ["showOffsetColumn", "boolean", "true", "좌측 주소 컬럼"],
  ["showOffsetHeader", "boolean", "true", "상단 주소 헤더"],
  ["baseOffset", "number", "0", "주소 표시 기준값"],
  ["offsetDigits", "number", "auto", "주소 자리수 (미지정 시 자동)"],
  ["theme", '"light" | "dark"', '"light"', "색상 테마"],
  ["showAlternatingRows", "boolean", "true", "홀짝 행 배경"],
  [
    "highlightRanges",
    "{ start, end, color?, label? }[]",
    "—",
    "임의 범위 하이라이트",
  ],
  ["maxHeight", "string", '"60vh"', "뷰포트 최대 높이"],
  ["showCopyButton", "boolean", "true", "우상단 복사 버튼"],
  [
    "defaultCopyFormat",
    '"hex" | "ascii" | "c-array"',
    '"hex"',
    "복사 기본 포맷",
  ],
  ["selection", "{start,end} | null", "—", "Controlled 선택"],
  ["onSelectionChange", "(sel) => void", "—", "선택 변경 콜백"],
  ["linkHover", "boolean", "true", "hex ↔ ASCII hover 동기화"],
  [
    "nonPrintable",
    '"dot"|"underscore"|"blank"|Fn',
    '"dot"',
    "ASCII 비인쇄 문자 표시",
  ],
];

function Playground() {
  const [bytesPerRow, setBytesPerRow] = useState<HexViewBytesPerRow>(16);
  const [groupSize, setGroupSize] = useState<HexViewGroupSize>(4);
  const [endian, setEndian] = useState<HexViewEndian>("big");
  const [showAscii, setShowAscii] = useState(true);
  const [showOffsetColumn, setShowOffsetColumn] = useState(true);
  const [showOffsetHeader, setShowOffsetHeader] = useState(true);
  const [linkHover, setLinkHover] = useState(true);
  const [theme, setTheme] = useState<HexViewTheme>("light");
  const [dataKey, setDataKey] = useState<string>("elf");

  const data = useMemo(() => {
    switch (dataKey) {
      case "elf":
        return ELF_HEADER;
      case "lorem":
        return LOREM;
      case "4k":
        return makeLargeData(4);
      case "64k":
        return makeLargeData(64);
      case "1m":
        return makeLargeData(1024);
      default:
        return ELF_HEADER;
    }
  }, [dataKey]);

  const ctrl = "px-2 py-1 text-xs rounded border";

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        Playground
      </p>
      <div className="flex flex-wrap gap-2 mb-3 items-center text-xs">
        <label className="flex items-center gap-1">
          bytesPerRow:
          <select
            className={ctrl}
            value={bytesPerRow}
            onChange={(e) =>
              setBytesPerRow(Number(e.target.value) as HexViewBytesPerRow)
            }
          >
            {[4, 8, 16, 32, 64].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          groupSize:
          <select
            className={ctrl}
            value={groupSize}
            onChange={(e) =>
              setGroupSize(Number(e.target.value) as HexViewGroupSize)
            }
          >
            {[1, 2, 4, 8].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          endian:
          <select
            className={ctrl}
            value={endian}
            onChange={(e) => setEndian(e.target.value as HexViewEndian)}
          >
            <option value="big">big</option>
            <option value="little">little</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          data:
          <select
            className={ctrl}
            value={dataKey}
            onChange={(e) => setDataKey(e.target.value)}
          >
            <option value="elf">ELF 64B</option>
            <option value="lorem">Lorem ~184B</option>
            <option value="4k">4 KiB</option>
            <option value="64k">64 KiB</option>
            <option value="1m">1 MiB</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          theme:
          <select
            className={ctrl}
            value={theme}
            onChange={(e) => setTheme(e.target.value as HexViewTheme)}
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showAscii}
            onChange={(e) => setShowAscii(e.target.checked)}
          />
          showAscii
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showOffsetColumn}
            onChange={(e) => setShowOffsetColumn(e.target.checked)}
          />
          showOffsetColumn
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showOffsetHeader}
            onChange={(e) => setShowOffsetHeader(e.target.checked)}
          />
          showOffsetHeader
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={linkHover}
            onChange={(e) => setLinkHover(e.target.checked)}
          />
          linkHover
        </label>
      </div>
      <HexView
        data={data}
        bytesPerRow={bytesPerRow}
        groupSize={groupSize}
        endian={endian}
        showAscii={showAscii}
        showOffsetColumn={showOffsetColumn}
        showOffsetHeader={showOffsetHeader}
        linkHover={linkHover}
        theme={theme}
        maxHeight="500px"
      />
    </div>
  );
}
