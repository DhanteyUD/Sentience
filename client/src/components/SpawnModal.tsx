import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface SpawnModalProps {
  open: boolean
  onClose: () => void
  onSpawn: (name: string, type: string, strategy: string) => void
}

export function SpawnModal({ open, onClose, onSpawn }: SpawnModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('TRADING')
  const [strategy, setStrategy] = useState('DCA')

  const handleSubmit = () => {
    onSpawn(name || `Agent-${Date.now()}`, type, strategy)
    setName('')
    onClose()
  }

  const inputClass = "w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2.5 text-white font-mono text-sm outline-none focus:border-cyan-500/60 transition-colors placeholder:text-zinc-600"
  const labelClass = "block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5"

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-[420px] bg-[#0d1117] border border-white/15 rounded-2xl p-7 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/50 via-cyan-500/20 to-transparent rounded-t-2xl" />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-white font-display">Deploy Agent</h2>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">Create a new autonomous wallet agent</p>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Agent Name</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Delta-Scalper"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Agent Type</label>
                <select className={inputClass} value={type} onChange={e => setType(e.target.value)}>
                  <option value="TRADING">Trading Agent</option>
                  <option value="LIQUIDITY">Liquidity Agent</option>
                  <option value="MONITOR">Monitor Agent</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Strategy</label>
                <select className={inputClass} value={strategy} onChange={e => setStrategy(e.target.value)}>
                  <option value="DCA">DCA (Dollar Cost Average)</option>
                  <option value="MOMENTUM">Momentum</option>
                  <option value="MEAN_REVERT">Mean Reversion</option>
                  <option value="RANDOM">Random</option>
                  <option value="BALANCED">Balanced</option>
                  <option value="WATCHDOG">Watchdog</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-mono text-zinc-400 border border-white/10 rounded-lg hover:border-white/20 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 text-sm font-mono font-bold bg-cyan-400 text-[#030712] rounded-lg hover:bg-cyan-300 transition-colors"
              >
                Deploy Agent →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
