import type { ScanReport } from './types';

export type ReportFormat = 'json' | 'md';

function toMarkdown(report: ScanReport): string {
  return `# Autonomous Security Audit Report
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
}

export function downloadReport(report: ScanReport, format: ReportFormat): void {
  const content = format === 'json' ? JSON.stringify(report, null, 2) : toMarkdown(report);
  const mime = format === 'json' ? 'application/json' : 'text/markdown';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `security-audit-${report.scanId}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
