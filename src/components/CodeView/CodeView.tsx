import { Highlight, themes } from "prism-react-renderer";
import type { CodeViewProps } from "./CodeView.types";
import { renderWithInvisibles } from "./CodeView.invisibles";

// Internal — not exported
const internalThemes = {
  light: themes.vsLight,
  dark: themes.vsDark,
} as const;

const lineNumberColor = {
  light: "rgba(0,0,0,0.25)",
  dark: "rgba(255,255,255,0.25)",
} as const;

const alternatingRowColor = {
  light: "rgba(0,0,0,0.04)",
  dark: "rgba(255,255,255,0.04)",
} as const;

export function CodeView({
  code,
  language = "typescript",
  showLineNumbers = true,
  showAlternatingRows = true,
  showInvisibles = false,
  tabSize = 2,
  theme = "light",
  className = "",
}: CodeViewProps) {
  return (
    <Highlight
      theme={internalThemes[theme]}
      code={code.trimEnd()}
      language={language}
    >
      {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={["overflow-x-auto rounded-lg text-sm", hlClassName, className]
            .filter(Boolean)
            .join(" ")}
          style={{ ...style, tabSize }}
        >
          <code>
            {tokens.map((line, lineIndex) => {
              const { className: lineClassName, style: lineStyle, ...lineRest } = getLineProps({ line });
              const isOdd = lineIndex % 2 !== 0;

              return (
                <div
                  key={lineIndex}
                  className={["flex", lineClassName].filter(Boolean).join(" ")}
                  style={{
                    ...lineStyle,
                    ...(showAlternatingRows && isOdd
                      ? { backgroundColor: alternatingRowColor[theme] }
                      : {}),
                  }}
                  {...lineRest}
                >
                  {showLineNumbers && (
                    <span
                      aria-hidden="true"
                      style={{
                        minWidth: "2.5rem",
                        paddingRight: "1rem",
                        textAlign: "right",
                        userSelect: "none",
                        color: lineNumberColor[theme],
                        flexShrink: 0,
                      }}
                    >
                      {lineIndex + 1}
                    </span>
                  )}
                  <span style={{ flex: 1 }}>
                    {line.map((token, tokenIndex) => {
                      const { children: tokenContent, ...tokenSpanProps } = getTokenProps({ token });
                      return (
                        <span key={tokenIndex} {...tokenSpanProps}>
                          {showInvisibles
                            ? renderWithInvisibles(token.content, theme, tabSize)
                            : tokenContent}
                        </span>
                      );
                    })}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
