import { StagehandAgent } from './stagehandAgent';
import { ExplorationResult } from './explorationAgent';
import { GroqService, GroqVulnerabilityAnalysis } from '../services/groqService';
import { HeaderDetector } from '../detectors/headers';
import { CookieDetector } from '../detectors/cookies';
import { XSSDetector } from '../detectors/xss';
import { SQLiDetector } from '../detectors/sqli';
import { IDORDetector } from '../detectors/idor';

export interface EnrichedVulnerability {
  id: string;
  type: string;
  subType?: string;
  url: string;
  parameter?: string;
  payload?: string;
  evidence: string;
  deterministicSeverity: string;
  aiAnalysis: GroqVulnerabilityAnalysis;
  detectedAt: number;
}

export class SecurityAgent {
  private stagehand: StagehandAgent;
  private groq: GroqService;
  private onLog?: (type: string, message: string, data?: any) => void;

  constructor(
    stagehand: StagehandAgent,
    groq: GroqService,
    onLog?: (type: string, message: string, data?: any) => void
  ) {
    this.stagehand = stagehand;
    this.groq = groq;
    this.onLog = onLog;
  }

  private log(type: string, message: string, data?: any) {
    if (this.onLog) {
      this.onLog(type, message, data);
    } else {
      console.log(`[SecurityAgent:${type}] ${message}`);
    }
  }

  public async runDetection(exploration: ExplorationResult): Promise<EnrichedVulnerability[]> {
    const rawFindings: {
      type: string;
      subType?: string;
      url: string;
      parameter?: string;
      payload?: string;
      evidence: string;
      severity: string;
      details?: any;
    }[] = [];

    const page = this.stagehand.getPage();

    this.log('detect_start', `Initializing 5 vulnerability detectors across ${exploration.visitedUrls.length} pages...`);

    // 1. Detect Security Headers & 2. Session Cookies across visited pages
    for (const url of exploration.visitedUrls.slice(0, 5)) {
      try {
        this.log('detector_headers', `Checking HTTP security headers on ${url}...`);
        await this.stagehand.goto(url, { timeout: 10000 });
        const headers = this.stagehand.getHeaders();
        const headerIssues = HeaderDetector.check(url, headers);
        for (const h of headerIssues) {
          rawFindings.push({
            type: 'Security Headers',
            subType: h.header,
            url: h.url,
            parameter: h.header,
            evidence: h.evidence,
            severity: h.severity,
            details: { header: h.header, description: h.description }
          });
        }

        this.log('detector_cookies', `Auditing session cookies on ${url}...`);
        const cookies = await this.stagehand.getCookies();
        const cookieIssues = CookieDetector.check(url, cookies);
        for (const c of cookieIssues) {
          rawFindings.push({
            type: 'Session Cookies',
            subType: c.issue,
            url: c.url,
            parameter: c.cookieName,
            evidence: c.evidence,
            severity: c.severity,
            details: { cookie: c.cookieName, description: c.description }
          });
        }
      } catch (err: any) {
        this.log('warn', `Headers/Cookies check failed on ${url}: ${err.message}`);
      }
    }

    // 3. Test XSS (Reflected & DOM XSS)
    this.log('detector_xss', `Testing XSS canary payloads and inspecting client-side DOM sinks...`);
    for (const url of exploration.visitedUrls.slice(0, 6)) {
      try {
        const xssReflected = await XSSDetector.testUrlParameters(page, url);
        for (const f of xssReflected) {
          rawFindings.push({
            type: 'XSS',
            subType: f.subType,
            url: f.url,
            parameter: f.parameter,
            payload: f.payload,
            evidence: f.evidence,
            severity: f.severity,
            details: { description: f.description }
          });
          this.log('finding', `XSS candidate confirmed on ${f.url} (param: ${f.parameter})`);
        }

        const domFindings = await XSSDetector.checkDomSinks(page, url);
        for (const f of domFindings) {
          rawFindings.push({
            type: 'XSS',
            subType: f.subType,
            url: f.url,
            payload: f.payload,
            evidence: f.evidence,
            severity: f.severity,
            details: { description: f.description }
          });
        }
      } catch (err: any) {
        this.log('warn', `XSS test failed on ${url}: ${err.message}`);
      }
    }

    // 4. Test SQL Injection
    this.log('detector_sqli', `Evaluating SQL Injection error signatures across attack surfaces...`);
    for (const url of exploration.visitedUrls.slice(0, 6)) {
      try {
        const sqliIssues = await SQLiDetector.testUrlParameters(page, url);
        for (const f of sqliIssues) {
          rawFindings.push({
            type: 'SQL Injection',
            subType: f.dbEngine,
            url: f.url,
            parameter: f.parameter,
            payload: f.payload,
            evidence: f.evidence,
            severity: f.severity,
            details: { dbEngine: f.dbEngine, description: f.description }
          });
          this.log('finding', `CRITICAL SQLi detected: ${f.dbEngine} error on ${f.url}`);
        }
      } catch (err: any) {
        this.log('warn', `SQLi check failed on ${url}: ${err.message}`);
      }
    }

    // 5. Test IDOR
    this.log('detector_idor', `Auditing for Insecure Direct Object References (IDOR)...`);
    for (const url of exploration.visitedUrls.slice(0, 6)) {
      try {
        const idorIssues = await IDORDetector.testEndpoint(page, url);
        for (const f of idorIssues) {
          rawFindings.push({
            type: 'IDOR',
            subType: 'Direct Object Reference',
            url: f.url,
            parameter: f.parameter,
            payload: `ID swap ${f.originalId} -> ${f.probedId}`,
            evidence: f.evidence,
            severity: f.severity,
            details: { description: f.description }
          });
          this.log('finding', `IDOR detected on ${f.url} (parameter: ${f.parameter})`);
        }
      } catch (err: any) {
        this.log('warn', `IDOR check failed on ${url}: ${err.message}`);
      }
    }

    // 6. Enrich findings with Groq AI analysis
    this.log('ai_analysis', `Enriching ${rawFindings.length} findings with Groq AI reasoning, CVSS scoring, and remediation guidance...`);
    const enrichedFindings: EnrichedVulnerability[] = [];

    // Limit AI queries to avoid rate limits while covering top findings
    const aiBudget = Math.min(rawFindings.length, 10);
    for (let i = 0; i < rawFindings.length; i++) {
      const raw = rawFindings[i];
      let aiAnalysis: GroqVulnerabilityAnalysis;

      if (i < aiBudget) {
        this.log('ai_query', `Requesting Groq AI analysis for ${raw.type} on ${raw.url}...`);
        aiAnalysis = await this.groq.analyzeVulnerability(raw.type, {
          url: raw.url,
          parameter: raw.parameter,
          payload: raw.payload,
          evidence: raw.evidence,
          details: raw.details
        });
      } else {
        // Fallback for remainder
        aiAnalysis = {
          severity: raw.severity as any,
          confidence: 0.8,
          cvss: raw.severity === 'Critical' ? 9.5 : raw.severity === 'High' ? 7.5 : 5.0,
          cwe: raw.type.includes('SQL') ? 'CWE-89' : raw.type.includes('XSS') ? 'CWE-79' : 'CWE-20',
          impact: `Automated detection identified ${raw.type} issue.`,
          exploitationProof: raw.evidence,
          remediation: 'Apply defense-in-depth sanitization and strict validation controls.'
        };
      }

      enrichedFindings.push({
        id: `vuln_${i + 1}_${Date.now()}`,
        type: raw.type,
        subType: raw.subType,
        url: raw.url,
        parameter: raw.parameter,
        payload: raw.payload,
        evidence: raw.evidence,
        deterministicSeverity: raw.severity,
        aiAnalysis,
        detectedAt: Date.now()
      });
    }

    this.log('complete', `Detection complete. Total enriched vulnerabilities: ${enrichedFindings.length}`);
    return enrichedFindings;
  }
}

