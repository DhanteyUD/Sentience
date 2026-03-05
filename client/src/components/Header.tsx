import { formatUptime } from '../lib/utils'
import type { SystemState } from '../types'

interface HeaderProps {
  state: SystemState | null
  connected: boolean
}

export function Header({ state, connected }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-7 py-4 border-b border-white/[0.07] bg-[#0d1117]/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="relative w-9 h-9 flex-shrink-0">
          <div
            className="absolute inset-0 bg-cyan-400 animate-pulse"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          />
          <div
            className="absolute inset-[3px] bg-[#0d1117]"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          />
        </div>
        <div>
          <div className="text-lg font-black tracking-tight text-white font-display">
            SENTIENCE
          </div>
          <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
            Solana Devnet
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-8">
        {[
          { label: 'SOL Price',      value: state ? `$${state.solPrice.toFixed(2)}` : '—' },
          { label: 'Total Balance',  value: state ? `${state.totalBalance.toFixed(3)} SOL` : '—' },
          { label: 'Transactions',   value: state ? state.txCount.toLocaleString() : '0' },
          { label: 'Uptime',         value: state ? formatUptime(state.uptime) : '00:00' },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="font-mono text-sm font-bold text-cyan-400">{value}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold border transition-colors ${
        connected
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
        {connected ? 'ONLINE' : 'OFFLINE'}
      </div>
    </header>
  )
}
