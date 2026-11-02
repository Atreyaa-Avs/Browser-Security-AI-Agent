import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface ScanLog {
  timestamp: number;
  type: string;
  message: string;
  data?: any;
}

interface ObservedElement {
  id: string;
  tagName: string;
  type?: string;
  name?: string;
  selector: string;
  text: string;
  role?: string;
  placeholder?: string;
  isInteractive: boolean;
  isAuthRelated?: boolean;
}

interface ExtractedFormData {
  action: string;
  method: string;
  selector: string;
  inputs: {
    name: string;
    type: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
  }[];
}

interface StagehandOutput {
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

interface EnrichedVulnerability {
  id: string;
  type: string;
  subType?: string;
  url: string;
  parameter?: string;
  payload?: string;
  evidence: string;
  deterministicSeverity: string;
  aiAnalysis: {
    severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
    confidence: number;
    cvss: number;
    cwe: string;
    impact: string;
    exploitationProof: string;
    remediation: string;
    recommendationCode?: string;
  };
  detectedAt: number;
}

interface ScanReport {
  scanId: string;
  targetUrl: string;
  timestamp: string;
  durationSeconds: number;
  securityScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: {
    pagesVisited: number;
    endpointsDiscovered: number;
    attackSurfacesIdentified: number;
    totalVulnerabilities: number;
    severityCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
  };
  executiveSummary: string;
  findings: EnrichedVulnerability[];
  endpoints: any[];
}

const BACKEND_URL = 'http://localhost:4001';
const WS_URL = 'ws://localhost:4001';

export default function Demo() {
  const navigate = useNavigate();
  const [targetUrl, setTargetUrl] = useState('http://localhost:4001/test-lab');
  const [scanMode, setScanMode] = useState<'stagehand-only' | 'full'>('stagehand-only');
  const [maxPages, setMaxPages] = useState<number>(8);
  const [maxDepth, setMaxDepth] = useState<number>(2);

  const [scanId, setScanId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed' | 'aborted'>('idle');
  const [step, setStep] = useState<string>('Ready to test');
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [stagehandOutput, setStagehandOutput] = useState<StagehandOutput | null>(null);
  const [findings, setFindings] = useState<EnrichedVulnerability[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [activeTab, setActiveTab] = useState<'stagehand' | 'overview' | 'vulns' | 'surfaces' | 'logs'>('stagehand');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [detectorFilter, setDetectorFilter] = useState<string>('all');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Check Backend Status
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`)
      .then((res) => res.json())
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  // Poll scan state when running
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
        if (data.logs && data.logs.length > logs.length) setLogs(data.logs);
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [scanId, status, logs.length]);

  // Connect WebSocket for live logs
  const connectWs = (id: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
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
        } catch {}
      };

      ws.onerror = () => {
        console.warn('WebSocket connection error, fallback to polling');
      };
    } catch {}
  };

  const handleStartScan = async (overrideMode?: 'stagehand-only' | 'full', overrideUrl?: string) => {
    const urlToUse = overrideUrl || targetUrl;
    const modeToUse = overrideMode || scanMode;
    if (!urlToUse) return;

    setStatus('running');
    setProgress(5);
    setStep(`Initializing Stagehand Browser Agent (${modeToUse === 'stagehand-only' ? 'Stagehand Only Mode' : 'Full Audit Mode'})...`);
    setLogs([]);
    setStagehandOutput(null);
    setFindings([]);
    setEndpoints([]);
    setReport(null);

    // Switch tab to Stagehand output
    setActiveTab(modeToUse === 'stagehand-only' ? 'stagehand' : 'logs');

    try {
      const res = await fetch(`${BACKEND_URL}/api/scan/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToUse, maxPages, maxDepth, mode: modeToUse })
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus('failed');
        setStep(data.error || 'Failed to start scan');
        return;
      }

      setScanId(data.scanId);
      connectWs(data.scanId);
    } catch (err: any) {
      setStatus('failed');
      setStep(err.message || 'Cannot reach Backend2 server');
    }
  };

  const handleStopScan = async () => {
    if (!scanId) return;
    try {
      await fetch(`${BACKEND_URL}/api/scan/${scanId}/stop`, { method: 'POST' });
      setStatus('aborted');
      setStep('Scan stopped by user');
    } catch {}
  };

  const downloadReport = (format: 'json' | 'md') => {
    if (!report) return;
    let content = '';
    let mime = '';
    let filename = `security-audit-${scanId}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
      mime = 'application/json';
    } else {
      content = `# Autonomous Security Audit Report
Target: ${report.targetUrl}
Score: ${report.securityScore}/100 (Grade: ${report.grade})
Duration: ${report.durationSeconds}s

## Executive Summary
${report.executiveSummary}

## Vulnerabilities Found: ${report.metrics.totalVulnerabilities}
${report.findings
  .map(
    (f, idx) => `### ${idx + 1}. [${f.aiAnalysis.severity}] ${f.type} - ${f.parameter || f.url}
- Classification: ${f.aiAnalysis.cwe} (CVSS: ${f.aiAnalysis.cvss})
- Evidence: ${f.evidence}
- Impact: ${f.aiAnalysis.impact}
- Remediation: ${f.aiAnalysis.remediation}`
  )
  .join('\n\n')}
`;
      mime = 'text/markdown';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== 'all' && f.aiAnalysis.severity.toLowerCase() !== severityFilter) {
      return false;
    }
    if (detectorFilter !== 'all' && !f.type.toLowerCase().includes(detectorFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#3b82f6';
      default:
        return '#94a3b8';
    }
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return '#10b981';
      case 'B':
        return '#3b82f6';
      case 'C':
        return '#eab308';
      case 'D':
        return '#f97316';
      case 'F':
      default:
        return '#ef4444';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #080c14 100%)', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Navigation */}
      <header style={{ borderBottom: '1px solid #1e293b', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ← Dashboard
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Stagehand AI Web Security Agent
                </span>
                <span style={{ fontSize: '11px', background: '#1e293b', border: '1px solid #334155', padding: '2px 8px', borderRadius: '12px', color: '#38bdf8' }}>
                  DEMO.md Engine (backend2)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Stagehand Primitives: goto() · observe() · act() · extract() + 5 Vulnerability Detectors
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 10px', borderRadius: '16px', background: backendOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: backendOnline ? '1px solid #059669' : '1px solid #dc2626' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendOnline ? '#10b981' : '#ef4444' }} />
              <span style={{ color: backendOnline ? '#10b981' : '#ef4444' }}>
                {backendOnline === null ? 'Checking Backend...' : backendOnline ? 'Backend2 Online (Port 4001)' : 'Backend2 Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 24px' }}>
        {/* URL Target & Scan Controller Card */}
        <section style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Mode Selector Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Execution Mode:</span>
                <div style={{ display: 'flex', background: '#090d16', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <button
                    type="button"
                    onClick={() => setScanMode('stagehand-only')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: scanMode === 'stagehand-only' ? 'linear-gradient(90deg, #0284c7, #38bdf8)' : 'transparent',
                      color: scanMode === 'stagehand-only' ? '#ffffff' : '#94a3b8',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ⚡ Only Stagehand (Explore & Extract)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanMode('full')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: scanMode === 'full' ? 'linear-gradient(90deg, #7c3aed, #a855f7)' : 'transparent',
                      color: scanMode === 'full' ? '#ffffff' : '#94a3b8',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🛡️ Full Audit (Stagehand + 5 Detectors + Groq)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTargetUrl('http://localhost:4001/test-lab');
                    handleStartScan('stagehand-only', 'http://localhost:4001/test-lab');
                  }}
                  style={{ background: '#1e293b', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '12px', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  ⚡ Test Stagehand Now (Local Lab)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetUrl('http://testphp.vulnweb.com')}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Acunetix VulnWeb
                </button>
                <button
                  type="button"
                  onClick={() => setTargetUrl('http://zero.webappsecurity.com')}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Zero WebApp
                </button>
              </div>
            </div>

            {/* Input & Action Row */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={status === 'running'}
                style={{ flex: 1, minWidth: '320px', padding: '12px 16px', background: '#090d16', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none' }}
              />

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {scanMode === 'full' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                    <span>Max Pages:</span>
                    <select
                      value={maxPages}
                      onChange={(e) => setMaxPages(Number(e.target.value))}
                      disabled={status === 'running'}
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}
                    >
                      <option value={5}>5 pages</option>
                      <option value={8}>8 pages</option>
                      <option value={15}>15 pages</option>
                    </select>
                  </div>
                )}

                {status === 'running' ? (
                  <button
                    onClick={handleStopScan}
                    style={{ padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                  >
                    Abort Execution
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartScan()}
                    disabled={!targetUrl}
                    style={{
                      padding: '12px 28px',
                      background: scanMode === 'stagehand-only' 
                        ? 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)'
                        : 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)'
                    }}
                  >
                    {scanMode === 'stagehand-only' ? '⚡ Run Stagehand Exploration' : '🛡️ Launch Full Audit'}
                  </button>
                )}
              </div>
            </div>

            {/* Active Progress Status Bar */}
            {status !== 'idle' && (
              <div style={{ marginTop: '8px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: status === 'running' ? '#38bdf8' : status === 'completed' ? '#10b981' : '#ef4444' }} />
                    <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Status: {status.toUpperCase()}</span>
                    <span style={{ color: '#64748b' }}>— {step}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: status === 'failed' ? '#ef4444' : 'linear-gradient(90deg, #38bdf8, #818cf8)', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('stagehand')}
            style={{
              padding: '10px 18px',
              background: activeTab === 'stagehand' ? '#1e293b' : 'transparent',
              color: activeTab === 'stagehand' ? '#38bdf8' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'stagehand' ? '2px solid #38bdf8' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>⚡ Stagehand Output</span>
            {stagehandOutput && <span style={{ background: '#0284c7', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '8px' }}>Active</span>}
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '10px 18px',
              background: activeTab === 'overview' ? '#1e293b' : 'transparent',
              color: activeTab === 'overview' ? '#38bdf8' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #38bdf8' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Audit Summary & Score
          </button>

          <button
            onClick={() => setActiveTab('vulns')}
            style={{
              padding: '10px 18px',
              background: activeTab === 'vulns' ? '#1e293b' : 'transparent',
              color: activeTab === 'vulns' ? '#38bdf8' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'vulns' ? '2px solid #38bdf8' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Vulnerabilities ({findings.length})
          </button>

          <button
            onClick={() => setActiveTab('surfaces')}
            style={{
              padding: '10px 18px',
              background: activeTab === 'surfaces' ? '#1e293b' : 'transparent',
              color: activeTab === 'surfaces' ? '#38bdf8' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'surfaces' ? '2px solid #38bdf8' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Attack Surfaces & Endpoints ({endpoints.length || stagehandOutput?.links.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '10px 18px',
              background: activeTab === 'logs' ? '#1e293b' : 'transparent',
              color: activeTab === 'logs' ? '#38bdf8' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'logs' ? '2px solid #38bdf8' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            Stagehand Live Console ({logs.length})
          </button>
        </div>

        {/* Tab 0: Stagehand Dedicated Live Output */}
        {activeTab === 'stagehand' && (
          <div>
            {stagehandOutput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header Status Card */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        HTTP {stagehandOutput.status}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>{stagehandOutput.title}</h3>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#38bdf8' }}>{stagehandOutput.url}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>OBSERVED ELEMENTS</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>{stagehandOutput.interactiveElements?.length || 0}</div>
                    </div>
                    <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>DISCOVERED FORMS</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#818cf8' }}>{stagehandOutput.forms?.length || 0}</div>
                    </div>
                    <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>DISCOVERED LINKS</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{stagehandOutput.links?.length || 0}</div>
                    </div>
                    <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>COOKIES CAPTURED</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{stagehandOutput.cookies?.length || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Grid: Screenshot & Explored Pages */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
                  {/* Screenshot Preview */}
                  {stagehandOutput.screenshot && (
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📸</span> Stagehand Headless Viewport Render
                      </h4>
                      <div style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', maxHeight: '360px' }}>
                        <img src={stagehandOutput.screenshot} alt="Stagehand Viewport" style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>
                    </div>
                  )}

                  {/* Exploration Breadcrumbs / Pages Visited */}
                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🧭</span> Stagehand goto() Exploration Trail
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                      {(stagehandOutput.exploredPages || [{ url: stagehandOutput.url, title: stagehandOutput.title, linksCount: stagehandOutput.links.length, formsCount: stagehandOutput.forms.length }]).map((p, idx) => (
                        <div key={idx} style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{p.title || 'Page ' + (idx + 1)}</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Step {idx + 1}</span>
                          </div>
                          <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#38bdf8', wordBreak: 'break-all' }}>{p.url}</div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                            <span>{p.linksCount} links extracted</span> · 
                            <span>{p.formsCount} forms extracted</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Observed Interactive Elements */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🔍</span> Interactive Elements Discovered via stagehand.observe()
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{stagehandOutput.interactiveElements?.length || 0} elements</span>
                  </div>

                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                          <th style={{ padding: '8px' }}>Tag / Type</th>
                          <th style={{ padding: '8px' }}>Name / ID</th>
                          <th style={{ padding: '8px' }}>Selector</th>
                          <th style={{ padding: '8px' }}>Text / Label</th>
                          <th style={{ padding: '8px' }}>Auth Workflow?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(stagehandOutput.interactiveElements || []).map((el, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '8px', color: '#38bdf8', fontWeight: 600 }}>&lt;{el.tagName}&gt; {el.type ? `[type="${el.type}"]` : ''}</td>
                            <td style={{ padding: '8px', color: '#cbd5e1' }}>{el.name || el.id || '—'}</td>
                            <td style={{ padding: '8px', fontFamily: 'monospace', color: '#a5f3fc' }}>{el.selector}</td>
                            <td style={{ padding: '8px', color: '#94a3b8' }}>{el.text || el.placeholder || '—'}</td>
                            <td style={{ padding: '8px' }}>
                              {el.isAuthRelated ? (
                                <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                  Auth
                                </span>
                              ) : (
                                <span style={{ color: '#64748b' }}>No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Discovered Forms */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📝</span> Forms Extracted via stagehand.extract()
                  </h4>
                  {stagehandOutput.forms?.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '13px' }}>No forms found on target page.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                      {stagehandOutput.forms?.map((form, fIdx) => (
                        <div key={fIdx} style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, background: '#1e293b', padding: '2px 8px', borderRadius: '4px', color: form.method === 'POST' ? '#f59e0b' : '#38bdf8' }}>
                              {form.method}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{form.selector}</span>
                          </div>
                          <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#cbd5e1', marginBottom: '10px' }}>
                            Action: {form.action}
                          </div>
                          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Form Inputs ({form.inputs.length}):</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {form.inputs.map((inp, iIdx) => (
                                <div key={iIdx} style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '6px' }}>
                                  <span style={{ color: '#38bdf8' }}>{inp.name}</span>
                                  <span>({inp.type})</span>
                                  {inp.required && <span style={{ color: '#ef4444' }}>*required</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '16px' }}>⚡</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#f8fafc' }}>
                  {status === 'running' ? 'Stagehand Browser Agent Executing...' : 'Stagehand Ready to Test'}
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
                  {status === 'running'
                    ? 'Stagehand is executing goto(), observe(), extract(), and capturing DOM telemetry...'
                    : 'Click "Test Stagehand Now" to launch Stagehand in headless browser, navigate the page, and inspect everything it observes and extracts.'}
                </p>
                {status !== 'running' && (
                  <button
                    onClick={() => {
                      setTargetUrl('http://localhost:4001/test-lab');
                      handleStartScan('stagehand-only', 'http://localhost:4001/test-lab');
                    }}
                    style={{ padding: '10px 24px', background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ⚡ Test Stagehand Now (Local Lab)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Overview & Report */}
        {activeTab === 'overview' && (
          <div>
            {report ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Score & KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', border: `2px solid ${getGradeColor(report.grade)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 800, color: getGradeColor(report.grade) }}>
                      {report.grade}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Security Score</div>
                      <div style={{ fontSize: '26px', fontWeight: 700, color: '#f8fafc' }}>{report.securityScore}<span style={{ fontSize: '14px', color: '#64748b' }}>/100</span></div>
                    </div>
                  </div>

                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Discovered Issues</div>
                    <div style={{ fontSize: '26px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>{report.metrics.totalVulnerabilities}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', fontSize: '11px' }}>
                      <span style={{ color: '#ef4444' }}>{report.metrics.severityCounts.critical} Crit</span> · 
                      <span style={{ color: '#f97316' }}>{report.metrics.severityCounts.high} High</span> · 
                      <span style={{ color: '#eab308' }}>{report.metrics.severityCounts.medium} Med</span>
                    </div>
                  </div>

                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Pages Explored</div>
                    <div style={{ fontSize: '26px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>{report.metrics.pagesVisited}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Endpoints: {report.metrics.endpointsDiscovered}</div>
                  </div>

                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Scan Duration</div>
                    <div style={{ fontSize: '26px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>{report.durationSeconds}s</div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '8px' }}>Autonomous Mode: Completed</div>
                  </div>
                </div>

                {/* Groq Executive Summary */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#818cf8' }}>⚡</span> Groq AI Executive Briefing
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => downloadReport('md')}
                        style={{ padding: '6px 14px', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Export Markdown
                      </button>
                      <button
                        onClick={() => downloadReport('json')}
                        style={{ padding: '6px 14px', background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Export JSON
                      </button>
                    </div>
                  </div>
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '18px', fontSize: '14px', lineHeight: 1.7, color: '#cbd5e1', whiteSpace: 'pre-line' }}>
                    {report.executiveSummary}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '16px' }}>🛡️</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#f8fafc' }}>
                  {status === 'running' ? 'Autonomous Scan in Progress...' : 'No Full Audit Report Yet'}
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
                  Select "Full Audit" mode and launch scan to inspect security posture, run 5 detectors, and get Groq AI remediation.
                </p>
                <button
                  onClick={() => {
                    setScanMode('full');
                    handleStartScan('full');
                  }}
                  style={{ padding: '10px 22px', background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🛡️ Run Full Security Audit Mode
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Vulnerabilities */}
        {activeTab === 'vulns' && (
          <div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
                <span>Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  style={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '6px 12px', borderRadius: '6px', fontSize: '13px' }}
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
                <span>Detector:</span>
                <select
                  value={detectorFilter}
                  onChange={(e) => setDetectorFilter(e.target.value)}
                  style={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '6px 12px', borderRadius: '6px', fontSize: '13px' }}
                >
                  <option value="all">All Detectors (5 Modules)</option>
                  <option value="xss">XSS</option>
                  <option value="sql">SQL Injection</option>
                  <option value="idor">IDOR</option>
                  <option value="headers">Security Headers</option>
                  <option value="cookies">Session Cookies</option>
                </select>
              </div>

              <span style={{ fontSize: '13px', color: '#64748b', marginLeft: 'auto' }}>
                Showing {filteredFindings.length} of {findings.length} findings
              </span>
            </div>

            {filteredFindings.length === 0 ? (
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
                {scanMode === 'stagehand-only' 
                  ? 'Currently in "Only Stagehand" mode. Switch to "Full Audit" mode to run the 5 security detectors and Groq AI.' 
                  : 'No findings match the selected filter criteria.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredFindings.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      padding: '20px',
                      borderLeft: `4px solid ${getSeverityColor(f.aiAnalysis.severity)}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: `${getSeverityColor(f.aiAnalysis.severity)}22`, color: getSeverityColor(f.aiAnalysis.severity) }}>
                            {f.aiAnalysis.severity.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                            {f.type} {f.parameter ? `in "${f.parameter}"` : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#38bdf8', fontFamily: 'monospace' }}>
                          {f.url}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '4px', color: '#94a3b8' }}>
                          {f.aiAnalysis.cwe}
                        </span>
                        <span style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '4px', color: '#f59e0b' }}>
                          CVSS: {f.aiAnalysis.cvss}
                        </span>
                      </div>
                    </div>

                    <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px', marginBottom: '12px', fontSize: '13px' }}>
                      <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Evidence / Proof</div>
                      <div style={{ fontFamily: 'monospace', color: '#f1f5f9', wordBreak: 'break-all' }}>{f.evidence}</div>
                      {f.payload && (
                        <div style={{ marginTop: '6px', color: '#f59e0b', fontSize: '12px', fontFamily: 'monospace' }}>
                          Injected payload: {f.payload}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px', fontSize: '13px' }}>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Impact Analysis</div>
                        <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>{f.aiAnalysis.impact}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Remediation Guidance</div>
                        <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>{f.aiAnalysis.remediation}</div>
                      </div>
                    </div>

                    {f.aiAnalysis.recommendationCode && (
                      <div style={{ marginTop: '12px', background: '#020617', border: '1px solid #1e293b', borderRadius: '6px', padding: '10px' }}>
                        <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Recommended Fix Pattern:</div>
                        <pre style={{ margin: 0, fontSize: '12px', color: '#a5f3fc', fontFamily: 'Consolas, monospace', overflowX: 'auto' }}>
                          {f.aiAnalysis.recommendationCode}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Attack Surfaces */}
        {activeTab === 'surfaces' && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc' }}>Discovered Routes & Endpoints</h3>
            {endpoints.length === 0 && !stagehandOutput?.links ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>
                No attack surfaces mapped yet. Run Stagehand exploration to discover routes dynamically.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(endpoints.length > 0 
                  ? endpoints 
                  : (stagehandOutput?.links || []).map(l => ({ url: l.href, title: l.text || 'Internal Link', type: 'navigation' }))
                ).map((ep, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: ep.type === 'auth' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)', color: ep.type === 'auth' ? '#ef4444' : '#38bdf8', fontWeight: 600 }}>
                        {ep.type || 'route'}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#e2e8f0' }}>{ep.url}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{ep.title || 'Discovered'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Stagehand Live Console */}
        {activeTab === 'logs' && (
          <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#090d16', padding: '10px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace' }}>
                  Stagehand Execution Stream (goto, observe, act, extract)
                </span>
              </div>
              <button
                onClick={() => setLogs([])}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
              >
                Clear Stream
              </button>
            </div>

            <div style={{ padding: '16px', height: '500px', overflowY: 'auto', fontFamily: 'Consolas, Monaco, monospace', fontSize: '12.5px', lineHeight: 1.6 }}>
              {logs.length === 0 ? (
                <div style={{ color: '#475569', fontStyle: 'italic' }}>Waiting for Stagehand events...</div>
              ) : (
                logs.map((log, index) => {
                  let color = '#94a3b8';
                  if (log.type === 'stagehand') color = '#38bdf8';
                  else if (log.type === 'finding' || log.type === 'error') color = '#ef4444';
                  else if (log.type === 'success' || log.type === 'complete') color = '#10b981';
                  else if (log.type === 'ai_query' || log.type === 'ai_analysis') color = '#a78bfa';
                  else if (log.type === 'warn') color = '#eab308';

                  return (
                    <div key={index} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                      <span style={{ color: '#475569', marginRight: '8px' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span style={{ color: '#64748b', marginRight: '8px' }}>[{log.type.toUpperCase()}]</span>
                      <span style={{ color }}>{log.message}</span>
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
