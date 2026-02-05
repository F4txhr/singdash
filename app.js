const navButtons = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const sectionTitle = document.getElementById('sectionTitle');
const coreStatus = document.getElementById('coreStatus');
const toggleCore = document.getElementById('toggleCore');

const downloadRate = document.getElementById('downloadRate');
const uploadRate = document.getElementById('uploadRate');
const connections = document.getElementById('connections');
const activeProxy = document.getElementById('activeProxy');
const logOutput = document.getElementById('logOutput');
const proxyList = document.getElementById('proxyList');
const rulesList = document.getElementById('rulesList');
const dashboardMode = document.getElementById('dashboardMode');

const controllerUrlInput = document.getElementById('controllerUrl');
const controllerSecretInput = document.getElementById('controllerSecret');
const saveConfigButton = document.getElementById('saveConfig');

const defaultConfig = {
  baseUrl: localStorage.getItem('singdash.baseUrl') || 'http://127.0.0.1:9090',
  secret: localStorage.getItem('singdash.secret') || ''
};

let config = { ...defaultConfig };
let selectedProxy = '-';
let proxyGroups = [];
let proxyState = {};
let trafficDownHistory = Array(60).fill(0);
let trafficUpHistory = Array(60).fill(0);
let usingDemoMode = false;
let logsSocket;

function appendLog(line, level = 'INFO') {
  const timestamp = new Date().toLocaleTimeString('id-ID');
  logOutput.textContent = `[${timestamp}] [${level}] ${line}\n${logOutput.textContent}`.slice(0, 4000);
}

function apiHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (config.secret) headers.Authorization = `Bearer ${config.secret}`;
  return headers;
}

async function apiGet(path) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'GET',
    headers: apiHeaders()
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed (${response.status})`);
  }

  return response.json();
}

async function apiPut(path, body) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'PUT',
    headers: apiHeaders(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`PUT ${path} failed (${response.status})`);
  }

  return response;
}

function drawChart() {
  const canvas = document.getElementById('trafficChart');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#2b3a60';
  ctx.lineWidth = 1;

  for (let y = 0; y <= h; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const maxVal = Math.max(...trafficDownHistory, ...trafficUpHistory, 1);

  const drawLine = (history, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((v, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = h - (v / maxVal) * (h - 10) - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  drawLine(trafficDownHistory, '#4f8cff');
  drawLine(trafficUpHistory, '#2cd49b');
}

function formatRate(bytesPerSecond) {
  const kb = Math.round((bytesPerSecond || 0) / 1024);
  return `${kb} KB/s`;
}

function renderProxies() {
  proxyList.innerHTML = '';

  if (!proxyGroups.length) {
    const li = document.createElement('li');
    li.className = 'card';
    li.textContent = 'Belum ada data proxy group dari API.';
    proxyList.appendChild(li);
    return;
  }

  proxyGroups.forEach((groupName) => {
    const state = proxyState[groupName];
    const li = document.createElement('li');
    const button = document.createElement('button');
    const activeNow = state?.now || '-';

    button.innerHTML = `<strong>${groupName}</strong><br/><small>Now: ${activeNow}</small>`;
    if (activeNow === selectedProxy) button.classList.add('selected');

    button.addEventListener('click', async () => {
      if (!state?.all?.length) {
        appendLog(`Group ${groupName} tidak punya kandidat proxy`, 'WARN');
        return;
      }

      const currentIndex = state.all.findIndex((x) => x === activeNow);
      const nextProxy = state.all[(currentIndex + 1) % state.all.length];

      try {
        await apiPut(`/proxies/${encodeURIComponent(groupName)}`, { name: nextProxy });
        appendLog(`Switched ${groupName} -> ${nextProxy}`);
        await refreshProxies();
      } catch (error) {
        appendLog(error.message, 'ERROR');
      }
    });

    li.appendChild(button);
    proxyList.appendChild(li);
  });
}

function renderRules(rules = []) {
  rulesList.innerHTML = '';

  if (!rules.length) {
    const li = document.createElement('li');
    li.className = 'card';
    li.textContent = 'Belum ada data rules dari API.';
    rulesList.appendChild(li);
    return;
  }

  rules.slice(0, 80).forEach((rule) => {
    const li = document.createElement('li');
    li.className = 'card';
    li.textContent = `${rule.type || 'RULE'} | ${rule.payload || '-'} -> ${rule.proxy || '-'}`;
    rulesList.appendChild(li);
  });
}

async function refreshTraffic() {
  const data = await apiGet('/traffic');
  const down = data.down || 0;
  const up = data.up || 0;

  trafficDownHistory.push(down);
  trafficUpHistory.push(up);
  trafficDownHistory = trafficDownHistory.slice(-60);
  trafficUpHistory = trafficUpHistory.slice(-60);

  downloadRate.textContent = formatRate(down);
  uploadRate.textContent = formatRate(up);
  drawChart();
}

async function refreshConnections() {
  const data = await apiGet('/connections');
  const total = data.connections?.length ?? 0;
  connections.textContent = total;
}

async function refreshProxies() {
  const data = await apiGet('/proxies');
  const proxies = data.proxies || {};
  proxyState = proxies;

  proxyGroups = Object.keys(proxies).filter((name) => Array.isArray(proxies[name]?.all));

  if (proxyGroups.length) {
    const firstGroup = proxyState[proxyGroups[0]];
    selectedProxy = firstGroup?.now || '-';
    activeProxy.textContent = selectedProxy;
  }

  renderProxies();
}

async function refreshRules() {
  const data = await apiGet('/rules');
  renderRules(data.rules || []);
}

function connectLogsSocket() {
  if (logsSocket) logsSocket.close();

  try {
    const wsUrl = config.baseUrl.replace(/^http/i, 'ws') + '/logs';
    const params = new URLSearchParams({ level: 'info' });
    if (config.secret) params.set('token', config.secret);

    logsSocket = new WebSocket(`${wsUrl}?${params.toString()}`);

    logsSocket.onopen = () => appendLog('Connected log stream');
    logsSocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        appendLog(msg.payload || event.data, (msg.type || 'INFO').toUpperCase());
      } catch {
        appendLog(event.data, 'INFO');
      }
    };
    logsSocket.onerror = () => appendLog('Log stream unavailable (tetap lanjut polling metrik)', 'WARN');
  } catch {
    appendLog('WebSocket logs tidak tersedia', 'WARN');
  }
}

function startDemoFallback() {
  if (usingDemoMode) return;
  usingDemoMode = true;
  dashboardMode.textContent = 'Demo Mode (API gagal terhubung)';
  coreStatus.textContent = 'Disconnected';
  appendLog('Masuk demo mode karena API tidak bisa diakses', 'WARN');

  const fallbackGroups = ['Auto - SG', 'Direct', 'US Premium'];
  proxyGroups = fallbackGroups;
  proxyState = Object.fromEntries(
    fallbackGroups.map((name) => [name, { now: fallbackGroups[0], all: fallbackGroups }])
  );
  selectedProxy = fallbackGroups[0];
  activeProxy.textContent = selectedProxy;
  renderProxies();
  renderRules([
    { type: 'MATCH', payload: 'ALL', proxy: 'Auto - SG' },
    { type: 'GEOIP', payload: 'ID', proxy: 'Direct' }
  ]);

  setInterval(() => {
    const down = Math.round(Math.random() * 1200 * 1024);
    const up = Math.round(Math.random() * 400 * 1024);
    trafficDownHistory.push(down);
    trafficUpHistory.push(up);
    trafficDownHistory = trafficDownHistory.slice(-60);
    trafficUpHistory = trafficUpHistory.slice(-60);
    downloadRate.textContent = formatRate(down);
    uploadRate.textContent = formatRate(up);
    connections.textContent = Math.round(Math.random() * 220 + 30);
    drawChart();
  }, 1500);
}

async function runSyncLoop() {
  try {
    await Promise.all([refreshTraffic(), refreshConnections(), refreshProxies(), refreshRules()]);
    coreStatus.textContent = 'Running';
    dashboardMode.textContent = 'Live API Mode';
    usingDemoMode = false;
  } catch (error) {
    coreStatus.textContent = 'API Error';
    appendLog(error.message, 'ERROR');
    startDemoFallback();
  }
}

async function reconnect() {
  config.baseUrl = controllerUrlInput.value.trim().replace(/\/$/, '');
  config.secret = controllerSecretInput.value.trim();

  localStorage.setItem('singdash.baseUrl', config.baseUrl);
  localStorage.setItem('singdash.secret', config.secret);

  dashboardMode.textContent = 'Connecting...';
  appendLog(`Connecting to ${config.baseUrl}`);
  await runSyncLoop();
  connectLogsSocket();
}

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    navButtons.forEach((b) => b.classList.remove('active'));
    sections.forEach((s) => s.classList.remove('active'));

    button.classList.add('active');
    const section = document.getElementById(button.dataset.section);
    section.classList.add('active');
    sectionTitle.textContent = button.textContent;
  });
});

saveConfigButton.addEventListener('click', reconnect);
toggleCore.addEventListener('click', reconnect);

controllerUrlInput.value = config.baseUrl;
controllerSecretInput.value = config.secret;

drawChart();
appendLog('Dashboard initialized');
reconnect();
setInterval(() => {
  if (!usingDemoMode) runSyncLoop();
}, 2000);
