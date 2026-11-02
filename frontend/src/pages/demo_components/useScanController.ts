import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BACKEND_URL,
  LOCAL_LAB_URL,
  WS_URL,
  type DiscoveredEndpoint,
  type EnrichedVulnerability,
  type ScanLog,
  type ScanMode,
  type ScanReport,
  type ScanStatus,
  type StagehandOutput,
  type TabKey,
} from './types';

interface StartScanOverrides {
  mode?: ScanMode;
  url?: string;
}

export function useScanController() {
  const [targetUrl, setTargetUrl] = useState(LOCAL_LAB_URL);
  const [scanMode, setScanMode] = useState<ScanMode>('stagehand-only');
  const [maxPages, setMaxPages] = useState(8);
  const [maxDepth] = useState(2);

  const [scanId, setScanId] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [step, setStep] = useState('Ready to test');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [stagehandOutput, setStagehandOutput] = useState<StagehandOutput | null>(null);
  const [findings, setFindings] = useState<EnrichedVulnerability[]>([]);
  const [endpoints, setEndpoints] = useState<DiscoveredEndpoint[]>([]);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('stagehand');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`)
      .then((res) => res.json())
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!scanId || status === 'completed' || status === 'failed' || status === 'aborted') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/scan/${scanId}`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        setStep(data.step);
        setProgress(data.progress);
        if (data.stagehandOutput) setStagehandOutput(data.stagehandOutput);
        if (data.findings) setFindings(data.findings);
        if (data.report) setReport(data.report);
        if (data.logs) {
          setLogs((prev) => (data.logs.length > prev.length ? data.logs : prev));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [scanId, status]);

  const connectWs = useCallback((id: string) => {
    wsRef.current?.close();
    try {
      const ws = new WebSocket(`${WS_URL}/ws?scanId=${id}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'scan.log' && msg.log) {
            setLogs((prev) => [...prev, msg.log]);
          } else if (msg.type === 'scan.completed') {
            setStatus('completed');
            setProgress(100);
            setStep('Completed successfully');
            if (msg.stagehandOutput) {
              setStagehandOutput(msg.stagehandOutput);
              setActiveTab('stagehand');
            }
            if (msg.report) {
              setReport(msg.report);
              if (msg.report.findings) setFindings(msg.report.findings);
              if (msg.report.endpoints) setEndpoints(msg.report.endpoints);
            }
          } else if (msg.type === 'scan.failed') {
            setStatus('failed');
            setStep(`Failed: ${msg.error || 'Unknown error'}`);
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onerror = () => {
        console.warn('WebSocket connection error, fallback to polling');
      };
    } catch {
      /* ignore socket construction failures */
    }
  }, []);

  const startScan = useCallback(
    async ({ mode, url }: StartScanOverrides = {}) => {
      const urlToUse = url || targetUrl;
      const modeToUse = mode || scanMode;
      if (!urlToUse) return;

      setStatus('running');
      setProgress(5);
      setStep(
        `Initializing Stagehand Browser Agent (${
          modeToUse === 'stagehand-only' ? 'Stagehand Only Mode' : 'Full Audit Mode'
        })...`
      );
      setLogs([]);
      setStagehandOutput(null);
      setFindings([]);
      setEndpoints([]);
      setReport(null);
      setActiveTab(modeToUse === 'stagehand-only' ? 'stagehand' : 'logs');

      try {
        const res = await fetch(`${BACKEND_URL}/api/scan/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToUse, maxPages, maxDepth, mode: modeToUse }),
        });

        const data = await res.json();
        if (!res.ok) {
          setStatus('failed');
          setStep(data.error || 'Failed to start scan');
          return;
        }

        setScanId(data.scanId);
        connectWs(data.scanId);
      } catch (err) {
        setStatus('failed');
        setStep(err instanceof Error ? err.message : 'Cannot reach Backend2 server');
      }
    },
    [connectWs, maxDepth, maxPages, scanMode, targetUrl]
  );

  const stopScan = useCallback(async () => {
    if (!scanId) return;
    try {
      await fetch(`${BACKEND_URL}/api/scan/${scanId}/stop`, { method: 'POST' });
      setStatus('aborted');
      setStep('Scan stopped by user');
    } catch {
      /* keep the previous status when the abort request fails */
    }
  }, [scanId]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    targetUrl,
    setTargetUrl,
    scanMode,
    setScanMode,
    maxPages,
    setMaxPages,
    scanId,
    status,
    step,
    progress,
    logs,
    stagehandOutput,
    findings,
    endpoints,
    report,
    activeTab,
    setActiveTab,
    backendOnline,
    startScan,
    stopScan,
    clearLogs,
  };
}

export type ScanController = ReturnType<typeof useScanController>;
