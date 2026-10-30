import { z } from 'zod';

// ============ Investigation Configuration ============
export const InvestigationDepth = z.enum(['quick', 'standard', 'deep']);
export type InvestigationDepth = z.infer<typeof InvestigationDepth>;

export const InvestigationConfigSchema = z.object({
  url: z.string().url(),
  depth: InvestigationDepth.default('standard'),
  adaptive_exploration: z.boolean().default(true),
  differential_execution: z.boolean().default(false),
  recording_enabled: z.boolean().default(false),
  max_duration_ms: z.number().int().min(1000).max(600000).default(120000),
  max_browser_actions: z.number().int().min(1).max(200).default(50),
  browser_profiles: z.array(z.string()).default([]),
});
export type InvestigationConfig = z.infer<typeof InvestigationConfigSchema>;

// ============ Pipeline Stages ============
export const PipelineStageName = z.enum([
  'url_received',
  'static_risk_assessment',
  'confidence_evaluation',
  'browser_investigator',
  'dom_observation',
  'network_observation',
  'visual_observation',
  'temporal_graph',
  'behavioral_intent_inference',
  'information_gain_selector',
  'controlled_browser_action',
  'new_evidence_collection',
  'temporal_graph_update',
  'stopping_rule_evaluation',
  'differential_execution',
  'evidence_fusion',
  'phishing_risk_assessment',
  'cloaking_risk_assessment',
  'agent_manipulation_risk_assessment',
  'final_report',
]);
export type PipelineStageName = z.infer<typeof PipelineStageName>;

export const StageStatus = z.enum(['pending', 'ready', 'running', 'completed', 'warning', 'failed', 'skipped']);
export type StageStatus = z.infer<typeof StageStatus>;

// ============ Investigation Status ============
export const InvestigationStatus = z.enum([
  'queued', 'initializing', 'analyzing', 'completed', 'failed', 'cancelled', 'incomplete'
]);
export type InvestigationStatus = z.infer<typeof InvestigationStatus>;

// ============ Event Protocol ============
export const EventSchemaVersion = 1;

export const InvestigationEvent = z.object({
  id: z.string(),
  investigationId: z.string(),
  seq: z.number().int(),
  type: z.string(),
  schemaVersion: z.number().default(EventSchemaVersion),
  timestamp: z.number(),
  payload: z.record(z.string(), z.any()),
});
export type InvestigationEvent = z.infer<typeof InvestigationEvent>;

// ============ Graph ============
export const GraphNodeType = z.enum([
  'page', 'dom_element', 'script', 'iframe', 'domain', 'ip_address',
  'network_request', 'form', 'cookie', 'storage_object', 'redirect',
  'user_action', 'download', 'permission', 'browser_profile', 'security_finding'
]);
export type GraphNodeType = z.infer<typeof GraphNodeType>;

export const GraphEdgeType = z.enum([
  'contains', 'loads', 'triggers', 'redirects_to', 'communicates_with',
  'submits_to', 'creates', 'reads', 'writes', 'observed_during', 'diverges_from'
]);
export type GraphEdgeType = z.infer<typeof GraphEdgeType>;

// ============ Risk ============
export const RiskCategory = z.enum(['phishing', 'cloaking', 'agent_manipulation']);
export type RiskCategory = z.infer<typeof RiskCategory>;

export const RiskSeverity = z.enum(['none', 'low', 'medium', 'high', 'critical']);
export type RiskSeverity = z.infer<typeof RiskSeverity>;

// ============ tRPC Procedures ============
export const trpcRouterShape = {
  createInvestigation: { input: InvestigationConfigSchema },
  getInvestigation: { input: z.object({ id: z.string() }) },
  listInvestigations: { input: z.object({ status: InvestigationStatus.optional(), limit: z.number().default(20), offset: z.number().default(0) }) },
  cancelInvestigation: { input: z.object({ id: z.string() }) },
  getInvestigationEvents: { input: z.object({ id: z.string(), since: z.number().optional(), limit: z.number().default(100) }) },
  getPipelineState: { input: z.object({ id: z.string() }) },
  getBehavioralGraph: { input: z.object({ id: z.string(), nodeType: GraphNodeType.optional(), search: z.string().optional() }) },
  getEvidence: { input: z.object({ id: z.string(), category: z.string().optional(), limit: z.number().default(50) }) },
  getNetworkEvents: { input: z.object({ id: z.string(), limit: z.number().default(50) }) },
  getBrowserActions: { input: z.object({ id: z.string(), limit: z.number().default(50) }) },
  getDifferentialAnalysis: { input: z.object({ id: z.string() }) },
  getFinalReport: { input: z.object({ id: z.string() }) },
  getRecordingMetadata: { input: z.object({ id: z.string() }) },
  getAuthorizedReplayAccess: { input: z.object({ investigationId: z.string(), artifactId: z.string() }) },
  health: { input: z.object({}) },
};

export type TrpcRouterShape = typeof trpcRouterShape;