import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'investigations.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS investigations (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      normalized_url TEXT NOT NULL,
      hostname TEXT NOT NULL,
      config TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      stage TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      cancelled_at INTEGER,
      error TEXT,
      verdict TEXT,
      report TEXT
    );

    CREATE TABLE IF NOT EXISTS investigation_events (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      type TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      timestamp INTEGER NOT NULL,
      payload TEXT NOT NULL,
      FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_inv_seq ON investigation_events(investigation_id, seq);
    CREATE INDEX IF NOT EXISTS idx_events_inv_type ON investigation_events(investigation_id, type);

    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at INTEGER,
      completed_at INTEGER,
      duration_ms INTEGER,
      input_summary TEXT,
      output_summary TEXT,
      config TEXT,
      error TEXT,
      FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_pipeline_inv ON pipeline_stages(investigation_id);

    CREATE TABLE IF NOT EXISTS browser_sessions (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_session_id TEXT,
      profile TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      capabilities TEXT,
      recording_url TEXT,
      recording_type TEXT,
      started_at INTEGER,
      ended_at INTEGER,
      FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_inv ON browser_sessions(investigation_id);

    CREATE TABLE IF NOT EXISTS browser_actions (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      target TEXT,
      input TEXT,
      result TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at INTEGER,
      completed_at INTEGER,
      screenshot_url TEXT,
      FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_actions_inv_seq ON browser_actions(investigation_id, seq);

    CREATE TABLE IF NOT EXISTS graph_nodes (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      node_type TEXT NOT NULL,
      label TEXT NOT NULL,
      properties TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_inv ON graph_nodes(investigation_id);

    CREATE TABLE IF NOT EXISTS graph_edges (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      properties TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_edges_inv ON graph_edges(investigation_id);

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT,
      confidence TEXT,
      data TEXT NOT NULL,
      source_event_id TEXT,
      graph_node_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_evidence_inv ON evidence(investigation_id);

    CREATE TABLE IF NOT EXISTS network_observations (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      session_id TEXT,
      url TEXT NOT NULL,
      method TEXT,
      host TEXT,
      path TEXT,
      resource_type TEXT,
      initiator TEXT,
      status_code INTEGER,
      redirect_chain TEXT,
      duration_ms INTEGER,
      security_notes TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_network_inv ON network_observations(investigation_id);

    CREATE TABLE IF NOT EXISTS differential_runs (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      profile TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      config TEXT NOT NULL,
      navigation TEXT,
      dom_observations TEXT,
      network_observations TEXT,
      findings TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      divergence_score REAL,
      divergence_signals TEXT,
      FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_diff_inv ON differential_runs(investigation_id);

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL,
      category TEXT NOT NULL,
      score REAL NOT NULL,
      severity TEXT NOT NULL,
      confidence TEXT NOT NULL,
      explanation TEXT NOT NULL,
      supporting_evidence TEXT NOT NULL,
      contradicting_evidence TEXT,
      limitations TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_risk_inv ON risk_assessments(investigation_id);

    CREATE TABLE IF NOT EXISTS final_reports (
      id TEXT PRIMARY KEY,
      investigation_id TEXT NOT NULL UNIQUE,
      verdict TEXT NOT NULL,
      duration_ms INTEGER,
      browser_actions INTEGER,
      redirects INTEGER,
      network_events INTEGER,
      graph_nodes INTEGER,
      graph_edges INTEGER,
      profile_count INTEGER,
      recording_status TEXT,
      stopping_reason TEXT,
      limitations TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}

export function newId(): string {
  return uuidv4();
}

export function now(): number {
  return Date.now();
}

export default { getDb, newId, now };