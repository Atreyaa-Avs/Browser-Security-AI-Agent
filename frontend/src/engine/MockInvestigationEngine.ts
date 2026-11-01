import { MockEventAdapter } from "./EventAdapter";
import { PipelineStateManager } from "./PipelineStateManager";
import { TemporalGraphStateManager } from "./TemporalGraphStateManager";
import { PIPELINE_STAGES } from "../types/investigation";

export class MockInvestigationEngine {
  private eventAdapter: MockEventAdapter;
  private pipelineManager: PipelineStateManager;
  private temporalManager: TemporalGraphStateManager;
  private investigationId: string;
  private running = false;
  private stepMode = false;
  private currentStageIndex = 0;
  private stages = PIPELINE_STAGES.map(s => s.id);
  private onCompleteCallback?: () => void;
  
  constructor(investigationId: string) {
    this.investigationId = investigationId;
    this.eventAdapter = new MockEventAdapter();
    this.pipelineManager = new PipelineStateManager();
    this.temporalManager = new TemporalGraphStateManager();
  }
  
  getEventAdapter() { return this.eventAdapter; }
  getPipelineManager() { return this.pipelineManager; }
  getTemporalManager() { return this.temporalManager; }
  onComplete(callback: () => void) { this.onCompleteCallback = callback; }
  
  start(stepMode = true) {
    if (this.running) return;
    this.running = true;
    this.stepMode = stepMode;
    this.currentStageIndex = 0;
    this.pipelineManager.initialize();
    this.temporalManager.clear();
    if (!stepMode) {
      this.runInvestigation();
    } else {
      this.eventAdapter.emit({
        investigation_id: this.investigationId,
        event_type: "investigation.status_changed",
        timestamp: Date.now(),
        payload: { status: "ready" }
      });
    }
  }
  
  async nextStep() {
    if (!this.running) return;
    if (this.currentStageIndex >= this.stages.length) {
      this.completeInvestigation();
      return;
    }
    const stageId = this.stages[this.currentStageIndex];
    await this.runSingleStage(stageId);
    this.currentStageIndex++;
    if (this.currentStageIndex >= this.stages.length) {
      setTimeout(() => this.completeInvestigation(), 500);
    }
  }
  
  private completeInvestigation() {
    this.eventAdapter.emit({
      investigation_id: this.investigationId,
      event_type: "investigation.completed",
      timestamp: Date.now(),
      payload: { verdict: "Phishing", risk_score: 87 }
    });
    if (this.onCompleteCallback) this.onCompleteCallback();
  }
  
  reset() {
    this.running = false;
    this.stepMode = false;
    this.currentStageIndex = 0;
    this.pipelineManager.initialize();
    this.temporalManager.clear();
  }
  
  private async runInvestigation() {
    for (let i = 0; i < this.stages.length; i++) {
      await this.runSingleStage(this.stages[i]);
      await new Promise(r => setTimeout(r, 300));
    }
    this.completeInvestigation();
  }
  
  private async runSingleStage(stageId: string) {
    this.pipelineManager.startStage(stageId);
    this.eventAdapter.emit({ investigation_id: this.investigationId, event_type: "stage.started", timestamp: Date.now(), payload: { stage: stageId } });
    await new Promise(r => setTimeout(r, 500));
    try {
      const result = await this.getStageResult(stageId);
      if (result?.skipped) {
        this.pipelineManager.skipStage(stageId, result);
        this.eventAdapter.emit({ investigation_id: this.investigationId, event_type: "stage.skipped", timestamp: Date.now(), payload: { stage: stageId, result } });
      } else {
        this.pipelineManager.completeStage(stageId, result);
        this.eventAdapter.emit({ investigation_id: this.investigationId, event_type: "stage.completed", timestamp: Date.now(), payload: { stage: stageId, result } });
      }
    } catch (e: any) {
      this.pipelineManager.failStage(stageId, e.message);
      this.eventAdapter.emit({ investigation_id: this.investigationId, event_type: "stage.failed", timestamp: Date.now(), payload: { stage: stageId, error: e.message } });
    }
  }
  
  private async getStageResult(stageId: string) {
    const simple: any = {
      "url_received": { url: "https://secure-account-verify.example/login" },
      "static_risk_assessment": { score: 35 },
      "confidence_evaluation": { confidence: 0.7 },
      "browser_investigator": { browser: "chromium" },
      "visual_observation": { screenshot_captured: true },
      "behavioral_intent_inference": { intent: "credential_harvesting", confidence: 0.85 },
      "information_gain_selector": { selected_action: "interact_with_form" },
      "new_evidence_collection": { evidence_count: 5 },
      "stopping_rule_evaluation": { decision: "stop" },
      "evidence_fusion": { findings_correlated: 2 },
      "phishing_risk_assessment": { score: 87 },
      "cloaking_risk_assessment": { score: 72 },
      "agent_manipulation_risk_assessment": { score: 65 },
      "final_report": { verdict: "Phishing", risk_score: 87 }
    };
    if (simple[stageId]) return simple[stageId];
    
    if (stageId === "dom_observation") {
      await this.addTemporalObservation(() => {
        this.temporalManager.addOrUpdateNode("domain_secure", "domain", "secure-account-verify.example", { suspicious_pattern: true }, "dom_observation", "Domain discovered");
        this.temporalManager.addOrUpdateNode("page_login", "page", "/login", { url: "https://secure-account-verify.example/login" }, "dom_observation", "Login page");
        this.temporalManager.linkNodes("domain_secure", "page_login", "contains", {}, "dom_observation", "contains");
        this.temporalManager.addOrUpdateNode("form_login", "form", "Login Form", { action: "https://secure-account-verify.example/submit" }, "dom_observation", "Form");
        this.temporalManager.linkNodes("page_login", "form_login", "contains", {}, "dom_observation", "contains");
      });
      return { nodes_discovered: 3 };
    }
    if (stageId === "network_observation") {
      await this.addTemporalObservation(() => {
        this.temporalManager.addOrUpdateNode("ip_192", "ip_address", "192.168.1.100", {}, "network_observation", "IP");
        this.temporalManager.linkNodes("domain_secure", "ip_192", "communicates_with", {}, "network_observation", "resolves");
        this.temporalManager.addOrUpdateNode("script_mal", "script", "jquery-tracker.js", {}, "network_observation", "Script");
        this.temporalManager.linkNodes("page_login", "script_mal", "loads", {}, "network_observation", "loads");
        this.temporalManager.addOrUpdateNode("req_post", "network_request", "POST /submit", { destination: "https://api.suspicious.example/collect" }, "network_observation", "Request");
        this.temporalManager.linkNodes("form_login", "req_post", "submits_to", { cross_origin: true }, "network_observation", "submits");
      });
      return { requests: 15 };
    }
    if (stageId === "temporal_graph") {
      await this.addTemporalObservation(() => {
        this.temporalManager.addOrUpdateNode("dom_user", "dom_element", "username_input", { type: "input" }, "temporal_graph", "Input");
        this.temporalManager.linkNodes("form_login", "dom_user", "contains", {}, "temporal_graph", "contains");
        this.temporalManager.addOrUpdateNode("dom_pass", "dom_element", "password_input", { type: "password" }, "temporal_graph", "Password");
        this.temporalManager.linkNodes("form_login", "dom_pass", "contains", {}, "temporal_graph", "contains");
        this.temporalManager.addOrUpdateNode("dom_submit", "dom_element", "submit_button", { type: "submit" }, "temporal_graph", "Submit");
        this.temporalManager.linkNodes("form_login", "dom_submit", "contains", {}, "temporal_graph", "contains");
      });
      return { graph_built: true };
    }
    if (stageId === "controlled_browser_action") {
      await this.addTemporalObservation(() => {
        this.temporalManager.addOrUpdateNode("action_interact", "user_action", "Form Interaction", { action: "fill_and_submit" }, "controlled_browser_action", "Action");
        this.temporalManager.linkNodes("dom_submit", "action_interact", "triggers", {}, "controlled_browser_action", "triggers");
        this.temporalManager.addOrUpdateNode("cookie_session", "cookie", "session_id", {}, "controlled_browser_action", "Cookie");
        this.temporalManager.linkNodes("page_login", "cookie_session", "sets_cookie", {}, "controlled_browser_action", "sets");
        this.temporalManager.addOrUpdateNode("storage_token", "storage_object", "auth_token", { type: "localStorage" }, "controlled_browser_action", "Storage");
        this.temporalManager.linkNodes("page_login", "storage_token", "accesses_storage", {}, "controlled_browser_action", "accesses");
      });
      return { action_executed: true };
    }
    if (stageId === "temporal_graph_update") {
      await this.addTemporalObservation(() => {
        this.temporalManager.addOrUpdateNode("redirect_auth", "redirect", "Redirect to auth portal", { destination: "https://fake-auth.example/verify" }, "temporal_graph_update", "Redirect");
        this.temporalManager.linkNodes("action_interact", "redirect_auth", "triggers", {}, "temporal_graph_update", "triggers");
        this.temporalManager.linkNodes("redirect_auth", "page_login", "redirects_to", {}, "temporal_graph_update", "redirects");
        this.temporalManager.addFinding("finding_creds", { title: "Suspicious Credential Submission", severity: "high" }, "temporal_graph_update", "Finding");
        this.temporalManager.linkNodes("req_post", "finding_creds", "supports", {}, "temporal_graph_update", "supports");
      });
      return { graph_updated: true };
    }
    if (stageId === "differential_execution") {
      await this.addTemporalObservation(() => {
        this.temporalManager.addOrUpdateNode("profile_chrome", "browser_profile", "Clean Chrome", {}, "differential_execution", "Profile1");
        this.temporalManager.addOrUpdateNode("profile_puppeteer", "browser_profile", "Automated Browser / Puppeteer", {}, "differential_execution", "Profile2");
        this.temporalManager.addOrUpdateNode("page_alt", "page", "/login-alt", { different_content: true }, "differential_execution", "Alt");
        this.temporalManager.linkNodes("profile_puppeteer", "page_alt", "observed_by", {}, "differential_execution", "observed");
        this.temporalManager.linkNodes("domain_secure", "page_alt", "contains", {}, "differential_execution", "contains");
        this.temporalManager.addFinding("finding_divergence", { title: "Behavioral Divergence", severity: "medium" }, "differential_execution", "Divergence");
        this.temporalManager.linkNodes("profile_puppeteer", "finding_divergence", "diverges_from", {}, "differential_execution", "diverges");
      });
      return { profiles_compared: 2 };
    }
    return { ok: true };
  }
  
  private async addTemporalObservation(fn: () => void) {
    await new Promise(r => setTimeout(r, 100));
    fn();
    this.eventAdapter.emit({
      investigation_id: this.investigationId,
      event_type: "graph.updated",
      timestamp: Date.now(),
      payload: { nodes: this.temporalManager.getAllNodes().length, edges: this.temporalManager.getAllEdges().length }
    });
  }
}
