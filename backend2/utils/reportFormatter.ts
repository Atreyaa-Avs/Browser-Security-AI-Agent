import { EnrichedVulnerability } from '../agent/securityAgent';
import { ExplorationResult } from '../agent/explorationAgent';

export interface ScanReport {
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

export class ReportFormatter {
  public static calculateScore(findings: EnrichedVulnerability[]): { score: number; grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' } {
    let score = 100;
    for (const f of findings) {
      const sev = f.aiAnalysis.severity.toLowerCase();
      if (sev === 'critical') score -= 30;
      else if (sev === 'high') score -= 15;
      else if (sev === 'medium') score -= 6;
      else if (sev === 'low') score -= 2;
    }
    score = Math.max(0, Math.min(100, score));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 50) grade = 'C';
    else if (score >= 30) grade = 'D';
    else grade = 'F';

    return { score, grade };
  }

  public static format(
    scanId: string,
    targetUrl: string,
    durationSeconds: number,
    exploration: ExplorationResult,
    findings: EnrichedVulnerability[],
    executiveSummary: string
  ): ScanReport {
    const { score, grade } = this.calculateScore(findings);

    const severityCounts = {
      critical: findings.filter(f => f.aiAnalysis.severity.toLowerCase() === 'critical').length,
      high: findings.filter(f => f.aiAnalysis.severity.toLowerCase() === 'high').length,
      medium: findings.filter(f => f.aiAnalysis.severity.toLowerCase() === 'medium').length,
      low: findings.filter(f => f.aiAnalysis.severity.toLowerCase() === 'low').length,
      info: findings.filter(f => f.aiAnalysis.severity.toLowerCase() === 'info').length
    };

    return {
      scanId,
      targetUrl,
      timestamp: new Date().toISOString(),
      durationSeconds,
      securityScore: score,
      grade,
      metrics: {
        pagesVisited: exploration.visitedUrls.length,
        endpointsDiscovered: exploration.endpoints.length,
        attackSurfacesIdentified: exploration.surfaces.length,
        totalVulnerabilities: findings.length,
        severityCounts
      },
      executiveSummary,
      findings,
      endpoints: exploration.endpoints
    };
  }

  public static toMarkdown(report: ScanReport): string {
    const md: string[] = [];
    md.push(`# Autonomous Web Security Assessment Report`);
    md.push(`**Target:** \`${report.targetUrl}\`  `);
    md.push(`**Date:** ${report.timestamp}  `);
    md.push(`**Scan Duration:** ${report.durationSeconds}s  `);
    md.push(`**Overall Security Score:** **${report.securityScore}/100** (Grade: **${report.grade}**)  \n`);

    md.push(`## Executive Summary`);
    md.push(`${report.executiveSummary}\n`);

    md.push(`## Assessment Metrics`);
    md.push(`- **Explored Pages:** ${report.metrics.pagesVisited}`);
    md.push(`- **Discovered Endpoints:** ${report.metrics.endpointsDiscovered}`);
    md.push(`- **Identified Attack Surfaces:** ${report.metrics.attackSurfacesIdentified}`);
    md.push(`- **Total Vulnerabilities:** ${report.metrics.totalVulnerabilities}`);
    md.push(`  - 🔴 Critical: ${report.metrics.severityCounts.critical}`);
    md.push(`  - 🟠 High: ${report.metrics.severityCounts.high}`);
    md.push(`  - 🟡 Medium: ${report.metrics.severityCounts.medium}`);
    md.push(`  - 🔵 Low: ${report.metrics.severityCounts.low}`);
    md.push(`  - ⚪ Info: ${report.metrics.severityCounts.info}\n`);

    md.push(`## Vulnerability Details\n`);
    if (report.findings.length === 0) {
      md.push(`*No security vulnerabilities identified during this scan.*`);
    } else {
      report.findings.forEach((f, idx) => {
        md.push(`### ${idx + 1}. [${f.aiAnalysis.severity.toUpperCase()}] ${f.type} - ${f.parameter || f.url}`);
        md.push(`- **Affected URL:** \`${f.url}\``);
        md.push(`- **Classification:** ${f.aiAnalysis.cwe} (CVSS: ${f.aiAnalysis.cvss})`);
        md.push(`- **Confidence:** ${(f.aiAnalysis.confidence * 100).toFixed(0)}%`);
        if (f.payload) md.push(`- **Test Payload:** \`${f.payload}\``);
        md.push(`- **Evidence:** \`${f.evidence}\``);
        md.push(`- **Impact:** ${f.aiAnalysis.impact}`);
        md.push(`- **Remediation:** ${f.aiAnalysis.remediation}`);
        if (f.aiAnalysis.recommendationCode) {
          md.push(`\n\`\`\`javascript\n${f.aiAnalysis.recommendationCode}\n\`\`\``);
        }
        md.push(`\n---\n`);
      });
    }

    return md.join('\n');
  }
}

