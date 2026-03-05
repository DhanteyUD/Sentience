import { motion } from 'framer-motion'
import type { SystemState } from '../types'

interface MetricsRowProps {
  state: SystemState | null
}

export function MetricsRow({ state }: MetricsRowProps) {
  const running = state?.agents.filter(a => a.status === 'running').length ?? 0
  const hasAlert = state?.agents.some(a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL')
  const hasMedium = state?.agents.some(a => a.riskLevel === 'MEDIUM')

  const riskLabel = hasAlert ? 'HIGH' : hasMedium ? 'MED' : 'LOW'
  const riskColor = hasAlert ? 'text-rose-400' : hasMedium ? 'text-amber-400' : 'text-emerald-400'
  const riskSub   = hasAlert ? '⚠ alert firing' : hasMedium ? '~ watch closely' : 'nominal'

  const metrics = [
    {
      label: 'Active Agents',
      value: String(running),
      sub: 'autonomous',
      accent: 'from-cyan-500',
      valueColor: 'text-white',
    },
    {
      label: 'Total SOL',
      value: state ? state.totalBalance.toFixed(2) : '0.00',
      sub: 'across all wallets',
      accent: 'from-emerald-500',
      valueColor: 'text-white',
    },
    {
      label: 'Tx Count',
      value: state ? state.txCount.toLocaleString() : '0',
      sub: 'devnet transactions',
      accent: 'from-orange-500',
      valueColor: 'text-white',
    },
    {
      label: 'Risk Level',
      value: riskLabel,
      sub: riskSub,
      accent: hasAlert ? 'from-rose-500' : hasMedium ? 'from-amber-500' : 'from-emerald-500',
      valueColor: riskColor,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.4 }}
          className="relative bg-[#0d1117] border border-white/[0.07] rounded-xl p-5 overflow-hidden"
        >
          <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${m.accent} to-transparent`} />
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
            {m.label}
          </div>
          <div className={`font-mono text-3xl font-bold ${m.valueColor} leading-none mb-1`}>
            {m.value}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">{m.sub}</div>
        </motion.div>
      ))}
    </div>
  )
}
