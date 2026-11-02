export interface ScanLog {
  timestamp: number;
  type: string;
  message: string;
  data?: unknown;
}

export interface ObservedElement {
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

export interface ExtractedFormField {
  name: string;
  type: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
}

export interface ExtractedFormData {
  action: string;
  method: string;
  selector: string;
  inputs: ExtractedFormField[];
}

export interface ExploredPage {
  url: string;
  title: string;
  linksCount: number;
  formsCount: number;
}

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
  cookies: unknown[];
  headers: Record<string, string>;
  exploredPages?: ExploredPage[];
}

export interface AiAnalysis {
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  confidence: number;
  cvss: number;
  cwe: string;
  impact: string;
  exploitationProof: string;
  remediation: string;
  recommendationCode?: string;
}

export interface EnrichedVulnerability {
  id: string;
  type: string;
  subType?: string;
  url: string;
  parameter?: string;
  payload?: string;
  evidence: string;
  deterministicSeverity: string;
  aiAnalysis: AiAnalysis;
  detectedAt: number;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ScanMetrics {
  pagesVisited: number;
  endpointsDiscovered: number;
  attackSurfacesIdentified: number;
  totalVulnerabilities: number;
  severityCounts: SeverityCounts;
}

export interface DiscoveredEndpoint {
  url: string;
  title?: string;
  type?: string;
}

export interface ScanReport {
  scanId: string;
  targetUrl: string;
  timestamp: string;
  durationSeconds: number;
  securityScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: ScanMetrics;
  executiveSummary: string;
  findings: EnrichedVulnerability[];
  endpoints: DiscoveredEndpoint[];
}

export type ScanStatus = 'idle' | 'running' | 'completed' | 'failed' | 'aborted';

export type ScanMode = 'stagehand-only' | 'full';

export type TabKey = 'stagehand' | 'overview' | 'vulns' | 'surfaces' | 'logs';

export const BACKEND_URL = 'http://localhost:4001';
export const WS_URL = 'ws://localhost:4001';

export const LOCAL_LAB_URL = 'http://localhost:4001/test-lab';
