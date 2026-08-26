const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const os = require('os');
const http = require('http');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const APP_NAME = process.env.APP_NAME || 'AWS EC2 Node Server';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allows self-contained interactive dashboard UI
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Cache start time for uptime calculation
const startTime = new Date();

// Helper: Query AWS IMDSv2 metadata (if running on EC2)
async function getEC2Metadata() {
  return new Promise((resolve) => {
    const tokenReq = http.request(
      {
        host: '169.254.169.254',
        path: '/latest/api/token',
        method: 'PUT',
        headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '60' },
        timeout: 800,
      },
      (res) => {
        let token = '';
        res.on('data', (chunk) => (token += chunk));
        res.on('end', () => {
          if (!token) return resolve(null);
          // Query instance ID with token
          const metaReq = http.request(
            {
              host: '169.254.169.254',
              path: '/latest/meta-data/instance-id',
              method: 'GET',
              headers: { 'X-aws-ec2-metadata-token': token },
              timeout: 800,
            },
            (metaRes) => {
              let instanceId = '';
              metaRes.on('data', (c) => (instanceId += c));
              metaRes.on('end', () => resolve({ isEC2: true, instanceId: instanceId.trim() }));
            }
          );
          metaReq.on('error', () => resolve({ isEC2: true, instanceId: 'detected (unavailable)' }));
          metaReq.end();
        });
      }
    );
    tokenReq.on('error', () => resolve({ isEC2: false, note: 'Not running on EC2 or IMDSv2 unreachable' }));
    tokenReq.on('timeout', () => {
      tokenReq.destroy();
      resolve({ isEC2: false, note: 'Local / Non-EC2 environment' });
    });
    tokenReq.end();
  });
}

// 1. Health check endpoint (for AWS ALB / ELB Target Groups & monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    appName: APP_NAME,
    environment: NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// 2. System and Host Details API
app.get('/api/system', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  res.status(200).json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    nodeVersion: process.version,
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    memory: {
      totalMB: Math.round(totalMem / (1024 * 1024)),
      usedMB: Math.round(usedMem / (1024 * 1024)),
      freeMB: Math.round(freeMem / (1024 * 1024)),
      usagePercent: ((usedMem / totalMem) * 100).toFixed(1) + '%'
    },
    uptimeSeconds: Math.floor(process.uptime()),
    loadAvg: os.loadavg()
  });
});

// 3. Application Info API with AWS EC2 detection
app.get('/api/info', async (req, res) => {
  const ec2Info = await getEC2Metadata();

  res.status(200).json({
    appName: APP_NAME,
    version: '1.0.0',
    environment: NODE_ENV,
    port: PORT,
    startedAt: startTime.toISOString(),
    ec2: ec2Info,
    clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress
  });
});

// 4. Echo endpoint for test requests
app.post('/api/echo', (req, res) => {
  res.status(200).json({
    message: 'Echo received successfully',
    receivedBody: req.body,
    headers: {
      host: req.headers.host,
      userAgent: req.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  });
});

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================`);
  console.log(`🚀 ${APP_NAME} is live!`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`🩺 Health Check:     http://localhost:${PORT}/health`);
  console.log(`📊 System Info:      http://localhost:${PORT}/api/system`);
  console.log(`🔧 Environment:      ${NODE_ENV}`);
  console.log(`=============================================`);
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed cleanly.');
    process.exit(0);
  });

  // Force close after 10s if stuck
  setTimeout(() => {
    console.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
