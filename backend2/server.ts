import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { scanRouter, registerScanListener } from './routes/scan';
import { testLabRouter } from './routes/testLab';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend applications
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Browser Security AI Agent Backend2',
    engine: 'Stagehand + Groq',
    timestamp: new Date().toISOString()
  });
});

// Built-in Vulnerable Security Testing Lab
app.use('/test-lab', testLabRouter);

// Scan Routes
app.use('/api/scan', scanRouter);

// WebSocket Server for Real-Time Scan Logs & Telemetry
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket, req) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const scanId = url.searchParams.get('scanId');

    if (!scanId) {
      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Stagehand telemetry server (no scanId specified)' }));
      return;
    }

    ws.send(JSON.stringify({ type: 'subscribed', scanId, message: `Subscribed to live logs for scan ${scanId}` }));

    const unsubscribe = registerScanListener(scanId, (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });

    ws.on('close', () => {
      unsubscribe();
    });

    ws.on('error', () => {
      unsubscribe();
    });
  } catch (err) {
    console.error('[WebSocket] Connection error:', err);
  }
});

const PORT = parseInt(process.env.PORT || '4001', 10);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Stagehand Web Security Agent Backend2 running on PORT ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` Scan API:     http://localhost:${PORT}/api/scan`);
  console.log(` WebSocket:    ws://localhost:${PORT}/ws?scanId=<id>`);
  console.log(`=======================================================`);
});

export { app, server };
