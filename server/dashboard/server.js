const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ 
  server,
  // Accept connections on both root path (prod) and /ws path (dev via Vite proxy)
  handleProtocols: () => false,
});

app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
}));

function randBetween(min, max) { return Math.random() * (max - min) + min; }

function generateWalletAddress() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
  return Array.from({ length: 44 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const agentTemplates = [
  { name: 'Alpha-DCA',     type: 'TRADING',   strategy: 'DCA',         color: '#00d4ff' },
  { name: 'Beta-Momentum', type: 'TRADING',   strategy: 'MOMENTUM',    color: '#ff6b35' },
  { name: 'LP-Provider',   type: 'LIQUIDITY', strategy: 'BALANCED',    color: '#39ff14' },
  { name: 'Risk-Monitor',  type: 'MONITOR',   strategy: 'WATCHDOG',    color: '#ffd93d' },
  { name: 'Gamma-Revert',  type: 'TRADING',   strategy: 'MEAN_REVERT', color: '#c77dff' },
];

function getActionResult(action) {
  const results = {
    BUY:           `Bought 0.001 SOL at $${(182 + Math.random() * 5).toFixed(2)}`,
    SELL:          `Sold 0.001 SOL at $${(182 + Math.random() * 5).toFixed(2)}`,
    HOLD:          `Price $${(182 + Math.random() * 5).toFixed(2)} — holding position`,
    ADD_LIQUIDITY: `Added 0.3 SOL to LP pool — APR: ${(15 + Math.random() * 20).toFixed(1)}%`,
    HARVEST:       `Harvested ${(Math.random() * 0.1).toFixed(4)} USDC in fees`,
    REBALANCE:     `Pool rebalanced successfully`,
    MONITOR:       `Pool healthy`,
    RISK_CHECK:    `LOW risk (score: ${Math.floor(Math.random() * 25)}) — Position healthy`,
    ALERT:         `HIGH risk detected — unusual activity pattern`,
  };
  return results[action] || 'Action completed';
}

let systemState = {
  agents: agentTemplates.map((t, i) => ({
    id: `agent-${i + 1}`,
    ...t,
    status: 'running',
    wallet: generateWalletAddress(),
    balanceSOL: randBetween(0.5, 3),
    cycleCount: Math.floor(randBetween(0, 50)),
    lastAction: 'HOLD',
    lastActionAt: new Date().toISOString(),
    pnl: randBetween(-5, 15),
    actionLog: [],
    riskLevel: 'LOW',
  })),
  solPrice: 182.45,
  totalBalance: 0,
  txCount: 0,
  uptime: 0,
};

systemState.agents.forEach(agent => {
  const actions = agent.type === 'TRADING' ? ['BUY','SELL','HOLD','BUY','HOLD']
    : agent.type === 'LIQUIDITY' ? ['ADD_LIQUIDITY','HARVEST','MONITOR','REBALANCE','MONITOR']
    : ['RISK_CHECK','ALERT','RISK_CHECK','RISK_CHECK','MONITOR'];
  agent.actionLog = actions.map((action, i) => ({
    action, result: getActionResult(action), success: Math.random() > 0.1,
    timestamp: new Date(Date.now() - i * 5000).toISOString(),
  }));
});

setInterval(() => {
  systemState.uptime += 3;
  systemState.solPrice += (Math.random() - 0.49) * 0.5;
  systemState.solPrice = Math.max(170, Math.min(200, systemState.solPrice));

  systemState.agents.forEach(agent => {
    if (agent.status !== 'running') return;
    agent.cycleCount++;
    agent.balanceSOL = Math.max(0.01, agent.balanceSOL + (Math.random() - 0.5) * 0.002);
    agent.pnl += (Math.random() - 0.45) * 0.3;

    let action;
    if (agent.type === 'TRADING') {
      const r = Math.random();
      action = r < 0.3 ? 'BUY' : r < 0.5 ? 'SELL' : 'HOLD';
    } else if (agent.type === 'LIQUIDITY') {
      const r = Math.random();
      action = r < 0.2 ? 'ADD_LIQUIDITY' : r < 0.35 ? 'HARVEST' : r < 0.45 ? 'REBALANCE' : 'MONITOR';
    } else {
      action = Math.random() < 0.15 ? 'ALERT' : 'RISK_CHECK';
    }

    agent.lastAction = action;
    agent.lastActionAt = new Date().toISOString();
    agent.riskLevel = (agent.type === 'MONITOR' && action === 'ALERT') ? 'HIGH'
                    : agent.balanceSOL < 0.1 ? 'MEDIUM' : 'LOW';
    agent.actionLog.unshift({ action, result: getActionResult(action), success: Math.random() > 0.08, timestamp: new Date().toISOString() });
    if (agent.actionLog.length > 20) agent.actionLog.pop();
    systemState.txCount++;
  });

  systemState.totalBalance = systemState.agents.reduce((s, a) => s + a.balanceSOL, 0);
  const payload = JSON.stringify({ type: 'STATE_UPDATE', data: systemState });
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(payload); });
}, 3000);

// REST API
app.get('/api/state', (req, res) => res.json(systemState));

app.post('/api/agents/:id/pause', (req, res) => {
  const agent = systemState.agents.find(a => a.id === req.params.id);
  agent ? (agent.status = 'paused', res.json({ success: true })) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/agents/:id/resume', (req, res) => {
  const agent = systemState.agents.find(a => a.id === req.params.id);
  agent ? (agent.status = 'running', res.json({ success: true })) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/agents/:id/stop', (req, res) => {
  const agent = systemState.agents.find(a => a.id === req.params.id);
  agent ? (agent.status = 'stopped', res.json({ success: true })) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/agents/spawn', (req, res) => {
  const { name, type, strategy } = req.body;
  const colors = { TRADING: '#00d4ff', LIQUIDITY: '#39ff14', MONITOR: '#ffd93d' };
  const agent = {
    id: `agent-${Date.now()}`, name: name || `Agent-${systemState.agents.length + 1}`,
    type: type || 'TRADING', strategy: strategy || 'DCA', color: colors[type] || '#00d4ff',
    status: 'running', wallet: generateWalletAddress(), balanceSOL: 0, cycleCount: 0,
    lastAction: 'INIT', lastActionAt: new Date().toISOString(), pnl: 0, actionLog: [], riskLevel: 'LOW',
  };
  systemState.agents.push(agent);
  res.json(agent);
});

// Production: serve built React app
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      name: 'Sentience API', status: 'online', mode: 'development',
      message: 'React dashboard → http://localhost:5173',
      endpoints: ['GET /api/state','POST /api/agents/:id/pause','POST /api/agents/:id/resume','POST /api/agents/:id/stop','POST /api/agents/spawn'],
    });
  });
}

wss.on('connection', (ws) => {
  console.log('  ⚡ WebSocket client connected');
  ws.send(JSON.stringify({ type: 'STATE_UPDATE', data: systemState }));
  ws.on('close', () => console.log('  ✕ WebSocket client disconnected'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('\n' + '═'.repeat(50));
  console.log('  SENTIENCE — Agent Wallet System');
  console.log('═'.repeat(50));
  console.log(`  API    →  http://localhost:${PORT}/api/state`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`  UI     →  http://localhost:${PORT}`);
  } else {
    console.log(`  UI     →  http://localhost:5173  (run: npm run dev:client)`);
  }
  console.log('═'.repeat(50) + '\n');
});
