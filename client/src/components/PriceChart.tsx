import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";

interface PriceChartProps {
  history: number[];
}

export function PriceChart({ history }: PriceChartProps) {
  const data = history.map((price, i) => ({ i, price }));
  const change =
    history.length >= 2
      ? ((history.at(-1)! - history[0]) / history[0]) * 100
      : 0;
  const isUp = change >= 0;

  return (
    <div>
      <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-(--border)">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-(--muted) flex items-center gap-2">
          <span className="text-cyan-400">◇</span> SOL PRICE (SIMULATED)
        </span>
        <span
          className={`font-mono text-[11px] font-bold ${isUp ? "text-cyan-400" : "text-rose-400"}`}
        >
          {isUp ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </div>
      <div className="h-28 px-2 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -40, bottom: 0 }}
          >
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-cyan-400">
                    ${Number(payload[0].value).toFixed(2)}
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#00d4ff"
              strokeWidth={2}
              fill="url(#priceGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
