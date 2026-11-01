import { initTRPC } from "@trpc/server";
import { z } from "zod";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { spawn } from "child_process";
import path from "path";
import { getDb, newId, now } from "./database";
import { validateUrl } from "./urlValidator";
import { EventBus } from "./eventBus";
import * as T from "./types";

const t = initTRPC.create();
const db = getDb();
const io = new Server({ cors: { origin: "*" } });
const eventBus = new EventBus(io);

function emit(invId: string, type: string, payload: any) {
  return eventBus.publish(invId, type, payload);
}

async function runPipeline(invId: string, url: string, config: any) {
  const stages = T.PipelineStageName.options as string[];
  for (const s of stages) {
    db.prepare("INSERT INTO pipeline_stages (id, investigation_id, name, status) VALUES (?,?,?,?)").run(newId(), invId, s, "pending");
  }
  const setStage = (name: string, status: string, extra: any = {}) => {
    db.prepare("UPDATE pipeline_stages SET status=?, started_at=COALESCE(started_at,?), completed_at=?, duration_ms=?, input_summary=?, output_summary=?, error=? WHERE investigation_id=? AND name=?")
      .run(status, status === "running" ? now() : null, status === "completed" || status === "failed" || status === "skipped" ? now() : null, extra.duration ?? null, extra.input ?? null, extra.output ?? null, extra.error ?? null, invId, name);
  };

  const stage = async (name: string, fn: () => Promise<any>) => {
    setStage(name, "running");
    await emit(invId, "stage.started", { stage: name });
    try {
      const res = await fn();
      setStage(name, "completed", { output: JSON.stringify(res ?? {}).slice(0, 500) });
      await emit(invId, "stage.completed", { stage: name, result: res });
      return res;
    } catch (e: any) {
      setStage(name, "failed", { error: e.message });
      await emit(invId, "stage.failed", { stage: name, error: e.message });
      throw e;
    }
  };

  try {
    db.prepare("UPDATE investigations SET status='initializing', stage='initializing', updated_at=? WHERE id=?").run(now(), invId);
    await emit(invId, "investigation.status_changed", { status: "initializing" });

    await stage("url_received", async () => ({ url }));
    await stage("static_risk_assessment", async () => ({ note: "basic static checks" }));

    // Run browser-agent
    await stage("browser_investigator", async () => {
      await emit(invId, "browser.session_started", { provider: "local-playwright" });
      return new Promise((resolve, reject) => {
        const child = spawn("npx", ["tsx", "agent.ts", url], { cwd: path.join(__dirname, "..", "browser-agent"), shell: true });
        let out = "";
        child.stdout.on("data", (d) => { out += d.toString(); });
        child.stderr.on("data", (d) => { out += d.toString(); });
        child.on("close", (code) => {
          if (code !== 0) return reject(new Error("browser-agent failed: " + out));
          try { resolve(JSON.parse(out)); } catch { resolve({ raw: out }); }
        });
      });
    });

    await stage("dom_observation", async () => ({ ok: true }));
    await stage("network_observation", async () => ({ ok: true }));
    await stage("visual_observation", async () => ({ ok: true }));
    await stage("temporal_graph", async () => ({ ok: true }));
    await stage("behavioral_intent_inference", async () => ({ ok: true }));
    await stage("information_gain_selector", async () => ({ ok: true }));
    await stage("controlled_browser_action", async () => ({ ok: true }));
    await stage("new_evidence_collection", async () => ({ ok: true }));
    await stage("temporal_graph_update", async () => ({ ok: true }));
    await stage("stopping_rule_evaluation", async () => ({ ok: true }));
    await stage("differential_execution", async () => ({ skipped: true }));
    await stage("evidence_fusion", async () => ({ ok: true }));
    await stage("phishing_risk_assessment", async () => ({ score: 0.3, severity: "low" }));
    await stage("cloaking_risk_assessment", async () => ({ score: 0.1, severity: "low" }));
    await stage("agent_manipulation_risk_assessment", async () => ({ score: 0.1, severity: "low" }));

    await stage("final_report", async () => ({ verdict: "needs_review" }));

    db.prepare("UPDATE investigations SET status='completed', stage='completed', progress=100, completed_at=?, updated_at=?, verdict=? WHERE id=?").run(now(), now(), "needs_review", invId);
    await emit(invId, "investigation.completed", { verdict: "needs_review" });
  } catch (e: any) {
    db.prepare("UPDATE investigations SET status='failed', error=?, updated_at=? WHERE id=?").run(e.message, now(), invId);
    await emit(invId, "investigation.failed", { error: e.message });
  }
}

const appRouter = t.router({
  health: t.procedure.query(() => ({ ok: true })),
  createInvestigation: t.procedure.input(T.InvestigationConfigSchema).mutation(async ({ input }: { input: any }) => {
    const v = await validateUrl(input.url);
    if (!v.valid) throw new Error(v.error || "invalid url");
    const id = newId();
    db.prepare("INSERT INTO investigations (id, url, normalized_url, hostname, config, status, stage, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, input.url, v.normalizedUrl, v.hostname, JSON.stringify(input), "queued", "queued", now(), now());
    await emit(id, "investigation.created", { url: input.url });
    // run async
    runPipeline(id, input.url, input).catch(() => {});
    return { investigationId: id };
  }),
  getInvestigation: t.procedure.input(z.object({ id: z.string() })).query(({ input }: { input: any }) => {
    return db.prepare("SELECT * FROM investigations WHERE id=?").get(input.id);
  }),
  listInvestigations: t.procedure.input(z.object({ status: z.string().optional(), limit: z.number().default(20), offset: z.number().default(0) })).query(({ input }: { input: any }) => {
    if (input.status) return db.prepare("SELECT * FROM investigations WHERE status=? ORDER BY created_at DESC LIMIT ? OFFSET ?").all(input.status, input.limit, input.offset);
    return db.prepare("SELECT * FROM investigations ORDER BY created_at DESC LIMIT ? OFFSET ?").all(input.limit, input.offset);
  }),
  cancelInvestigation: t.procedure.input(z.object({ id: z.string() })).mutation(({ input }: { input: any }) => {
    db.prepare("UPDATE investigations SET status='cancelled', cancelled_at=?, updated_at=? WHERE id=?").run(now(), now(), input.id);
    emit(input.id, "investigation.cancelled", {});
    return { ok: true };
  }),
  getInvestigationEvents: t.procedure.input(z.object({ id: z.string(), since: z.number().optional(), limit: z.number().default(100) })).query(async ({ input }: { input: any }) => {
    return eventBus.getEventsSince(input.id, input.since ?? 0, input.limit);
  }),
  getPipelineState: t.procedure.input(z.object({ id: z.string() })).query(({ input }: { input: any }) => {
    return db.prepare("SELECT * FROM pipeline_stages WHERE investigation_id=?").all(input.id);
  }),
  getBehavioralGraph: t.procedure.input(z.object({ id: z.string() })).query(({ input }: { input: any }) => {
    const nodes = db.prepare("SELECT * FROM graph_nodes WHERE investigation_id=?").all(input.id);
    const edges = db.prepare("SELECT * FROM graph_edges WHERE investigation_id=?").all(input.id);
    return { nodes, edges };
  }),
  getEvidence: t.procedure.input(z.object({ id: z.string(), limit: z.number().default(50) })).query(({ input }: { input: any }) => {
    return db.prepare("SELECT * FROM evidence WHERE investigation_id=? LIMIT ?").all(input.id, input.limit);
  }),
  getNetworkEvents: t.procedure.input(z.object({ id: z.string(), limit: z.number().default(50) })).query(({ input }: { input: any }) => {
    return db.prepare("SELECT * FROM network_observations WHERE investigation_id=? LIMIT ?").all(input.id, input.limit);
  }),
  getBrowserActions: t.procedure.input(z.object({ id: z.string(), limit: z.number().default(50) })).query(({ input }: { input: any }) => {
    return db.prepare("SELECT * FROM browser_actions WHERE investigation_id=? LIMIT ?").all(input.id, input.limit);
  }),
  getDifferentialAnalysis: t.procedure.input(z.object({ id: z.string() })).query(({ input }: { input: any }) => {
    return db.prepare("SELECT * FROM differential_runs WHERE investigation_id=?").all(input.id);
  }),
  getFinalReport: t.procedure.input(z.object({ id: z.string() })).query(({ input }: { input: any }) => {
    return db.prepare("SELECT * FROM final_reports WHERE investigation_id=?").get(input.id);
  }),
  getRecordingMetadata: t.procedure.input(z.object({ id: z.string() })).query(({ input }: { input: any }) => {
    return db.prepare("SELECT * FROM browser_sessions WHERE investigation_id=?").all(input.id);
  }),
  getAuthorizedReplayAccess: t.procedure.input(z.object({ investigationId: z.string(), artifactId: z.string() })).query(() => ({ url: null })),
});

export type AppRouter = typeof appRouter;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
io.attach(server, { cors: { origin: "*" } });

app.get("/", (_req, res) => res.json({ status: "ok" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

// socket.io
io.on("connection", (socket) => {
  socket.on("subscribe", (invId: string) => eventBus.subscribe(socket, invId));
  socket.on("unsubscribe", (invId: string) => eventBus.unsubscribe(socket, invId));
});

app.use("/trpc", createExpressMiddleware({ router: appRouter }));

// SSE endpoint
app.get("/events/:id", (req, res) => {
  const invId = req.params.id;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const send = (e: any) => res.write(`data: ${JSON.stringify(e)}\n\n`);
  const interval = setInterval(async () => {
    const evs = await eventBus.getEventsSince(invId, 0, 1000);
    // heartbeat
    res.write(": heartbeat\n\n");
  }, 15000);
  req.on("close", () => clearInterval(interval));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`backend listening on ${PORT}`));
