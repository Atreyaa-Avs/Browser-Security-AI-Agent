import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface ScanLog {
  timestamp: number;
  type: string;
  message: string;
  data?: any;
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
  const [maxPages, setMaxPages] = useState<number>(8);
  const [maxDepth, setMaxDepth] = useState<number>(2);

  const [scanId, setScanId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed' | 'aborted'>('idle');
  const [step, setStep] = useState<string>('Ready to scan');
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [findings, setFindings] = useState<EnrichedVulnerability[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vulns' | 'surfaces' | 'logs'>('overview');
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
          } else if (msg.type === 'scan.completed' && msg.report) {
            setReport(msg.report);
            setStatus('completed');
            setProgress(100);
            setStep('Scan completed');
            if (msg.report.findings) setFindings(msg.report.findings);
            if (msg.report.endpoints) setEndpoints(msg.report.endpoints);
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

  const handleStartScan = async () => {
    if (!targetUrl) return;

    setStatus('running');
    setProgress(5);
    setStep('Initializing Stagehand browser and Groq AI orchestrator...');
    setLogs([]);
    setFindings([]);
    setEndpoints([]);
    setReport(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/scan/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, maxPages, maxDepth })
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
                Autonomous exploration · 5 Vulnerability Detectors · Groq AI Reasoning
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

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 24px' }}>
        {/* URL Target & Scan Controller Card */}
        <section style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>
                Target Web Application URL:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Presets:</span>
                <button
                  type="button"
                  onClick={() => setTargetUrl('http://localhost:4001/test-lab')}
                  style={{ background: '#1e293b', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '12px', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  ⚡ Local Vuln Lab
                </button>
                <button
                  type="button"
                  onClick={() => setTargetUrl('http://testphp.vulnweb.com')}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontSize: '12px', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Acunetix VulnWeb
                </button>
                <button
                  type="button"
                  onClick={() => setTargetUrl('http://zero.webappsecurity.com')}
                  style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontSize: '12px', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Zero WebApp
                </button>
              </div>
            </div>

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

                {status === 'running' ? (
                  <button
                    onClick={handleStopScan}
                    style={{ padding: '12px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                  >
                    Abort Scan
                  </button>
                ) : (
                  <button
                    onClick={handleStartScan}
                    disabled={!targetUrl}
                    style={{
                      padding: '12px 28px',
                      background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
                    }}
                  >
                    Launch Stagehand Scan
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
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', marginBottom: '24px' }}>
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
            Attack Surfaces & Endpoints ({endpoints.length || findings.length})
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
                  {status === 'running' ? 'Autonomous Scan in Progress...' : 'No Scan Results Yet'}
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
                  {status === 'running'
                    ? 'Stagehand is navigating target routes, discovering forms, and executing vulnerability detectors.'
                    : 'Enter target URL and launch scan to inspect security posture and get Groq AI remediation.'}
                </p>
                {status === 'running' && (
                  <button
                    onClick={() => setActiveTab('logs')}
                    style={{ padding: '8px 20px', background: '#1e293b', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    View Live Stagehand Console →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Vulnerabilities */}
        {activeTab === 'vulns' && (
          <div>
            {/* Filter controls */}
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
                No findings match the selected filter criteria.
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
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc' }}>Discovered Routes & Forms</h3>
            {endpoints.length === 0 && findings.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>
                No attack surfaces mapped yet. Run a scan to discover routes dynamically.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(endpoints.length > 0 ? endpoints : findings.map(f => ({ url: f.url, type: f.type, title: f.parameter || 'Endpoint' }))).map((ep, idx) => (
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
