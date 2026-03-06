import type { Agent } from "../types";
import { shortAddress, STATUS_CONFIG } from "../lib/utils";

interface WalletTableProps {
  agents: Agent[];
}

export function WalletTable({ agents }: WalletTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.07]">
            {["Agent", "Address", "Balance", "Status"].map((h) => (
              <th
                key={h}
                className="text-left px-5 py-2.5 text-[9px] uppercase tracking-widest text-zinc-400 font-bold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr
              key={agent.id}
              className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors"
            >
              <td className="px-5 py-3 text-xs font-bold text-white">
                {agent.name}
              </td>
              <td className="px-5 py-3">
                <a
                  href={`https://explorer.solana.com/address/${agent.wallet}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {shortAddress(agent.wallet)}
                </a>
              </td>
              <td className="px-5 py-3 font-mono text-[10px] text-[#00d4ff]">
                {agent.balanceSOL.toFixed(3)} SOL
              </td>
              <td className="px-5 py-3">
                <span
                  className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-full tracking-wide ${STATUS_CONFIG[agent.status]}`}
                >
                  {agent.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
