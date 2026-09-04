import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { LangIcon } from "@/components/icons/LangIcons";

const KEYWORDS = new Set([
  "import", "export", "from", "const", "let", "var", "function",
  "return", "await", "async", "if", "else", "true", "false", "null",
  "undefined", "new", "default", "as", "type", "interface", "class",
  "extends", "implements", "this", "of", "in", "for", "while", "try",
  "catch", "throw",
]);

const TYPES = new Set([
  "string", "number", "boolean", "Promise", "Array", "Record", "Date",
  "object", "void", "any", "unknown", "never",
]);

type Token = { kind: string; value: string };

function tokenize(line: string): Token[] {
  if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
    return [{ kind: "comment", value: line }];
  }

  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    if (ch === " " || ch === "\t") {
      let j = i;
      while (j < line.length && (line[j] === " " || line[j] === "\t")) j++;
      tokens.push({ kind: "ws", value: line.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j++;
        j++;
      }
      tokens.push({ kind: "string", value: line.slice(i, Math.min(j + 1, line.length)) });
      i = Math.min(j + 1, line.length);
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9._]/.test(line[j])) j++;
      tokens.push({ kind: "number", value: line.slice(i, j) });
      i = j;
      continue;
    }

    if (/[A-Za-z_$@]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_$@./-]/.test(line[j])) j++;
      const word = line.slice(i, j);
      let kind = "ident";
      if (KEYWORDS.has(word)) kind = "keyword";
      else if (TYPES.has(word)) kind = "type";
      else if (word.startsWith("@")) kind = "scope";
      else if (/^[A-Z]/.test(word)) kind = "klass";
      else if (j < line.length && line[j] === "(") kind = "fn";
      tokens.push({ kind, value: word });
      i = j;
      continue;
    }

    if (/[{}()[\];,.<>=+\-*/!?:&|]/.test(ch)) {
      tokens.push({ kind: "punct", value: ch });
      i++;
      continue;
    }

    tokens.push({ kind: "text", value: ch });
    i++;
  }
  return tokens;
}

// One Dark inspired palette — explicit colors, doesn't follow light/dark theme.
const COLORS: Record<string, string> = {
  comment: "text-[#7F848E] italic",
  string:  "text-[#98C379]",
  number:  "text-[#D19A66]",
  keyword: "text-[#C678DD] font-medium",
  type:    "text-[#E5C07B]",
  scope:   "text-[#56B6C2] underline decoration-[#56B6C2]/30 underline-offset-4",
  klass:   "text-[#E5C07B]",
  fn:      "text-[#61AFEF]",
  punct:   "text-[#ABB2BF]/70",
  ident:   "text-[#ABB2BF]",
  text:    "text-[#ABB2BF]",
  ws:      "",
};

interface CodeBlockProps {
  code: string;
  filename?: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({ code, filename, language = "ts", showLineNumbers = true, className = "" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* noop */ }
  };

  return (
    <div className={`overflow-hidden rounded-md border border-[#181A1F] bg-[#0F1115] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] ${className}`}>
      {/* Title bar */}
      <div className="flex items-center gap-3 px-4 h-10 border-b border-[#181A1F] bg-gradient-to-b from-[#1A1D23] to-[#15171C]">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F56] shadow-[0_0_0_0.5px_rgba(0,0,0,0.4)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E] shadow-[0_0_0_0.5px_rgba(0,0,0,0.4)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#27C93F] shadow-[0_0_0_0.5px_rgba(0,0,0,0.4)]" />
        </div>
        <div className="flex items-center gap-2 ml-2 min-w-0">
          <LangIcon lang={language} className="h-3.5 w-3.5 shrink-0" />
          {filename && (
            <span className="text-[11px] text-[#ABB2BF]/85 font-mono truncate">
              {filename}
            </span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#7F848E] ml-auto font-mono">
          {language}
        </span>
        <button
          onClick={onCopy}
          aria-label="Copy code"
          className="h-7 w-7 flex items-center justify-center text-[#7F848E] hover:text-[#ABB2BF] transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#27C93F]" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Code body */}
      <pre className="p-5 overflow-x-auto text-[12.5px] leading-[1.7] font-mono text-[#ABB2BF] bg-[#0B0D11]">
        <code>
          {lines.map((line, i) => {
            const tokens = tokenize(line);
            return (
              <div key={i} className="flex">
                {showLineNumbers && (
                  <span className="select-none text-[#3E4451] pr-4 w-8 text-right shrink-0">
                    {i + 1}
                  </span>
                )}
                <span className="flex-1">
                  {tokens.length === 0 ? (
                    <span>&nbsp;</span>
                  ) : (
                    tokens.map((t, j) => (
                      <span key={j} className={COLORS[t.kind] ?? ""}>
                        {t.value}
                      </span>
                    ))
                  )}
                </span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

export default CodeBlock;
