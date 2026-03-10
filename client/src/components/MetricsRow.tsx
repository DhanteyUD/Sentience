import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { SystemState } from '../types'

interface MetricsRowProps {
  state: SystemState | null
}

export function MetricsRow({ state }: MetricsRowProps) {
  const ticksRef = useRef<number[]>([])
  const [dpm, setDpm] = useState(0)

  useEffect(() => {
    if (!state) return
    const running = state.agents.filter(a => a.status === 'running').length
    if (running === 0) return
    const now = Date.now()
    ticksRef.current.push(...Array(running).fill(now))
    
    // keep only ticks from the last 60 seconds
    ticksRef.current = ticksRef.current.filter(t => now - t < 60_000)
    setDpm(ticksRef.current.length)
  }, [state])

  const running = state?.agents.filter(a => a.status === 'running').length ?? 0
  const hasAlert = state?.agents.some(a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL')
  const hasMedium = state?.agents.some(a => a.riskLevel === 'MEDIUM')

  const riskLabel = hasAlert ? 'HIGH' : hasMedium ? 'MED' : 'LOW'
  const riskColor = hasAlert ? 'text-rose-400' : hasMedium ? 'text-amber-400' : 'text-[#39ff14]'
  const riskSub   = hasAlert ? '⚠ agent alert firing' : hasMedium ? '~ monitoring closely' : 'system nominal'

  const metrics = [
    {
      label: "Active Agents",
      value: String(running),
      sub: "↑ autonomous",
      accentStyle: { background: "var(--cyan)" },
      valueStyle: "text-[var(--text)] text-[26px]",
      subColor: "text-[var(--green)]",
    },
    {
      label: "Total SOL",
      value: state ? state.totalBalance.toFixed(2) : "0.00",
      sub: "across all wallets",
      accentStyle: { background: "var(--green)" },
      valueStyle: "text-[var(--text)] text-[26px]",
      subColor: "text-white",
    },
    {
      label: "Decisions / min",
      value: String(dpm),
      sub: "↑ autonomous actions",
      accentStyle: { background: "var(--orange)" },
      valueStyle: "text-[var(--text)] text-[26px]",
      subColor: "text-[var(--green)]",
    },
    {
      label: "Risk Level",
      value: riskLabel,
      sub: riskSub,
      accentStyle: {
        background: hasAlert
          ? "var(--red)"
          : hasMedium
            ? "var(--yellow)"
            : "var(--purple)",
      },
      valueStyle: riskColor + " text-[18px]",
      subColor: hasAlert
        ? "text-[var(--red)]"
        : hasMedium
          ? "text-[var(--yellow)]"
          : "text-[var(--green)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.4 }}
          className="relative bg-[#0d1117] border border-white/[0.07] rounded-[10px] p-4.5 overflow-hidden scanline-bg"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5" style={m.accentStyle} />
          <div className="text-[10px] uppercase text-(--muted) font-semibold">
            {m.label}
          </div>
          <div className={`font-mono font-bold ${m.valueStyle} leading-none mt-2 mb-1`}>
            {m.value}
          </div>
          <div className={`text-[11px] font-mono mt-1.5 ${m.subColor}`}>{m.sub}</div>
        </motion.div>
      ))}
    </div>
  );
}
