import { InvestigationEvent } from '../types/investigation';

export interface EventAdapter {
  onEvent(callback: (event: InvestigationEvent) => void): void;
  start(): void;
  stop(): void;
}

export class MockEventAdapter implements EventAdapter {
  private callback: ((event: InvestigationEvent) => void) | null = null;
  private sequence = 0;
  
  onEvent(callback: (event: InvestigationEvent) => void) {
    this.callback = callback;
  }
  
  start() {
    // Adapter started
  }
  
  stop() {
    this.callback = null;
  }
  
  emit(event: Omit<InvestigationEvent, 'event_id' | 'sequence'>) {
    if (!this.callback) return;
    this.sequence++;
    const fullEvent: InvestigationEvent = {
      ...event,
      event_id: `evt_${Date.now()}_${this.sequence}`,
      sequence: this.sequence
    };
    this.callback(fullEvent);
  }
}
