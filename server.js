const express = require('express');
const path = require('path');
const MinecraftBot = require('./bot.js');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CONTROL_TOKEN = process.env.BOT_CONTROL_TOKEN || '';

let bot = null;
let lastConfig = null;

const logClients = new Set();
function pushLog(line) {
  const msg = String(line ?? '');
  process.stdout.write(msg.endsWith('\n') ? msg : msg + '\n');
  for (const res of logClients) {
    try {
      res.write(`data: ${msg.replace(/\n/g, '\\n')}\n\n`);
    } catch {
      // ignore
    }
  }
}

function requireToken(req, res, next) {
  if (!CONTROL_TOKEN) return next();
  const t = req.header('x-control-token');
  if (t && t === CONTROL_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  logClients.add(res);
  res.write('data: connected\n\n');

  req.on('close', () => {
    logClients.delete(res);
  });
});

app.get('/api/status', requireToken, (req, res) => {
  res.json({
    running: !!bot,
    username: bot?.bot?.username || null,
    server: lastConfig?.server || null
  });
});

app.post('/api/start', requireToken, async (req, res) => {
  try {
    if (bot) return res.status(400).json({ error: 'Bot already running' });

    const cfg = req.body;
    lastConfig = cfg;

    bot = new MinecraftBot({
      logger: pushLog,
      configOverride: cfg
    });
    await bot.connect();

    res.json({ message: 'Bot started' });
  } catch (error) {
    bot = null;
    res.status(500).json({ error: error?.message || String(error) });
  }
});

app.post('/api/stop', requireToken, (req, res) => {
  try {
    if (bot) {
      bot.disconnect();
      bot = null;
    }
    res.json({ message: 'Bot stopped' });
  } catch (error) {
    res.status(500).json({ error: error?.message || String(error) });
  }
});

app.post('/api/chat', requireToken, (req, res) => {
  try {
    if (!bot) return res.status(400).json({ error: 'Bot not running' });
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Missing message' });
    bot.chat(message);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error?.message || String(error) });
  }
});

app.post('/api/command', requireToken, (req, res) => {
  try {
    if (!bot) return res.status(400).json({ error: 'Bot not running' });
    const command = String(req.body?.command || '').trim();
    if (!command) return res.status(400).json({ error: 'Missing command' });
    bot.executeCommand(command);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error?.message || String(error) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  pushLog(`Bot control server running on port ${PORT}`);
});
