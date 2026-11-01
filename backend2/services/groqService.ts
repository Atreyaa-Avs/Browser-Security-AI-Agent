import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

export interface GroqVulnerabilityAnalysis {
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  confidence: number;
  cvss: number;
  cwe: string;
  impact: string;
  exploitationProof: string;
  remediation: string;
  recommendationCode?: string;
}

export interface DiscoveredSurface {
  url: string;
  type: 'form' | 'link' | 'api' | 'auth';
  method?: string;
  inputs?: string[];
  description?: string;
}

export class GroqService {
  private groq: Groq | null = null;
  private model: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }
    this.model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  }

  public async analyzeVulnerability(
    vulnType: string,
    rawFinding: {
      url: string;
      parameter?: string;
      payload?: string;
      evidence: string;
      details?: any;
    }
  ): Promise<GroqVulnerabilityAnalysis> {
    const prompt = `You are an elite application security expert analyzing an automated scan finding.
Evaluate this vulnerability finding carefully:
- Vulnerability Type: ${vulnType}
- Target URL: ${rawFinding.url}
- Affected Parameter / Target: ${rawFinding.parameter || 'N/A'}
- Injected Payload / Trigger: ${rawFinding.payload || 'N/A'}
- Evidence: ${rawFinding.evidence}
- Additional Context: ${JSON.stringify(rawFinding.details || {})}

Provide your assessment in strict JSON format with NO markdown wrapping or preamble:
{
  "severity": "Critical" | "High" | "Medium" | "Low" | "Info",
  "confidence": <number between 0.1 and 1.0>,
  "cvss": <number between 0.0 and 10.0>,
  "cwe": "<CWE-ID and name, e.g. CWE-79: Cross-site Scripting>",
  "impact": "<2-3 sentence summary of business and security impact>",
  "exploitationProof": "<technical proof/explanation of how this vulnerability could be exploited>",
  "remediation": "<precise, actionable steps for the developer to fix this>",
  "recommendationCode": "<short code snippet or header config illustrating the secure implementation>"
}`;

    if (!this.groq) {
      return this.fallbackAnalysis(vulnType, rawFinding);
    }

    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an autonomous web security analyzer. Return pure JSON only.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1024
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      const cleanJson = content.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        severity: parsed.severity || this.getDefaultSeverity(vulnType),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
        cvss: typeof parsed.cvss === 'number' ? parsed.cvss : 7.0,
        cwe: parsed.cwe || this.getDefaultCWE(vulnType),
        impact: parsed.impact || `Potential security risk detected in ${rawFinding.url}`,
        exploitationProof: parsed.exploitationProof || rawFinding.evidence,
        remediation: parsed.remediation || 'Sanitize user inputs and adhere to secure coding standards.',
        recommendationCode: parsed.recommendationCode
      };
    } catch (err) {
      console.warn(`[GroqService] Fallback used due to Groq error:`, err);
      return this.fallbackAnalysis(vulnType, rawFinding);
    }
  }

  public async prioritizeSurfaces(surfaces: DiscoveredSurface[]): Promise<string[]> {
    if (!this.groq || surfaces.length === 0) {
      return surfaces.map(s => s.url);
    }

    try {
      const prompt = `Given the following discovered web endpoints and forms, order them from highest security risk / attack priority to lowest (e.g. auth, user data, file uploads, search forms first):
${JSON.stringify(surfaces.slice(0, 20), null, 2)}

Return a JSON array containing ONLY the ordered URLs:
["url1", "url2", ...]`;

      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      const clean = content.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      const urls: string[] = JSON.parse(clean);
      return Array.isArray(urls) ? urls : surfaces.map(s => s.url);
    } catch {
      return surfaces.map(s => s.url);
    }
  }

  public async generateExecutiveSummary(stats: {
    targetUrl: string;
    durationSeconds: number;
    pagesVisited: number;
    formsTested: number;
    findingsCount: number;
    findingsSummary: { type: string; severity: string }[];
  }): Promise<string> {
    if (!this.groq) {
      return `Autonomous security assessment conducted on ${stats.targetUrl}. Scanned ${stats.pagesVisited} pages and tested ${stats.formsTested} interactive forms, identifying ${stats.findingsCount} potential vulnerabilities.`;
    }

    try {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a Chief Information Security Officer (CISO) drafting an executive summary.'
          },
          {
            role: 'user',
            content: `Create a concise, 3-paragraph executive summary of the web application security audit for target ${stats.targetUrl}.
Metrics:
- Visited Pages: ${stats.pagesVisited}
- Interactive Forms/Inputs Tested: ${stats.formsTested}
- Findings: ${stats.findingsCount} total (${JSON.stringify(stats.findingsSummary)})
- Scan duration: ${stats.durationSeconds}s

Highlight primary risk areas and urgent recommendations.`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      return response.choices[0]?.message?.content?.trim() || 'Security assessment completed successfully.';
    } catch {
      return `Autonomous security assessment completed for ${stats.targetUrl}. Discovered ${stats.findingsCount} potential issues across ${stats.pagesVisited} explored pages. Immediate remediation recommended for high/critical findings.`;
    }
  }

  private getDefaultSeverity(type: string): 'Critical' | 'High' | 'Medium' | 'Low' | 'Info' {
    const t = type.toLowerCase();
    if (t.includes('sql')) return 'Critical';
    if (t.includes('xss') || t.includes('idor')) return 'High';
    if (t.includes('cookie')) return 'Medium';
    if (t.includes('header')) return 'Low';
    return 'Medium';
  }

  private getDefaultCWE(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('sql')) return 'CWE-89: SQL Injection';
    if (t.includes('xss')) return 'CWE-79: Cross-site Scripting';
    if (t.includes('idor')) return 'CWE-639: Insecure Direct Object References';
    if (t.includes('header')) return 'CWE-693: Protection Mechanism Failure';
    if (t.includes('cookie')) return 'CWE-614: Sensitive Cookie in HTTPS Session Without Secure Flag';
    return 'CWE-20: Improper Input Validation';
  }

  private fallbackAnalysis(vulnType: string, raw: any): GroqVulnerabilityAnalysis {
    const severity = this.getDefaultSeverity(vulnType);
    const cwe = this.getDefaultCWE(vulnType);
    return {
      severity,
      confidence: 0.85,
      cvss: severity === 'Critical' ? 9.8 : severity === 'High' ? 7.5 : severity === 'Medium' ? 5.3 : 3.5,
      cwe,
      impact: `Identified security condition: ${vulnType} in ${raw.url}. May allow attackers to compromise application data, session state, or execute unauthorized operations.`,
      exploitationProof: raw.evidence,
      remediation: `Implement input validation, contextual output encoding, strict authorization controls, and secure HTTP response headers.`
    };
  }
}

