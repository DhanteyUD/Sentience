import { formatUptime } from "../lib/utils";
import type { SystemState } from "../types";

interface HeaderProps {
  state: SystemState | null;
}

export function Stat({ state }: HeaderProps) {
  return (
    <header className="md:hidden sticky top-0 flex mb-10">
      <div className="flex items-center justify-between gap-3 w-full">
        {[
          {
            label: "SOL Price",
            value: state ? `$${state.solPrice.toFixed(2)}` : "—",
          },
          {
            label: "Total Balance",
            value: state ? `${state.totalBalance.toFixed(3)} SOL` : "—",
          },
          {
            label: "Transactions",
            value: state ? state.txCount.toLocaleString() : "0",
          },
          {
            label: "Uptime",
            value: state ? formatUptime(state.uptime) : "00:00",
          },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="font-mono text-sm font-bold text-cyan-400">
              {value}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[#8b949e] mt-0.5">
              {label}
            </div>
          </div>
        ))}
      </div>
    </header>
  );
}
