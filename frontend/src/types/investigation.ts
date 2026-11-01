// Shared types for the dual-graph prototype

export type InvestigationStatus = 
  | 'queued' 
  | 'initializing' 
  | 'analyzing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'incomplete';

export type StageStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'skipped' 
  | 'failed';

export const PIPELINE_PHASES = [
  {
    id: 'ingestion',
    name: 'Phase 1: Ingestion & Triage',
    stages: ['url_received', 'static_risk_assessment', 'confidence_evaluation']
  },
  {
    id: 'initial',
    name: 'Phase 2: Initial Observation',
    stages: ['browser_investigator', 'dom_observation', 'network_observation', 'visual_observation']
  },
  {
    id: 'exploration',
    name: 'Phase 3: Active Exploration Loop',
    stages: ['temporal_graph', 'behavioral_intent_inference', 'information_gain_selector', 
             'controlled_browser_action', 'new_evidence_collection', 'temporal_graph_update', 
             'stopping_rule_evaluation']
  },
  {
    id: 'comparative',
    name: 'Phase 4: Comparative Analysis',
    stages: ['differential_execution', 'evidence_fusion']
  },
  {
    id: 'verdict',
    name: 'Phase 5: Verdict & Report',
    stages: ['phishing_risk_assessment', 'cloaking_risk_assessment', 
             'agent_manipulation_risk_assessment', 'final_report']
  }
];

export const PIPELINE_STAGES = [
  { id: 'url_received', name: 'URL Received & Validated', phase: 'ingestion' },
  { id: 'static_risk_assessment', name: 'Static Risk Assessment', phase: 'ingestion' },
  { id: 'confidence_evaluation', name: 'Initial Confidence Evaluation', phase: 'ingestion' },
  { id: 'browser_investigator', name: 'Autonomous Browser Launcher', phase: 'initial' },
  { id: 'dom_observation', name: 'DOM & Script Inspection', phase: 'initial' },
  { id: 'network_observation', name: 'Network & Traffic Sniffer', phase: 'initial' },
  { id: 'visual_observation', name: 'Visual / Screenshot Analysis', phase: 'initial' },
  { id: 'temporal_graph', name: 'Temporal Graph Builder', phase: 'exploration' },
  { id: 'behavioral_intent_inference', name: 'Behavioral Intent Inference', phase: 'exploration' },
  { id: 'information_gain_selector', name: 'Information-Gain Action Selector', phase: 'exploration' },
  { id: 'controlled_browser_action', name: 'Controlled Browser Action', phase: 'exploration' },
  { id: 'new_evidence_collection', name: 'New Evidence Collection', phase: 'exploration' },
  { id: 'temporal_graph_update', name: 'Graph Incremental Update', phase: 'exploration' },
  { id: 'stopping_rule_evaluation', name: 'Stopping Rule Evaluation', phase: 'exploration' },
  { id: 'differential_execution', name: 'Differential & Deception Analysis', phase: 'comparative' },
  { id: 'evidence_fusion', name: 'Evidence Fusion & Corroboration', phase: 'comparative' },
  { id: 'phishing_risk_assessment', name: 'Phishing Risk Assessment', phase: 'verdict' },
  { id: 'cloaking_risk_assessment', name: 'Cloaking & Evasion Detection', phase: 'verdict' },
  { id: 'agent_manipulation_risk_assessment', name: 'Agent Manipulation Risk', phase: 'verdict' },
  { id: 'final_report', name: 'Final Investigation Report', phase: 'verdict' }
];

export type BehaviorNodeType = 
  | 'page' 
  | 'domain' 
  | 'ip_address' 
  | 'network_request' 
  | 'form' 
  | 'dom_element' 
  | 'script' 
  | 'iframe' 
  | 'redirect' 
  | 'cookie' 
  | 'storage_object' 
  | 'user_action' 
  | 'download' 
  | 'permission' 
  | 'security_finding' 
  | 'browser_profile';

export type BehaviorEdgeType = 
  | 'contains' 
  | 'loads' 
  | 'communicates_with' 
  | 'submits_to' 
  | 'triggers' 
  | 'redirects_to' 
  | 'modifies' 
  | 'sets_cookie' 
  | 'accesses_storage' 
  | 'requests_permission' 
  | 'downloads' 
  | 'observed_by' 
  | 'diverges_from' 
  | 'supports';

export interface Observation {
  observation_id: string;
  investigation_id: string;
  timestamp: number;
  sequence: number;
  source: string;
  description: string;
  browser_profile_id?: string;
  iteration_number?: number;
}

export interface BehaviorNode {
  id: string;
  type: BehaviorNodeType;
  label: string;
  attributes: Record<string, any>;
  first_observed: number;
  last_observed: number;
  observation_count: number;
  risk_metadata?: Record<string, any>;
  evidence_references: string[];
  observations: Observation[];
}

export interface BehaviorEdge {
  id: string;
  source: string;
  target: string;
  type: BehaviorEdgeType;
  attributes: Record<string, any>;
  first_observed: number;
  last_observed: number;
  observation_count: number;
  evidence_references: string[];
  observations: Observation[];
}

export interface InvestigationEvent {
  event_id: string;
  investigation_id: string;
  event_type: string;
  timestamp: number;
  sequence: number;
  payload: any;
}

export interface PipelineStage {
  stage_id: string;
  name: string;
  phase: string;
  status: StageStatus;
  start_time?: number;
  end_time?: number;
  duration?: number;
  input?: any;
  output?: any;
  evidence_ids?: string[];
  error?: string;
}
