import { motion } from "framer-motion";
import { Check, Copy, ExternalLink, Loader2, Pause, Play, Square } from "lucide-react";
import { useState } from "react";
import type { Agent } from "../types";
import {
  timeAgo,
  ACTION_COLORS,
  RISK_CONFIG,
  STATUS_CONFIG,
} from "../lib/utils";

interface AgentCardProps {
  agent: Agent;
  index: number;
  onControl: (id: string, action: "pause" | "resume" | "stop") => Promise<void>;
}

export function AgentCard({ agent, index, onControl }: AgentCardProps) {
  const risk = RISK_CONFIG[agent.riskLevel] || RISK_CONFIG.LOW;
  const actionColor = ACTION_COLORS[agent.lastAction] || ACTION_COLORS.HOLD;
  const statusStyle = STATUS_CONFIG[agent.status] || STATUS_CONFIG.stopped;
  const [loadingAction, setLoadingAction] = useState<
    "pause" | "resume" | "stop" | null
  >(null);
  const [copied, setCopied] = useState(false);

  function copyWallet() {
    navigator.clipboard.writeText(agent.wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleControl(action: "pause" | "resume" | "stop") {
    setLoadingAction(action);
    try {
      await onControl(agent.id, action);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className={`relative border rounded-xl p-4 overflow-hidden transition-all scanline-bg ${
        agent.status === "stopped"
          ? "bg-[#090c10] border-white/3 opacity-40! grayscale"
          : agent.status === "paused"
            ? "bg-[#161b22] border-white/[0.07] hover:border-white/15 opacity-60!"
            : "bg-[#161b22] border-white/[0.07] hover:border-white/15" +
              (agent.status !== "running" ? " opacity-60" : "bg-red-400")
      }`}
    >
      <div
        className="absolute top-0 left-0 bottom-0 w-0.75 rounded-l-xl"
        style={{ background: agent.color }}
      />

      {agent.status === "running" && (
        <div
          className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full ${risk.dot}`}
        />
      )}

      <div className="flex items-start justify-between mb-3 pl-2">
        <div>
          <div className="text-sm font-bold text-white">{agent.name}</div>
          <div className="text-[10px] font-mono text-zinc-300 mt-0.5">
            {agent.type} · {agent.strategy}
          </div>
        </div>
        <span
          className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-full tracking-wide ${statusStyle}`}
        >
          {agent.status}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-3 pl-2">
        <span className="font-mono text-[9px] text-zinc-300 truncate">
          {agent.wallet}
        </span>
        <button
          onClick={copyWallet}
          className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          {copied ? <Check size={10} className="text-[#39ff14]" /> : <Copy size={10} />}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 pl-2">
        {[
          { val: agent.balanceSOL.toFixed(3), label: "SOL" },
          { val: String(agent.cycleCount), label: "Cycles" },
          {
            val: `${agent.pnl >= 0 ? "+" : ""}${agent.pnl.toFixed(1)}%`,
            label: "PnL",
            color: agent.pnl >= 0 ? "text-[var(--green)]" : "text-[var(--red)]",
          },
        ].map(({ val, label, color }) => (
          <div key={label} className="bg-(--surface) rounded-md px-2 py-1.75">
            <div
              className={`font-mono text-[13px] font-bold ${color || "text-(--text)"}`}
            >
              {val}
            </div>
            <div className="text-[9px] text-(--muted) uppercase tracking-[0.05em] mt-0.5">
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pl-2 mb-3">
        <span
          className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${actionColor}`}
        >
          {agent.lastAction}
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">
          {timeAgo(agent.lastActionAt)}
        </span>
      </div>

      <div className="flex gap-2 pl-2">
        {agent.status === "running" ? (
          <button
            onClick={() => handleControl("pause")}
            disabled={loadingAction !== null}
            className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 cursor-pointer rounded-md border border-white/10 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingAction === "pause" ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Pause size={10} />
            )}{" "}
            Pause
          </button>
        ) : (
          <button
            onClick={() => handleControl("resume")}
            disabled={loadingAction !== null}
            className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 cursor-pointer rounded-md border border-white/10 text-zinc-400 hover:border-[#39ff14]/50 hover:text-[#39ff14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingAction === "resume" ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Play size={10} />
            )}{" "}
            Resume
          </button>
        )}
        <button
          onClick={() => handleControl("stop")}
          disabled={loadingAction !== null}
          className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 cursor-pointer rounded-md border border-white/10 text-zinc-400 hover:border-rose-500/50 hover:text-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingAction === "stop" ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Square size={10} />
          )}{" "}
          Stop
        </button>
        <a
          href={`https://explorer.solana.com/address/${agent.wallet}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 cursor-pointer rounded-md border border-white/10 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors ml-auto"
        >
          <ExternalLink size={10} /> Explorer
        </a>
      </div>
    </motion.div>
  );
}
