import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

interface PriceChartProps {
  history: number[]
  currentPrice: number
}

export function PriceChart({ history, currentPrice }: PriceChartProps) {
  const data = history.map((price, i) => ({ i, price }))
  const change = history.length >= 2
    ? ((history.at(-1)! - history[0]) / history[0]) * 100
    : 0
  const isUp = change >= 0

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            ◇ SOL / USD
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold text-white">
            ${currentPrice.toFixed(2)}
          </span>
          <span className={`font-mono text-xs font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="h-28 px-2 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -40, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isUp ? '#00d4ff' : '#f43f5e'} stopOpacity={0.25} />
                <stop offset="95%" stopColor={isUp ? '#00d4ff' : '#f43f5e'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={['auto', 'auto']} hide />
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
              stroke={isUp ? '#00d4ff' : '#f43f5e'}
              strokeWidth={2}
              fill="url(#priceGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
