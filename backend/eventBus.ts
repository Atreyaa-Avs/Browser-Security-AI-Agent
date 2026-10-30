import { Server, Socket } from 'socket.io';
import { getDb, newId, now } from './database';
import type { InvestigationEvent } from './types';

const EVENT_TYPES = [
  'investigation.created',
  'investigation.status_changed',
  'stage.started',
  'stage.completed',
  'stage.failed',
  'browser.session_started',
  'browser.navigation',
  'browser.action_started',
  'browser.action_completed',
  'browser.screenshot_available',
  'browser.recording_available',
  'dom.observed',
  'network.request_observed',
  'network.redirect_observed',
  'form.observed',
  'graph.node_upserted',
  'graph.edge_upserted',
  'evidence.created',
  'risk.updated',
  'differential.profile_started',
  'differential.profile_completed',
  'agent_manipulation.detected',
  'investigation.progress',
  'investigation.completed',
  'investigation.failed',
  'investigation.cancelled',
];

export class EventBus {
  private io: Server;
  private seqCounters = new Map<string, number>();

  constructor(io: Server) {
    this.io = io;
  }

  async publish(investigationId: string, type: string, payload: Record<string, any>): Promise<InvestigationEvent> {
    const db = getDb();
    const seq = (this.seqCounters.get(investigationId) || 0) + 1;
    this.seqCounters.set(investigationId, seq);

    const event: InvestigationEvent = {
      id: newId(),
      investigationId,
      seq,
      type,
      schemaVersion: 1,
      timestamp: now(),
      payload,
    };

    // Persist before publishing
    db.prepare(
      'INSERT INTO investigation_events (id, investigation_id, seq, type, schema_version, timestamp, payload) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(event.id, event.investigationId, event.seq, event.type, event.schemaVersion, event.timestamp, JSON.stringify(event.payload));

    // Broadcast to investigation room
    this.io.to(`investigation:${investigationId}`).emit('investigation:event', event);
    return event;
  }

  subscribe(socket: Socket, investigationId: string): void {
    socket.join(`investigation:${investigationId}`);
  }

  unsubscribe(socket: Socket, investigationId: string): void {
    socket.leave(`investigation:${investigationId}`);
  }

  getEventTypes(): string[] {
    return [...EVENT_TYPES];
  }

  async getEventsSince(investigationId: string, sinceSeq: number, limit: number = 100): Promise<InvestigationEvent[]> {
    const db = getDb();
    const rows = db.prepare(
      'SELECT id, investigation_id, seq, type, schema_version, timestamp, payload FROM investigation_events WHERE investigation_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?'
    ).all(investigationId, sinceSeq, limit);
    return rows.map((r: any) => ({
      id: r.id,
      investigationId: r.investigation_id,
      seq: r.seq,
      type: r.type,
      schemaVersion: r.schema_version,
      timestamp: r.timestamp,
      payload: JSON.parse(r.payload),
    }));
  }

  async getAllEvents(investigationId: string, limit: number = 100): Promise<InvestigationEvent[]> {
    const db = getDb();
    const rows = db.prepare(
      'SELECT id, investigation_id, seq, type, schema_version, timestamp, payload FROM investigation_events WHERE investigation_id = ? ORDER BY seq ASC LIMIT ?'
    ).all(investigationId, limit);
    return rows.map((r: any) => ({
      id: r.id,
      investigationId: r.investigation_id,
      seq: r.seq,
      type: r.type,
      schemaVersion: r.schema_version,
      timestamp: r.timestamp,
      payload: JSON.parse(r.payload),
    }));
  }

  resetCounter(investigationId: string): void {
    this.seqCounters.delete(investigationId);
  }
}