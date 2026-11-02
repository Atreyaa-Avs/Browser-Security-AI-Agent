import { Router, Request, Response } from 'express';
import { ScopeValidator } from '../utils/scopeValidator';
import { StagehandAgent, ObservedElement, ExtractedFormData } from '../agent/stagehandAgent';
import { ExplorationAgent, ExplorationResult } from '../agent/explorationAgent';
import { SecurityAgent, EnrichedVulnerability } from '../agent/securityAgent';
import { GroqService } from '../services/groqService';
import { ReportFormatter, ScanReport } from '../utils/reportFormatter';

export interface StagehandOutput {
  title: string;
  url: string;
  status: number;
  screenshot?: string;
  interactiveElements: ObservedElement[];
  forms: ExtractedFormData[];
  links: { href: string; text: string }[];
  scripts: string[];
  metaTags: Record<string, string>;
  cookies: any[];
  headers: Record<string, string>;
  exploredPages?: { url: string; title: string; linksCount: number; formsCount: number }[];
}

export interface ScanSession {
  id: string;
  targetUrl: string;
  mode: 'stagehand-only' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted';
  step: string;
  progress: number;
  startedAt: number;
  completedAt?: number;
  logs: { timestamp: number; type: string; message: string; data?: any }[];
  stagehandOutput?: StagehandOutput;
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
    const { url, maxPages, maxDepth, mode } = req.body;
    const scanMode: 'stagehand-only' | 'full' = mode === 'stagehand-only' ? 'stagehand-only' : 'full';
    const validation = ScopeValidator.isValidTarget(url);

    if (!validation.valid || !validation.normalizedUrl) {
      return res.status(400).json({ error: validation.reason || 'Invalid URL' });
    }

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session: ScanSession = {
      id: scanId,
      targetUrl: validation.normalizedUrl,
      mode: scanMode,
      status: 'pending',
      step: 'Initializing agent',
      progress: 5,
      startedAt: Date.now(),
      logs: [],
      findings: []
    };

    scanSessions.set(scanId, session);

    // Launch autonomous agent asynchronously
    runScanSession(session, maxPages, maxDepth).catch((err) => {
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
      mode: scanMode,
      status: 'running',
      message: scanMode === 'stagehand-only' 
        ? 'Stagehand Browser exploration started' 
        : 'Full autonomous security scan initiated'
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
    mode: session.mode,
    status: session.status,
    step: session.step,
    progress: session.progress,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    logs: session.logs.slice(-150),
    stagehandOutput: session.stagehandOutput,
    endpointsCount: session.exploration?.endpoints.length || session.stagehandOutput?.links.length || 0,
    surfacesCount: session.exploration?.surfaces.length || session.stagehandOutput?.forms.length || 0,
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
    mode: s.mode,
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
 * Runner that routes according to mode
 */
async function runScanSession(session: ScanSession, maxPages?: number, maxDepth?: number) {
  if (session.mode === 'stagehand-only') {
    await runStagehandOnly(session);
  } else {
    await runFullAudit(session, maxPages, maxDepth);
  }
}

/**
 * Stagehand-Only Mode: Tests and displays Stagehand browser actions (goto, observe, extract, act, screenshot)
 */
async function runStagehandOnly(session: ScanSession) {
  session.status = 'running';
  session.step = 'Stagehand: Initializing browser engine';
  session.progress = 15;

  const appendLog = (type: string, message: string, data?: any) => {
    const entry = { timestamp: Date.now(), type, message, data };
    session.logs.push(entry);
    broadcastScanEvent(session.id, { type: 'scan.log', log: entry });
  };

  appendLog('info', `Stagehand exploration test initiated for: ${session.targetUrl}`);

  const stagehand = new StagehandAgent({
    logCallback: (level, msg, data) => appendLog(level, msg, data)
  });
  session.agentInstance = stagehand;

  try {
    // 1. Stagehand Init
    await stagehand.init();
    session.progress = 30;

    // 2. Stagehand goto()
    session.step = `Stagehand: Executing goto('${session.targetUrl}')`;
    appendLog('stagehand', `Calling stagehand.goto('${session.targetUrl}')`);
    const navResult = await stagehand.goto(session.targetUrl);
    session.progress = 50;

    // 3. Stagehand observe()
    session.step = 'Stagehand: Executing observe() for interactive elements';
    appendLog('stagehand', `Calling stagehand.observe() to discover DOM interactive controls, buttons, and inputs`);
    const observedElements = await stagehand.observe('Discover all inputs, buttons, and clickable controls');
    session.progress = 70;

    // 4. Stagehand extract()
    session.step = 'Stagehand: Executing extract() for links, forms, and scripts';
    appendLog('stagehand', `Calling stagehand.extract() with structured schema`);
    const extractedData = await stagehand.extract('Extract structured navigation links, forms, and scripts');
    session.progress = 85;

    // 5. Stagehand screenshot & cookies
    const screenshot = await stagehand.captureScreenshot();
    const cookies = await stagehand.getCookies();
    const headers = stagehand.getHeaders();

    // 6. Explore 2-3 links with Stagehand goto()
    const exploredPages: { url: string; title: string; linksCount: number; formsCount: number }[] = [
      { url: session.targetUrl, title: navResult.title || extractedData.title, linksCount: extractedData.links.length, formsCount: extractedData.forms.length }
    ];

    const scope = new ScopeValidator(session.targetUrl);
    const candidateLinks = extractedData.links.filter(l => scope.isAllowed(l.href)).slice(0, 3);

    for (const link of candidateLinks) {
      appendLog('stagehand', `Stagehand navigating to internal link: ${link.href}`);
      const linkNav = await stagehand.goto(link.href, { timeout: 10000 });
      const linkExtract = await stagehand.extract('Extract secondary page information');
      exploredPages.push({
        url: link.href,
        title: linkNav.title || linkExtract.title,
        linksCount: linkExtract.links.length,
        formsCount: linkExtract.forms.length
      });
    }

    const output: StagehandOutput = {
      title: navResult.title || extractedData.title || 'Target Application',
      url: session.targetUrl,
      status: navResult.status,
      screenshot,
      interactiveElements: observedElements,
      forms: extractedData.forms,
      links: extractedData.links,
      scripts: extractedData.scripts,
      metaTags: extractedData.metaTags,
      cookies,
      headers,
      exploredPages
    };

    session.stagehandOutput = output;
    session.status = 'completed';
    session.step = `Stagehand exploration completed: ${observedElements.length} elements observed, ${extractedData.forms.length} forms, ${extractedData.links.length} links`;
    session.progress = 100;
    session.completedAt = Date.now();

    appendLog('complete', `Stagehand successfully processed page! Discovered ${observedElements.length} interactive elements, ${extractedData.forms.length} forms, and ${extractedData.links.length} links.`);
    broadcastScanEvent(session.id, { type: 'scan.completed', stagehandOutput: output });
  } catch (err: any) {
    session.status = 'failed';
    session.error = err.message;
    session.step = `Stagehand failed: ${err.message}`;
    appendLog('error', `Stagehand error: ${err.message}`);
    broadcastScanEvent(session.id, { type: 'scan.failed', error: err.message });
  } finally {
    await stagehand.close().catch(() => {});
  }
}

/**
 * Full Audit Mode: Exploration + 5 Detectors + Groq AI analysis
 */
async function runFullAudit(session: ScanSession, maxPages?: number, maxDepth?: number) {
  session.status = 'running';
  session.step = 'Initializing Stagehand Browser Agent';
  session.progress = 10;

  const appendLog = (type: string, message: string, data?: any) => {
    const entry = { timestamp: Date.now(), type, message, data };
    session.logs.push(entry);
    broadcastScanEvent(session.id, { type: 'scan.log', log: entry });
  };

  appendLog('info', `Full security audit started for ${session.targetUrl}`);

  const scope = new ScopeValidator(session.targetUrl, { allowSubdomains: false, maxDepth: maxDepth || 3 });
  const groq = new GroqService();

  const stagehand = new StagehandAgent({
    logCallback: (level, msg, data) => appendLog(level, msg, data)
  });
  session.agentInstance = stagehand;

  try {
    // 1. Exploration
    session.step = 'Phase 2: Autonomous website exploration and attack surface discovery';
    session.progress = 25;
    appendLog('phase', 'Launching autonomous exploration agent...');

    const explorationAgent = new ExplorationAgent(stagehand, scope, groq, (step, msg, data) => {
      appendLog(step, msg, data);
    });

    const explorationResult = await explorationAgent.run(session.targetUrl);
    session.exploration = explorationResult;
    session.progress = 60;

    // Capture screenshot & initial stagehand output for inspectability
    const screenshot = await stagehand.captureScreenshot();
    const cookies = await stagehand.getCookies();
    const headers = stagehand.getHeaders();
    session.stagehandOutput = {
      title: 'Target Homepage',
      url: session.targetUrl,
      status: stagehand.getStatusCode(),
      screenshot,
      interactiveElements: [],
      forms: explorationResult.surfaces.filter(s => s.form).map(s => s.form!),
      links: explorationResult.endpoints.map(e => ({ href: e.url, text: e.title || '' })),
      scripts: [],
      metaTags: {},
      cookies,
      headers
    };

    appendLog('success', `Exploration finished. Visited ${explorationResult.visitedUrls.length} pages, cataloged ${explorationResult.surfaces.length} attack surfaces.`);

    // 2. Detection
    session.step = 'Phase 4 & 5: Running 5 vulnerability detectors and Groq AI reasoning';
    session.progress = 75;
    appendLog('phase', 'Launching deterministic security detection engine & Groq AI analysis...');

    const securityAgent = new SecurityAgent(stagehand, groq, (type, msg, data) => {
      appendLog(type, msg, data);
    });

    const findings = await securityAgent.runDetection(explorationResult);
    session.findings = findings;
    session.progress = 90;

    // 3. Report
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
