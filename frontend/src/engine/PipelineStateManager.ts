import { 
  PipelineStage, 
  PIPELINE_STAGES, 
  StageStatus 
} from '../types/investigation';

export class PipelineStateManager {
  private stages: Map<string, PipelineStage> = new Map();
  
  initialize() {
    this.stages.clear();
    PIPELINE_STAGES.forEach(stage => {
      this.stages.set(stage.id, {
        stage_id: stage.id,
        name: stage.name,
        phase: stage.phase,
        status: 'pending'
      });
    });
  }
  
  getAllStages(): PipelineStage[] {
    return Array.from(this.stages.values());
  }
  
  getStage(stageId: string): PipelineStage | undefined {
    return this.stages.get(stageId);
  }
  
  startStage(stageId: string, input?: any) {
    const stage = this.stages.get(stageId);
    if (stage) {
      stage.status = 'running';
      stage.start_time = Date.now();
      stage.input = input;
      stage.error = undefined;
    }
  }
  
  completeStage(stageId: string, output?: any, evidenceIds?: string[]) {
    const stage = this.stages.get(stageId);
    if (stage) {
      stage.status = 'completed';
      stage.end_time = Date.now();
      if (stage.start_time) {
        stage.duration = stage.end_time - stage.start_time;
      }
      stage.output = output;
      stage.evidence_ids = evidenceIds || [];
    }
  }
  
  skipStage(stageId: string, output?: any) {
    const stage = this.stages.get(stageId);
    if (stage) {
      stage.status = 'skipped';
      stage.end_time = Date.now();
      if (stage.start_time) {
        stage.duration = stage.end_time - stage.start_time;
      }
      stage.output = output;
    }
  }
  
  failStage(stageId: string, error: string) {
    const stage = this.stages.get(stageId);
    if (stage) {
      stage.status = 'failed';
      stage.end_time = Date.now();
      if (stage.start_time) {
        stage.duration = stage.end_time - stage.start_time;
      }
      stage.error = error;
    }
  }
  
  getRunningStage(): PipelineStage | undefined {
    for (const stage of this.stages.values()) {
      if (stage.status === 'running') return stage;
    }
    return undefined;
  }
  
  getProgress(): number {
    const total = this.stages.size;
    let completed = 0;
    for (const stage of this.stages.values()) {
      if (stage.status === 'completed' || stage.status === 'skipped') completed++;
    }
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}
