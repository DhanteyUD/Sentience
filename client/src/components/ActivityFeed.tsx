import { motion, AnimatePresence } from "framer-motion";
import type { FeedItem } from "../types";
import { timeAgo, ACTION_COLORS } from "../lib/utils";

interface ActivityFeedProps {
  items: FeedItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="overflow-y-auto max-h-72 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
      <AnimatePresence initial={false}>
        {items.slice(0, 25).map((item, i) => (
          <motion.div
            key={`${item.agent}-${item.time}-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5 }}
            className="flex items-start gap-3 px-4.5 py-2.5 border-b border-(--border) last:border-0"
          >
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-white">
                  {item.agent}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                    ACTION_COLORS[item.action] || ACTION_COLORS.HOLD
                  }`}
                >
                  {item.action}
                </span>
              </div>
              {item.result && (
                <div className="font-mono text-[10px] text-zinc-400 mt-0.5 truncate">
                  {item.result}
                </div>
              )}
            </div>
            <div className="font-mono text-[9px] text-zinc-400 shrink-0 pt-0.5">
              {timeAgo(item.time)}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length === 0 && (
        <div className="px-5 py-8 text-center text-zinc-600 font-mono text-xs">
          Waiting for agent actions...
        </div>
      )}
    </div>
  );
}
