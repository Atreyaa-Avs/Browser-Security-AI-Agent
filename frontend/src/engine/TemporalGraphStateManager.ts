import { 
  BehaviorNode, 
  BehaviorEdge, 
  BehaviorNodeType, 
  BehaviorEdgeType,
  Observation 
} from '../types/investigation';

export class TemporalGraphStateManager {
  private nodes: Map<string, BehaviorNode> = new Map();
  private edges: Map<string, BehaviorEdge> = new Map();
  private observationSequence = 0;
  
  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.observationSequence = 0;
  }
  
  addOrUpdateNode(
    id: string,
    type: BehaviorNodeType,
    label: string,
    attributes: Record<string, any>,
    source: string,
    description: string,
    browserProfileId?: string,
    iterationNumber?: number
  ): BehaviorNode {
    const existing = this.nodes.get(id);
    const now = Date.now();
    
    if (existing) {
      // Update existing node
      existing.attributes = { ...existing.attributes, ...attributes };
      existing.last_observed = now;
      existing.observation_count++;
      const obs: Observation = {
        observation_id: `obs_${now}_${++this.observationSequence}`,
        investigation_id: '', // will be set by caller context if needed
        timestamp: now,
        sequence: this.observationSequence,
        source,
        description,
        browser_profile_id: browserProfileId,
        iteration_number: iterationNumber
      };
      existing.observations.push(obs);
      return existing;
    } else {
      // Create new node
      const obs: Observation = {
        observation_id: `obs_${now}_${++this.observationSequence}`,
        investigation_id: '',
        timestamp: now,
        sequence: this.observationSequence,
        source,
        description,
        browser_profile_id: browserProfileId,
        iteration_number: iterationNumber
      };
      const node: BehaviorNode = {
        id,
        type,
        label,
        attributes,
        first_observed: now,
        last_observed: now,
        observation_count: 1,
        evidence_references: [],
        observations: [obs],
        risk_metadata: attributes.risk ? { suspicious: true, ...attributes.risk } : undefined
      };
      this.nodes.set(id, node);
      return node;
    }
  }
  
  linkNodes(
    sourceId: string,
    targetId: string,
    type: BehaviorEdgeType,
    attributes: Record<string, any>,
    source: string,
    description: string,
    browserProfileId?: string
  ): BehaviorEdge | null {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return null;
    }
    
    const edgeId = `${sourceId}-${type}-${targetId}`;
    const existing = this.edges.get(edgeId);
    const now = Date.now();
    
    if (existing) {
      existing.attributes = { ...existing.attributes, ...attributes };
      existing.last_observed = now;
      existing.observation_count++;
      const obs: Observation = {
        observation_id: `obs_${now}_${++this.observationSequence}`,
        investigation_id: '',
        timestamp: now,
        sequence: this.observationSequence,
        source,
        description,
        browser_profile_id: browserProfileId
      };
      existing.observations.push(obs);
      return existing;
    } else {
      const obs: Observation = {
        observation_id: `obs_${now}_${++this.observationSequence}`,
        investigation_id: '',
        timestamp: now,
        sequence: this.observationSequence,
        source,
        description,
        browser_profile_id: browserProfileId
      };
      const edge: BehaviorEdge = {
        id: edgeId,
        source: sourceId,
        target: targetId,
        type,
        attributes,
        first_observed: now,
        last_observed: now,
        observation_count: 1,
        evidence_references: [],
        observations: [obs]
      };
      this.edges.set(edgeId, edge);
      return edge;
    }
  }
  
  getAllNodes(): BehaviorNode[] {
    return Array.from(this.nodes.values());
  }
  
  getAllEdges(): BehaviorEdge[] {
    return Array.from(this.edges.values());
  }
  
  getNode(id: string): BehaviorNode | undefined {
    return this.nodes.get(id);
  }
  
  addFinding(id: string, attributes: Record<string, any>, source: string, description: string) {
    this.addOrUpdateNode(id, 'security_finding', attributes.title || 'Security Finding', attributes, source, description);
  }
}
