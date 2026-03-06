import { useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useWebSocket } from "./hooks/useWebSocket";
import { Header } from "./components/Header";
import { Stat } from "./components/Stat";
import { MetricsRow } from "./components/MetricsRow";
import { AgentCard } from "./components/AgentCard";
import { ActivityFeed } from "./components/ActivityFeed";
import { PriceChart } from "./components/PriceChart";
import { WalletTable } from "./components/WalletTable";
import { SpawnModal } from "./components/SpawnModal";
import { SystemInfo } from "./components/SystemInfo";

const CARD =
  "bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden scanline-bg";
const CARD_HEADER =
  "flex items-center justify-between px-[18px] py-[14px] border-b border-[var(--border)]";
const SECTION_TITLE =
  "text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted)] flex items-center gap-2";

export default function App() {
  const { state, connected, priceHistory, feed, controlAgent, spawnAgent } =
    useWebSocket();
  const [spawnOpen, setSpawnOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#030712] text-white relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.012) 2px, rgba(0,212,255,0.012) 4px)",
        }}
      />
      <div className="relative z-10">
        <Header state={state} connected={connected} />

        <main className="max-w-400 mx-auto px-7 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
          <div className="space-y-5">
            <Stat state={state} />
            <MetricsRow state={state} />

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={CARD}
            >
              <div className={CARD_HEADER}>
                <span className={SECTION_TITLE}>
                  <span className="text-[#00d4ff] animate-pulse">◈</span>{" "}
                  Autonomous Agents
                  {state && (
                    <span className="hidden md:block font-mono text-zinc-600 normal-case tracking-normal ml-1">
                      (
                      {
                        state.agents.filter((a) => a.status === "running")
                          .length
                      }{" "}
                      running)
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setSpawnOpen(true)}
                  className="flex items-center gap-1.5 text-[10px] cursor-pointer font-mono px-3 py-1.5 rounded-lg bg-cyan-500/10 text-[#00d4ff] border border-cyan-500/25 hover:bg-cyan-500/20 transition-colors"
                >
                  <Plus size={10} /> Spawn Agent
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                {state?.agents.map((agent, i) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    index={i}
                    onControl={controlAgent}
                  />
                ))}
                {!state && (
                  <div className="col-span-3 py-12 text-center text-zinc-600 font-mono text-sm">
                    Connecting to agent system...
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={CARD}
            >
              <div className={CARD_HEADER}>
                <span className={SECTION_TITLE}>
                  <span className="text-cyan-400">⇄</span> Live Transaction Feed
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {feed.length} actions
                </span>
              </div>
              <ActivityFeed items={feed} />
            </motion.div>
          </div>
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={CARD}
            >
              <PriceChart history={priceHistory} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={CARD}
            >
              <div className={CARD_HEADER}>
                <span className={SECTION_TITLE}>
                  <span className="text-cyan-400">💳</span> Wallet Registry
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {state?.agents.length ?? 0} wallets
                </span>
              </div>
              <WalletTable agents={state?.agents ?? []} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className={CARD}
            >
              <div className={CARD_HEADER}>
                <span className={SECTION_TITLE}>
                  <span className="text-cyan-400">⬡</span> System Info
                </span>
              </div>
              <SystemInfo />
            </motion.div>
          </div>
        </main>
      </div>
      <SpawnModal
        open={spawnOpen}
        onClose={() => setSpawnOpen(false)}
        onSpawn={spawnAgent}
      />
    </div>
  );
}
