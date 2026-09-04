import { useEffect, useRef, useState } from "react";
import { Check, Copy, TerminalSquare } from "lucide-react";
import { LangIcon } from "@/components/icons/LangIcons";

type PM = "npm" | "pnpm" | "yarn" | "bun";

interface PMTab {
  key: PM;
  label: string;
  install: string;
  scoped: string;
  init: string;
}

const SCOPED_PKGS = "@talak-web3/auth @talak-web3/rpc @talak-web3/tx";

const TABS: PMTab[] = [
  { key: "npm",  label: "npm",  install: "npm install talak-web3", scoped: `npm install ${SCOPED_PKGS}`, init: "npx  talak init my-dapp" },
  { key: "pnpm", label: "pnpm", install: "pnpm add talak-web3",     scoped: `pnpm add ${SCOPED_PKGS}`,    init: "pnpm dlx talak init my-dapp" },
  { key: "yarn", label: "yarn", install: "yarn add talak-web3",     scoped: `yarn add ${SCOPED_PKGS}`,    init: "yarn dlx talak init my-dapp" },
  { key: "bun",  label: "bun",  install: "bun add talak-web3",      scoped: `bun add ${SCOPED_PKGS}`,     init: "bunx talak init my-dapp" },
];

function Prompt() {
  return (
    <span className="select-none mr-1.5">
      <span className="text-[#98C379]">talak</span>
      <span className="text-[#5C6370]">@</span>
      <span className="text-[#56B6C2]">dev</span>
      <span className="text-[#5C6370]">:</span>
      <span className="text-[#61AFEF]">~/my-dapp</span>
      <span className="text-[#E5C07B] ml-1">$</span>
    </span>
  );
}

function colorizeCmd(cmd: string) {
  const parts = cmd.split(/\s+/);
  return parts.map((p, i) => {
    let cls = "text-[#ABB2BF]";
    if (i === 0) cls = "text-[#C678DD] font-medium";              // pm name
    else if (/^(install|add|init|dlx)$/.test(p)) cls = "text-[#E5C07B]";
    else if (p.startsWith("@talak-web3/") || p === "talak-web3")
      cls = "text-[#61AFEF] underline decoration-[#61AFEF]/30 underline-offset-4";
    else if (p.startsWith("--")) cls = "text-[#7F848E]";
    return (
      <span key={i} className={cls}>
        {i > 0 ? " " : ""}{p}
      </span>
    );
  });
}

interface CmdProps {
  cmd: string;
}

function CommandRow({ cmd }: CmdProps) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* ignore */ }
  };
  return (
    <div className="group flex items-center gap-3 py-1">
      <span className="font-mono text-[12.5px] flex-1 min-w-0 truncate">
        <Prompt />{colorizeCmd(cmd)}
      </span>
      <button
        onClick={onCopy}
        aria-label="Copy command"
        className="opacity-60 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center text-[#7F848E] hover:text-[#ABB2BF]"
      >
        {copied ? <Check className="h-3 w-3 text-[#27C93F]" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function Typing({ text, speed = 28 }: { text: string; speed?: number }) {
  const [out, setOut] = useState("");
  const idxRef = useRef(0);

  useEffect(() => {
    setOut("");
    idxRef.current = 0;
    const id = setInterval(() => {
      idxRef.current += 1;
      if (idxRef.current > text.length) {
        clearInterval(id);
        return;
      }
      setOut(text.slice(0, idxRef.current));
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <span className="font-mono text-[12.5px]">
      <Prompt />{colorizeCmd(out)}
      <span className="inline-block w-[7px] h-[14px] -mb-0.5 ml-0.5 bg-[#61AFEF] animate-pulse" />
    </span>
  );
}

const OUTPUT_LINES: { text: string; cls: string }[] = [
  { text: "Resolving talak-web3 ✓",                     cls: "text-[#7F848E]" },
  { text: "+ talak-web3 1.0.12",                        cls: "text-[#98C379]" },
  { text: "+ @talak-web3/core 1.0.10",                  cls: "text-[#98C379]" },
  { text: "+ @talak-web3/auth 1.0.11",                  cls: "text-[#98C379]" },
  { text: "+ @talak-web3/rpc 1.0.9",                    cls: "text-[#98C379]" },
  { text: "+ @talak-web3/tx 1.0.8",                     cls: "text-[#98C379]" },
  { text: "Linked 5 packages in 1.2s",                  cls: "text-[#7F848E]" },
  { text: "▲ Done · 32 KB gzipped · 0 vulnerabilities", cls: "text-[#27C93F]" },
];

export function TerminalInstall() {
  const [pm, setPm] = useState<PM>("pnpm");
  const current = TABS.find(t => t.key === pm)!;

  return (
    <div className="overflow-hidden rounded-md border border-[#181A1F] bg-[#0F1115] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)]">
      {/* Window chrome */}
      <div className="flex items-center gap-3 px-4 h-10 border-b border-[#181A1F] bg-gradient-to-b from-[#1A1D23] to-[#15171C]">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F56] shadow-[0_0_0_0.5px_rgba(0,0,0,0.4)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E] shadow-[0_0_0_0.5px_rgba(0,0,0,0.4)]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#27C93F] shadow-[0_0_0_0.5px_rgba(0,0,0,0.4)]" />
        </div>
        <div className="flex-1 flex items-center justify-center gap-2">
          <TerminalSquare className="h-3.5 w-3.5 text-[#7F848E]" />
          <span className="text-[11px] font-mono text-[#ABB2BF]/70">talak-web3 — install</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] text-[#7F848E] font-mono">
          {pm} · zsh
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-stretch border-b border-[#181A1F] bg-[#15171C] overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setPm(tab.key)}
            className={`group relative px-5 h-10 text-[11.5px] font-mono uppercase tracking-[0.12em] transition-colors flex-shrink-0 inline-flex items-center gap-2 ${
              pm === tab.key
                ? "text-[#ABB2BF] bg-[#0F1115]"
                : "text-[#7F848E] hover:text-[#ABB2BF] hover:bg-[#1A1D23]"
            }`}
          >
            <LangIcon lang="npm" className="h-3.5 w-3.5" />
            {tab.label}
            {pm === tab.key && (
              <span className="absolute left-3 right-3 -bottom-px h-px bg-[#61AFEF]/60" />
            )}
          </button>
        ))}
        <div className="ml-auto px-4 hidden md:flex items-center text-[10.5px] text-[#7F848E] font-mono whitespace-nowrap">
          one command, every package manager
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5 space-y-5 bg-[#0B0D11]">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[#7F848E] font-mono mb-2 flex items-center gap-2">
            <span className="text-[#E5C07B]">01</span>
            <span>Install the SDK</span>
            <span className="ml-auto normal-case tracking-normal text-[#5C6370]">talak-web3</span>
          </div>
          <div className="border border-[#181A1F] bg-[#0F1115] px-4 py-2.5 min-h-[44px] flex items-center rounded-sm">
            <Typing text={current.install} />
          </div>
        </div>

        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[#7F848E] font-mono mb-2 flex items-center gap-2">
            <span className="text-[#E5C07B]">02</span>
            <span>Or pick only the scopes you need</span>
            <span className="ml-auto normal-case tracking-normal text-[#5C6370]">@talak-web3/*</span>
          </div>
          <div className="border border-[#181A1F] bg-[#0F1115] px-4 py-2.5 rounded-sm">
            <CommandRow cmd={current.scoped} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["@talak-web3/auth", "@talak-web3/rpc", "@talak-web3/tx"].map(p => (
              <span
                key={p}
                className="text-[10.5px] font-mono text-[#56B6C2] bg-[#56B6C2]/10 border border-[#56B6C2]/30 px-1.5 py-0.5 rounded-sm"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[#7F848E] font-mono mb-2 flex items-center gap-2">
            <span className="text-[#E5C07B]">03</span>
            <span>Scaffold a project</span>
            <span className="ml-auto normal-case tracking-normal text-[#5C6370]">via talak CLI</span>
          </div>
          <div className="border border-[#181A1F] bg-[#0F1115] px-4 py-2.5 rounded-sm">
            <CommandRow cmd={current.init} />
          </div>
        </div>

        {/* Install output */}
        <div className="border-t border-[#181A1F] pt-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-[#7F848E] font-mono mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#27C93F] animate-pulse" />
            Output
          </div>
          <div className="font-mono text-[12px] leading-[1.75] space-y-0.5 px-3 py-2 border border-[#181A1F] bg-[#0F1115] rounded-sm">
            {OUTPUT_LINES.map((line, i) => (
              <div key={i} className={line.cls}>
                {line.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TerminalInstall;
