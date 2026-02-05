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

const proxyGroups = ['Auto - SG', 'Direct', 'US Premium', 'JP Gaming', 'ID Streaming'];
const rules = [
  'DOMAIN-SUFFIX,google.com,US Premium',
  'DOMAIN-SUFFIX,netflix.com,ID Streaming',
  'GEOIP,ID,Direct',
  'MATCH,Auto - SG'
];

let selectedProxy = proxyGroups[0];
let trafficDownHistory = Array(60).fill(0);
let trafficUpHistory = Array(60).fill(0);

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

function appendLog(line) {
  const timestamp = new Date().toLocaleTimeString('id-ID');
  logOutput.textContent = `[${timestamp}] ${line}\n${logOutput.textContent}`.slice(0, 3000);
}

function renderProxies() {
  proxyList.innerHTML = '';
  proxyGroups.forEach((proxy) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.textContent = proxy;
    if (proxy === selectedProxy) button.classList.add('selected');

    button.addEventListener('click', () => {
      selectedProxy = proxy;
      activeProxy.textContent = selectedProxy;
      appendLog(`Switched active proxy to ${selectedProxy}`);
      renderProxies();
    });

    li.appendChild(button);
    proxyList.appendChild(li);
  });
}

function renderRules() {
  rulesList.innerHTML = '';
  rules.forEach((rule) => {
    const li = document.createElement('li');
    li.className = 'card';
    li.textContent = rule;
    rulesList.appendChild(li);
  });
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

toggleCore.addEventListener('click', () => {
  coreStatus.textContent = 'Restarting...';
  appendLog('Core restart requested');
  setTimeout(() => {
    coreStatus.textContent = 'Running';
    appendLog('Core is running');
  }, 1200);
});

function randomTraffic() {
  const down = Math.round(Math.random() * 1200 + 50);
  const up = Math.round(Math.random() * 400 + 20);
  const conn = Math.round(Math.random() * 220 + 30);

  trafficDownHistory.push(down);
  trafficUpHistory.push(up);
  trafficDownHistory = trafficDownHistory.slice(-60);
  trafficUpHistory = trafficUpHistory.slice(-60);

  downloadRate.textContent = `${down} KB/s`;
  uploadRate.textContent = `${up} KB/s`;
  connections.textContent = conn;
  activeProxy.textContent = selectedProxy;

  drawChart();

  if (Math.random() > 0.55) {
    appendLog(`TCP tunnel updated • down=${down}KB/s up=${up}KB/s conn=${conn}`);
  }
}

renderProxies();
renderRules();
randomTraffic();
setInterval(randomTraffic, 1500);
dashboardMode.textContent = navigator.onLine ? 'Offline-capable UI' : 'Offline (No Internet)';
appendLog('Dashboard initialized (offline-capable)');
