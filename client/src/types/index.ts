export type AgentType = 'TRADING' | 'LIQUIDITY' | 'MONITOR'
export type AgentStatus = 'running' | 'paused' | 'stopped' | 'error'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ActionLog {
  action: string
  result: string
  success: boolean
  timestamp: string
}

export interface Agent {
  id: string
  name: string
  type: AgentType
  strategy: string
  status: AgentStatus
  wallet: string
  balanceSOL: number
  cycleCount: number
  lastAction: string
  lastActionAt: string
  pnl: number
  color: string
  riskLevel: RiskLevel
  actionLog: ActionLog[]
}

export interface SystemState {
  agents: Agent[]
  solPrice: number
  totalBalance: number
  txCount: number
  uptime: number
  uptimePct: number
}

export interface FeedItem {
  agent: string
  action: string
  color: string
  time: string
  result?: string
}
