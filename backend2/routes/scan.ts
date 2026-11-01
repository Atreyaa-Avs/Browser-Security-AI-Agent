import { Router, Request, Response } from 'express';
import { ScopeValidator } from '../utils/scopeValidator';
import { StagehandAgent } from '../agent/stagehandAgent';
import { ExplorationAgent, ExplorationResult } from '../agent/explorationAgent';
import { SecurityAgent, EnrichedVulnerability } from '../agent/securityAgent';
import { GroqService } from '../services/groqService';
import { ReportFormatter, ScanReport } from '../utils/reportFormatter';

export interface ScanSession {
  id: string;
  targetUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted';
  step: string;
  progress: number;
  startedAt: number;
  completedAt?: number;
  logs: { timestamp: number; type: string; message: string; data?: any }[];
  exploration?: ExplorationResult;
  findings: EnrichedVulnerability[];
  report?: ScanReport;
  error?: string;
  agentInstance?: StagehandAgent;
}

const scanSessions = new Map<string, ScanSession>();
const activeClients = new Map<string, Set<(data: any) => void>>();

export function broadcastScanEvent(scanId: string, event: any) {
  const listeners = activeClients.get(scanId);
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {}
    }
  }
}

export function registerScanListener(scanId: string, listener: (data: any) => void): () => void {
  if (!activeClients.has(scanId)) {
    activeClients.set(scanId, new Set());
  }
  activeClients.get(scanId)!.add(listener);

  return () => {
    activeClients.get(scanId)?.delete(listener);
  };
}

export const scanRouter = Router();

// 1. Start Scan
scanRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { url, maxPages, maxDepth } = req.body;
    const validation = ScopeValidator.isValidTarget(url);

    if (!validation.valid || !validation.normalizedUrl) {
      return res.status(400).json({ error: validation.reason || 'Invalid URL' });
    }

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session: ScanSession = {
      id: scanId,
      targetUrl: validation.normalizedUrl,
      status: 'pending',
      step: 'Initializing agent',
      progress: 5,
      startedAt: Date.now(),
      logs: [],
      findings: []
    };

    scanSessions.set(scanId, session);

    // Launch autonomous agent asynchronously
    runAutonomousScan(session, maxPages, maxDepth).catch((err) => {
      console.error(`[Scan ${scanId}] Fatal error:`, err);
      session.status = 'failed';
      session.error = err.message;
      session.progress = 100;
      broadcastScanEvent(scanId, { type: 'scan.failed', error: err.message });
    });

    res.json({
      success: true,
      scanId,
      targetUrl: validation.normalizedUrl,
      status: 'running',
      message: 'Autonomous Stagehand security scan initiated'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Scan Status
scanRouter.get('/:id', (req: Request, res: Response) => {
  const session = scanSessions.get(String(req.params.id));
  if (!session) {
    return res.status(404).json({ error: 'Scan session not found' });
  }

  res.json({
    id: session.id,
    targetUrl: session.targetUrl,
    status: session.status,
    step: session.step,
    progress: session.progress,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    logs: session.logs.slice(-100),
    endpointsCount: session.exploration?.endpoints.length || 0,
    surfacesCount: session.exploration?.surfaces.length || 0,
    findings: session.findings,
    report: session.report,
    error: session.error
  });
});

// 3. Stop/Abort Scan
scanRouter.post('/:id/stop', async (req: Request, res: Response) => {
  const session = scanSessions.get(String(req.params.id));
  if (!session) {
    return res.status(404).json({ error: 'Scan session not found' });
  }

  if (session.status === 'running' || session.status === 'pending') {
    session.status = 'aborted';
    session.step = 'Scan manually aborted';
    if (session.agentInstance) {
      await session.agentInstance.close().catch(() => {});
    }
    broadcastScanEvent(session.id, { type: 'scan.aborted' });
    return res.json({ success: true, message: 'Scan stopped' });
  }

  res.json({ success: true, message: `Scan already ${session.status}` });
});

// 4. Download / View Report
scanRouter.get('/:id/report', (req: Request, res: Response) => {
  const session = scanSessions.get(String(req.params.id));
  if (!session) {
    return res.status(404).json({ error: 'Scan session not found' });
  }

  if (!session.report) {
    return res.status(400).json({ error: 'Scan report not yet available' });
  }

  const format = (req.query.format as string) || 'json';
  if (format === 'markdown' || format === 'md') {
    const md = ReportFormatter.toMarkdown(session.report);
    res.setHeader('Content-Type', 'text/markdown');
    return res.send(md);
  }

  res.json(session.report);
});

// 5. Scan History
scanRouter.get('/', (_req: Request, res: Response) => {
  const list = Array.from(scanSessions.values()).map(s => ({
    id: s.id,
    targetUrl: s.targetUrl,
    status: s.status,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    findingsCount: s.findings.length,
    securityScore: s.report?.securityScore ?? null,
    grade: s.report?.grade ?? null
  }));

  res.json(list.reverse());
});

/**
 * Background autonomous pipeline executor
 */
async function runAutonomousScan(session: ScanSession, maxPages?: number, maxDepth?: number) {
  session.status = 'running';
  session.step = 'Initializing Stagehand Browser Agent';
  session.progress = 10;

  const appendLog = (type: string, message: string, data?: any) => {
    const entry = { timestamp: Date.now(), type, message, data };
    session.logs.push(entry);
    broadcastScanEvent(session.id, { type: 'scan.log', log: entry });
  };

  appendLog('info', `Scan started for ${session.targetUrl}`);

  const scope = new ScopeValidator(session.targetUrl, { allowSubdomains: false, maxDepth: maxDepth || 3 });
  const groq = new GroqService();

  const stagehand = new StagehandAgent({
    logCallback: (level, msg, data) => {
      appendLog(level, msg, data);
    }
  });
  session.agentInstance = stagehand;

  try {
    // Phase 1, 2, 3: Autonomous Website Exploration & Dynamic Form Discovery
    session.step = 'Phase 2: Autonomous website exploration and attack surface discovery';
    session.progress = 25;
    appendLog('phase', 'Launching autonomous exploration agent...');

    const explorationAgent = new ExplorationAgent(stagehand, scope, groq, (step, msg, data) => {
      appendLog(step, msg, data);
    });

    const explorationResult = await explorationAgent.run(session.targetUrl);
    session.exploration = explorationResult;
    session.progress = 60;
    appendLog('success', `Exploration finished. Visited ${explorationResult.visitedUrls.length} pages, cataloged ${explorationResult.surfaces.length} attack surfaces.`);

    // Phase 4 & 5: Five Vulnerability Detectors + Groq AI Analysis
    session.step = 'Phase 4 & 5: Running 5 vulnerability detectors and Groq AI reasoning';
    session.progress = 75;
    appendLog('phase', 'Launching deterministic security detection engine & Groq AI analysis...');

    const securityAgent = new SecurityAgent(stagehand, groq, (type, msg, data) => {
      appendLog(type, msg, data);
    });

    const findings = await securityAgent.runDetection(explorationResult);
    session.findings = findings;
    session.progress = 90;

    // Phase 6: Executive Summary & Report Generation
    session.step = 'Phase 6: Generating executive summary and security audit report';
    appendLog('phase', 'Synthesizing final executive assessment with Groq AI...');

    const durationSeconds = Math.round((Date.now() - session.startedAt) / 1000);
    const summary = await groq.generateExecutiveSummary({
      targetUrl: session.targetUrl,
      durationSeconds,
      pagesVisited: explorationResult.visitedUrls.length,
      formsTested: explorationResult.surfaces.length,
      findingsCount: findings.length,
      findingsSummary: findings.map(f => ({ type: f.type, severity: f.aiAnalysis.severity }))
    });

    const finalReport = ReportFormatter.format(
      session.id,
      session.targetUrl,
      durationSeconds,
      explorationResult,
      findings,
      summary
    );

    session.report = finalReport;
    session.status = 'completed';
    session.step = 'Scan completed successfully';
    session.progress = 100;
    session.completedAt = Date.now();

    appendLog('complete', `Autonomous audit finished in ${durationSeconds}s. Security Score: ${finalReport.securityScore}/100 (Grade ${finalReport.grade})`);
    broadcastScanEvent(session.id, { type: 'scan.completed', report: finalReport });
  } catch (err: any) {
    session.status = 'failed';
    session.error = err.message;
    session.step = `Scan failed: ${err.message}`;
    appendLog('error', `Agent execution failed: ${err.message}`);
    broadcastScanEvent(session.id, { type: 'scan.failed', error: err.message });
  } finally {
    await stagehand.close().catch(() => {});
  }
}
