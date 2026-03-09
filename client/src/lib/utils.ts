export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  return `${Math.floor(diff / 60000)}m ago`;
}

export function formatUptime(pct: number): string {
  return `${pct.toFixed(2)}%`;
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export const ACTION_COLORS: Record<string, string> = {
  BUY: "bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/30",
  SELL: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  HOLD: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  MONITOR: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  RISK_CHECK: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  ADD_LIQUIDITY: "bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/30",
  HARVEST: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  REBALANCE: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  ALERT: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  BUY_SKIP: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  SELL_SKIP: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  INIT: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
};

export const RISK_CONFIG = {
  LOW: { dot: "bg-[#39ff14]", text: "text-[#39ff14]", label: "LOW" },
  MEDIUM: {
    dot: "bg-amber-400 animate-pulse",
    text: "text-amber-400",
    label: "MED",
  },
  HIGH: {
    dot: "bg-rose-400 animate-pulse",
    text: "text-rose-400",
    label: "HIGH",
  },
  CRITICAL: {
    dot: "bg-rose-400 animate-ping",
    text: "text-rose-400",
    label: "CRIT",
  },
};

export const STATUS_CONFIG = {
  running: "bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/25",
  paused: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  stopped: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  error: "bg-rose-500/10 text-rose-400 border border-rose-500/25",
};
