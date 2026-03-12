const el = (id) => document.getElementById(id);

const statusPill = el('statusPill');
const startBtn = el('startBtn');
const stopBtn = el('stopBtn');
const refreshBtn = el('refreshBtn');
const chatBtn = el('chatBtn');
const cmdBtn = el('cmdBtn');
const logsEl = el('logs');

const hostEl = el('host');
const portEl = el('port');
const versionEl = el('version');
const usernameEl = el('username');
const passwordEl = el('password');
const authEl = el('auth');
const tokenEl = el('token');

const chatMsgEl = el('chatMsg');
const cmdMsgEl = el('cmdMsg');

function tokenHeader() {
  const t = tokenEl.value.trim();
  return t ? { 'x-control-token': t } : {};
}

function setStatus(connected, text) {
  statusPill.textContent = text;
  statusPill.classList.remove('ok', 'bad');
  statusPill.classList.add(connected ? 'ok' : 'bad');
  stopBtn.disabled = !connected;
  chatBtn.disabled = !connected;
  cmdBtn.disabled = !connected;
}

function appendLog(line) {
  logsEl.textContent += line + "\n";
  logsEl.scrollTop = logsEl.scrollHeight;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(opts.headers || {}),
      ...tokenHeader(),
    },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(json.error || json.raw || `HTTP ${res.status}`);
  return json;
}

async function refreshStatus() {
  const s = await api('/api/status', { method: 'GET' });
  if (s.running) setStatus(true, `Connected as ${s.username || 'bot'}`);
  else setStatus(false, 'Disconnected');
}

startBtn.addEventListener('click', async () => {
  logsEl.textContent = '';
  appendLog('Starting bot...');
  try {
    const payload = {
      server: {
        host: hostEl.value.trim(),
        port: Number(portEl.value || 25565),
        version: versionEl.value.trim() || false,
      },
      bot: {
        username: usernameEl.value.trim(),
        password: passwordEl.value,
        auth: authEl.value,
      },
    };
    const r = await api('/api/start', { method: 'POST', body: JSON.stringify(payload) });
    appendLog(r.message);
    await refreshStatus();
  } catch (e) {
    appendLog('Start failed: ' + e.message);
    await refreshStatus().catch(() => {});
  }
});

stopBtn.addEventListener('click', async () => {
  appendLog('Stopping bot...');
  try {
    const r = await api('/api/stop', { method: 'POST', body: '{}' });
    appendLog(r.message);
    await refreshStatus();
  } catch (e) {
    appendLog('Stop failed: ' + e.message);
  }
});

refreshBtn.addEventListener('click', async () => {
  try { await refreshStatus(); } catch (e) { appendLog('Status failed: ' + e.message); }
});

chatBtn.addEventListener('click', async () => {
  try {
    const msg = chatMsgEl.value.trim();
    if (!msg) return;
    await api('/api/chat', { method: 'POST', body: JSON.stringify({ message: msg }) });
    appendLog('[CHAT] ' + msg);
    chatMsgEl.value = '';
  } catch (e) {
    appendLog('Chat failed: ' + e.message);
  }
});

cmdBtn.addEventListener('click', async () => {
  try {
    const cmd = cmdMsgEl.value.trim();
    if (!cmd) return;
    await api('/api/command', { method: 'POST', body: JSON.stringify({ command: cmd }) });
    appendLog('[CMD] /' + cmd);
    cmdMsgEl.value = '';
  } catch (e) {
    appendLog('Command failed: ' + e.message);
  }
});

// Logs stream
try {
  const es = new EventSource('/api/logs');
  es.onmessage = (ev) => appendLog(ev.data);
  es.onerror = () => {};
} catch {}

(async function init() {
  portEl.value = '25565';
  await refreshStatus().catch(() => setStatus(false, 'Disconnected'));
})();
