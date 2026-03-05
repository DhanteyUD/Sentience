import { useState, useEffect, useRef } from 'react'
import type { SystemState } from '../types'

export function useWebSocket() {
  const [state, setState] = useState<SystemState | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>

    function connect() {
      // In dev, Vite proxies /ws → ws://localhost:3000
      // In production, connect directly on same host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = import.meta.env.DEV
        ? `${protocol}//${host}/ws`
        : `${protocol}//${host}`

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setConnected(true)
        console.log('WebSocket connected')
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'STATE_UPDATE') setState(msg.data)
        } catch {}
      }

      ws.onclose = () => {
        setConnected(false)
        retryTimeout = setTimeout(connect, 2000)
      }

      ws.onerror = () => ws.close()
      wsRef.current = ws
    }

    connect()

    return () => {
      clearTimeout(retryTimeout)
      wsRef.current?.close()
    }
  }, [])

  const controlAgent = async (id: string, action: 'pause' | 'resume' | 'stop') => {
    await fetch(`/api/agents/${id}/${action}`, { method: 'POST' })
  }

  const spawnAgent = async (name: string, type: string, strategy: string) => {
    await fetch('/api/agents/spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, strategy }),
    })
  }

  return { state, connected, controlAgent, spawnAgent }
}
