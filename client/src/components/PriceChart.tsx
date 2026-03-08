import { useEffect, useRef } from "react";

declare global {
  interface Window {
    TradingView: { widget: new (...args: unknown[]) => unknown };
  }
}

interface PriceChartProps {
  history: number[];
  currentPrice?: number;
}

const CONTAINER_ID = "sentience_sol_chart";
const SYMBOL = "BINANCE:SOLUSDT";

export function PriceChart({ history, currentPrice }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetReady = useRef(false);

  const price = currentPrice ?? history.at(-1) ?? 0;
  const change =
    history.length >= 2
      ? ((history.at(-1)! - history[0]) / history[0]) * 100
      : 0;
  const isUp = change >= 0;

  useEffect(() => {
    if (!containerRef.current) return;

    const createWidget = () => {
      if (!window.TradingView || !document.getElementById(CONTAINER_ID)) return;
      if (widgetReady.current) return;

      new window.TradingView.widget({
        autosize: true,
        symbol: SYMBOL,
        interval: "15",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1", // candlestick
        container_id: CONTAINER_ID,
        toolbar_bg: "#0d1117",
        hide_top_toolbar: true,
        hide_side_toolbar: true,
        hide_legend: true,
        allow_symbol_change: false,
        save_image: false,
        details: false,
        hotlist: false,
        calendar: false,
        withdateranges: false,
        enable_publishing: false,
        backgroundColor: "#0d1117",
        gridColor: "rgba(255,255,255,0.04)",
        overrides: {
          "paneProperties.background": "#0d1117",
          "paneProperties.backgroundType": "solid",
          "paneProperties.vertGridProperties.color": "rgba(255,255,255,0.04)",
          "paneProperties.horzGridProperties.color": "rgba(255,255,255,0.04)",
          "scalesProperties.backgroundColor": "#0d1117",
          "scalesProperties.textColor": "#4b5563",
          "mainSeriesProperties.candleStyle.upColor": "#22c55e",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.borderUpColor": "#22c55e",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#22c55e",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
        },
      });

      widgetReady.current = true;
    };

    const initWidget = () => {
      if (window.TradingView) {
        createWidget();
      } else {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = createWidget;
        document.head.appendChild(script);
      }
    };

    initWidget();

    const interval = setInterval(() => {
      const el = document.getElementById(CONTAINER_ID);
      if (el) el.innerHTML = "";
      widgetReady.current = false;
      createWidget();
    }, 15000);

    return () => {
      clearInterval(interval);
      const el = document.getElementById(CONTAINER_ID);
      if (el) el.innerHTML = "";
      widgetReady.current = false;
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header bar — shows live price from your WebSocket data */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500 flex items-center gap-1.5">
            <span className="text-cyan-400">◇</span> SOL / USD
          </span>
          {price > 0 && (
            <span className="font-mono text-[13px] font-bold text-white">
              ${price.toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider text-zinc-500">
            15m
          </span>
          {price > 0 && (
            <span
              className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                isUp
                  ? "text-green-400 bg-green-400/10"
                  : "text-red-400 bg-red-400/10"
              }`}
            >
              {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* TradingView chart — real OHLCV candlestick data from Binance */}
      <div className="h-64">
        <div id={CONTAINER_ID} ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
