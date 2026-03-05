import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Select from "react-select";
import type { StylesConfig } from "react-select";

type Option = { value: string; label: string };

const typeOptions: Option[] = [
  { value: "TRADING", label: "Trading Agent" },
  { value: "LIQUIDITY", label: "Liquidity Agent" },
  { value: "MONITOR", label: "Monitor Agent" },
];

const strategyOptions: Option[] = [
  { value: "DCA", label: "DCA (Dollar Cost Average)" },
  { value: "MOMENTUM", label: "Momentum" },
  { value: "MEAN_REVERT", label: "Mean Reversion" },
  { value: "RANDOM", label: "Random" },
  { value: "BALANCED", label: "Balanced" },
  { value: "WATCHDOG", label: "Watchdog" },
];

const selectStyles: StylesConfig<Option> = {
  control: (base, state) => ({
    ...base,
    background: "var(--surface2)",
    border: `1px solid ${state.isFocused ? "var(--cyan)" : "var(--border-bright)"}`,
    borderRadius: "0.5rem",
    boxShadow: "none",
    fontFamily: "monospace",
    fontSize: "0.875rem",
    minHeight: "42px",
    cursor: "pointer",
    "&:hover": { borderColor: "var(--cyan)" },
  }),
  menu: (base) => ({
    ...base,
    background: "#0d1117",
    border: "1px solid var(--border-bright)",
    borderRadius: "0.5rem",
    overflow: "hidden",
  }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected
      ? "var(--cyan)"
      : state.isFocused
      ? "rgba(34,211,238,0.1)"
      : "transparent",
    color: state.isSelected ? "#030712" : "var(--text)",
    fontFamily: "monospace",
    fontSize: "0.875rem",
    cursor: "pointer",
  }),
  singleValue: (base) => ({ ...base, color: "var(--text)", fontFamily: "monospace" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, color: "var(--muted)", padding: "0 8px" }),
};

interface SpawnModalProps {
  open: boolean;
  onClose: () => void;
  onSpawn: (name: string, type: string, strategy: string) => void;
}

export function SpawnModal({ open, onClose, onSpawn }: SpawnModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("TRADING");
  const [strategy, setStrategy] = useState("DCA");

  const handleSubmit = () => {
    onSpawn(name || `Agent-${Date.now()}`, type, strategy);
    setName("");
    onClose();
  };

  const inputClass =
    "w-full bg-[var(--surface2)] border border-[var(--border-bright)] rounded-lg px-3 py-2.5 text-[var(--text)] font-mono text-sm outline-none focus:border-[var(--cyan)] transition-colors placeholder:text-[var(--muted)]";
  const labelClass =
    "block text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] font-bold mb-1.5";

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
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-105 bg-[#0d1117] border border-white/15 rounded-2xl p-7 shadow-2xl scanline-bg border-t-2 border-t-cyan-500/50"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-black text-white font-display">
                  Spawn New Agent
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                  Create a new autonomous wallet agent
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-white transition-colors"
              >
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
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Agent Type</label>
                <Select
                  styles={selectStyles}
                  options={typeOptions}
                  value={typeOptions.find((o) => o.value === type)}
                  onChange={(opt) => setType((opt as Option)?.value ?? "TRADING")}
                  isSearchable={false}
                />
              </div>

              <div>
                <label className={labelClass}>Strategy</label>
                <Select
                  styles={selectStyles}
                  options={strategyOptions}
                  value={strategyOptions.find((o) => o.value === strategy)}
                  onChange={(opt) => setStrategy((opt as Option)?.value ?? "DCA")}
                  isSearchable={false}
                />
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
  );
}
