import { useState, useEffect, useRef } from "react";
import type { SystemState, FeedItem } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function useWebSocket() {
  const [state, setState] = useState<SystemState | null>(null);
  const [connected, setConnected] = useState(false);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const prevStateRef = useRef<SystemState | null>(null);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      let wsUrl: string;

      if (import.meta.env.DEV) {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else {
        const base = API_BASE || window.location.origin;
        const wsProtocol = base.startsWith("https") ? "wss:" : "ws:";
        const wsHost = base.replace(/^https?:\/\//, "");
        wsUrl = `${wsProtocol}//${wsHost}`;
      }

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        console.log("WebSocket connected");
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "STATE_UPDATE") {
            const next: SystemState = msg.data;
            setState(next);
            setPriceHistory((prev) => {
              const updated = [...prev, next.solPrice];
              return updated.length > 60 ? updated.slice(-60) : updated;
            });
            const prev = prevStateRef.current;
            if (prev) {
              const newItems: FeedItem[] = [];
              next.agents.forEach((agent) => {
                const prevAgent = prev.agents.find((a) => a.id === agent.id);
                if (
                  prevAgent &&
                  agent.lastActionAt !== prevAgent.lastActionAt
                ) {
                  newItems.push({
                    agent: agent.name,
                    action: agent.lastAction,
                    color: agent.color,
                    time: new Date().toISOString(),
                    result: agent.actionLog?.[0]?.result,
                  });
                }
              });
              if (newItems.length > 0)
                setFeed((f) => [...newItems, ...f].slice(0, 50));
            }
            prevStateRef.current = next;
          }
        } catch {
          console.error("Failed to parse WebSocket message:", e.data);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        retryTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }

    connect();

    return () => {
      clearTimeout(retryTimeout);
      wsRef.current?.close();
    };
  }, []);

  const controlAgent = async (
    id: string,
    action: "pause" | "resume" | "stop",
  ) => {
    await fetch(`${API_BASE}/api/agents/${id}/${action}`, { method: "POST" });
  };

  const spawnAgent = async (name: string, type: string, strategy: string) => {
    await fetch(`${API_BASE}/api/agents/spawn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, strategy }),
    });
  };

  return { state, connected, priceHistory, feed, controlAgent, spawnAgent };
}
