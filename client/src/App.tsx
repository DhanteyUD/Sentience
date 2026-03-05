import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useWebSocket } from './hooks/useWebSocket'
import type { FeedItem } from './types' // type imports below
import { Header } from './components/Header'
import { MetricsRow } from './components/MetricsRow'
import { AgentCard } from './components/AgentCard'
import { ActivityFeed } from './components/ActivityFeed'
import { PriceChart } from './components/PriceChart'
import { WalletTable } from './components/WalletTable'
import { SpawnModal } from './components/SpawnModal'
import { SystemInfo } from './components/SystemInfo'

const CARD = "bg-[#0d1117] border border-white/[0.07] rounded-xl overflow-hidden"
const CARD_HEADER = "flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07]"
const SECTION_TITLE = "text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"

export default function App() {
  const { state, connected, controlAgent, spawnAgent } = useWebSocket()
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [priceHistory, setPriceHistory] = useState<number[]>([])
  const [spawnOpen, setSpawnOpen] = useState(false)
  const prevStateRef = useRef(state)

  useEffect(() => {
    if (!state) return
    setPriceHistory(prev => {
      const next = [...prev, state.solPrice]
      return next.length > 60 ? next.slice(-60) : next
    })
  }, [state?.solPrice])

  useEffect(() => {
    if (!state || !prevStateRef.current) {
      prevStateRef.current = state
      return
    }
    const prev = prevStateRef.current
    const newItems: FeedItem[] = []
    state.agents.forEach(agent => {
      const prevAgent = prev.agents.find(a => a.id === agent.id)
      if (prevAgent && agent.lastActionAt !== prevAgent.lastActionAt) {
        newItems.push({
          agent: agent.name,
          action: agent.lastAction,
          color: agent.color,
          time: new Date().toISOString(),
          result: agent.actionLog?.[0]?.result,
        })
      }
    })
    if (newItems.length > 0) setFeed(prev => [...newItems, ...prev].slice(0, 50))
    prevStateRef.current = state
  }, [state])

  return (
    <div className="min-h-screen bg-[#030712] text-white relative">
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.012) 2px, rgba(0,212,255,0.012) 4px)',
      }} />
      <div className="relative z-10">
        <Header state={state} connected={connected} />
        <main className="max-w-[1600px] mx-auto px-7 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
          <div className="space-y-5">
            <MetricsRow state={state} />
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={CARD}>
              <div className={CARD_HEADER}>
                <span className={SECTION_TITLE}>
                  <span className="text-cyan-400">◈</span> Autonomous Agents
                  {state && <span className="font-mono text-zinc-600 normal-case tracking-normal ml-1">({state.agents.filter(a => a.status === 'running').length} running)</span>}
                </span>
                <button onClick={() => setSpawnOpen(true)} className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/20 transition-colors">
                  <Plus size={10} /> Spawn Agent
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {state?.agents.map((agent, i) => (
                  <AgentCard key={agent.id} agent={agent} index={i} onControl={controlAgent} />
                ))}
                {!state && <div className="col-span-3 py-12 text-center text-zinc-600 font-mono text-sm">Connecting to agent system...</div>}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={CARD}>
              <div className={CARD_HEADER}>
                <span className={SECTION_TITLE}><span className="text-cyan-400">⇄</span> Live Transaction Feed</span>
                <span className="font-mono text-[10px] text-zinc-500">{feed.length} actions</span>
              </div>
              <ActivityFeed items={feed} />
            </motion.div>
          </div>
          <div className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={CARD}>
              <PriceChart history={priceHistory} currentPrice={state?.solPrice ?? 182.45} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className={CARD}>
              <div className={CARD_HEADER}>
                <span className={SECTION_TITLE}><span className="text-cyan-400">💳</span> Wallet Registry</span>
                <span className="font-mono text-[10px] text-zinc-500">{state?.agents.length ?? 0} wallets</span>
              </div>
              <WalletTable agents={state?.agents ?? []} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className={CARD}>
              <div className={CARD_HEADER}>
                <span className={SECTION_TITLE}><span className="text-cyan-400">⬡</span> System Info</span>
              </div>
              <SystemInfo />
            </motion.div>
          </div>
        </main>
      </div>
      <SpawnModal open={spawnOpen} onClose={() => setSpawnOpen(false)} onSpawn={spawnAgent} />
    </div>
  )
}
