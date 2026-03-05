import { motion } from 'framer-motion'
import { ExternalLink, Pause, Play, Square } from 'lucide-react'
import type { Agent } from '../types'
import { timeAgo, ACTION_COLORS, RISK_CONFIG, STATUS_CONFIG } from '../lib/utils'

interface AgentCardProps {
  agent: Agent
  index: number
  onControl: (id: string, action: 'pause' | 'resume' | 'stop') => void
}

export function AgentCard({ agent, index, onControl }: AgentCardProps) {
  const risk = RISK_CONFIG[agent.riskLevel] || RISK_CONFIG.LOW
  const actionColor = ACTION_COLORS[agent.lastAction] || ACTION_COLORS.HOLD
  const statusStyle = STATUS_CONFIG[agent.status] || STATUS_CONFIG.stopped

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className={`relative bg-[#161b22] border border-white/[0.07] rounded-xl p-4 overflow-hidden transition-all hover:border-white/15 ${
        agent.status !== 'running' ? 'opacity-60' : ''
      }`}
    >
      {/* Left accent bar */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: agent.color }}
      />

      {/* Risk dot */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${risk.dot}`} />

      {/* Top row */}
      <div className="flex items-start justify-between mb-3 pl-2">
        <div>
          <div className="text-sm font-bold text-white">{agent.name}</div>
          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
            {agent.type} · {agent.strategy}
          </div>
        </div>
        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-full tracking-wide ${statusStyle}`}>
          {agent.status}
        </span>
      </div>

      {/* Wallet address */}
      <div className="font-mono text-[10px] text-zinc-600 mb-3 pl-2 truncate">
        {agent.wallet}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 pl-2">
        {[
          { val: agent.balanceSOL.toFixed(3), label: 'SOL' },
          { val: String(agent.cycleCount), label: 'Cycles' },
          {
            val: `${agent.pnl >= 0 ? '+' : ''}${agent.pnl.toFixed(1)}%`,
            label: 'PnL',
            color: agent.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400',
          },
        ].map(({ val, label, color }) => (
          <div key={label} className="bg-[#0d1117] rounded-lg px-2 py-2">
            <div className={`font-mono text-sm font-bold ${color || 'text-white'}`}>{val}</div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-wide mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Last action */}
      <div className="flex items-center gap-2 pl-2 mb-3">
        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${actionColor}`}>
          {agent.lastAction}
        </span>
        <span className="text-[10px] text-zinc-600 font-mono">
          {timeAgo(agent.lastActionAt)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-2 pl-2">
        {agent.status === 'running' ? (
          <button
            onClick={() => onControl(agent.id, 'pause')}
            className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-md border border-white/10 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
          >
            <Pause size={10} /> Pause
          </button>
        ) : (
          <button
            onClick={() => onControl(agent.id, 'resume')}
            className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-md border border-white/10 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
          >
            <Play size={10} /> Resume
          </button>
        )}
        <button
          onClick={() => onControl(agent.id, 'stop')}
          className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-md border border-white/10 text-zinc-400 hover:border-rose-500/50 hover:text-rose-400 transition-colors"
        >
          <Square size={10} /> Stop
        </button>
        <a
          href={`https://explorer.solana.com/address/${agent.wallet}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-md border border-white/10 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors ml-auto"
        >
          <ExternalLink size={10} /> Explorer
        </a>
      </div>
    </motion.div>
  )
}
