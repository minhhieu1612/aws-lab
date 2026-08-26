async function fetchSystemData() {
  try {
    const [sysRes, infoRes] = await Promise.all([
      fetch('/api/system'),
      fetch('/api/info')
    ]);

    if (!sysRes.ok || !infoRes.ok) throw new Error('API request failed');

    const sys = await sysRes.json();
    const info = await infoRes.json();

    // Update status badge
    document.getElementById('statusText').innerText = 'Online & Healthy';
    document.getElementById('envBadge').innerText = info.environment;

    // Update host & EC2 info
    document.getElementById('hostPlatform').innerText = `${sys.platform} (${sys.arch})`;
    document.getElementById('hostname').innerText = sys.hostname;
    document.getElementById('clientIp').innerText = info.clientIp || '127.0.0.1';

    const instElem = document.getElementById('instanceId');
    if (info.ec2 && info.ec2.isEC2) {
      instElem.innerText = `AWS EC2 (${info.ec2.instanceId})`;
      instElem.classList.add('highlight');
    } else {
      instElem.innerText = 'Local / Non-EC2 (Ready for AWS)';
    }

    // Telemetry stats
    document.getElementById('statUptime').innerText = formatUptime(sys.uptimeSeconds);
    document.getElementById('statNodeVer').innerText = sys.nodeVersion;
    document.getElementById('statCpus').innerText = `${sys.cpus} Cores`;

    // Memory bar
    document.getElementById('memText').innerText = `${sys.memory.usedMB} MB / ${sys.memory.totalMB} MB`;
    document.getElementById('memPercent').innerText = sys.memory.usagePercent;
    document.getElementById('memProgress').style.width = sys.memory.usagePercent;
  } catch (err) {
    document.getElementById('statusText').innerText = 'Server Offline / Error';
    document.getElementById('serverStatusBadge').style.borderColor = '#ef4444';
    document.getElementById('serverStatusBadge').style.color = '#ef4444';
    console.error('Failed fetching telemetry:', err);
  }
}

function formatUptime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

async function testEndpoint(url, method = 'GET', payload = null) {
  const statusElem = document.getElementById('responseStatus');
  const timeElem = document.getElementById('responseTime');
  const jsonElem = document.getElementById('responseJson');

  statusElem.innerText = 'Sending...';
  jsonElem.innerHTML = '<code>Waiting for server response...</code>';

  const t0 = performance.now();
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (payload && method === 'POST') {
      opts.body = JSON.stringify(payload);
    }
    const res = await fetch(url, opts);
    const duration = Math.round(performance.now() - t0);
    const data = await res.json();

    statusElem.innerText = `${res.status} ${res.statusText}`;
    statusElem.style.color = res.ok ? '#10b981' : '#ef4444';
    timeElem.innerText = `${duration}ms`;
    jsonElem.innerHTML = `<code>${JSON.stringify(data, null, 2)}</code>`;
  } catch (err) {
    const duration = Math.round(performance.now() - t0);
    statusElem.innerText = 'Fetch Failed';
    statusElem.style.color = '#ef4444';
    timeElem.innerText = `${duration}ms`;
    jsonElem.innerHTML = `<code>Error: ${err.message}</code>`;
  }
}

// Event Listeners
document.getElementById('btnRefresh').addEventListener('click', fetchSystemData);

// Initial Load and recurring poll every 10s
fetchSystemData();
setInterval(fetchSystemData, 10000);
