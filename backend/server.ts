import { initTRPC } from "@trpc/server";
import { z } from "zod";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

const t = initTRPC.create();

export const appRouter = t.router({
  health: t.procedure.query(() => ({ ok: true })),
  startScan: t.procedure
    .input(z.object({ url: z.string().url() }))
    .mutation(({ input }: { input: { url: string } }) => ({ jobId: "job-1", url: input.url })),
});

export type AppRouter = typeof appRouter;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    text: "Browser Security AI Agent Backend API working!",
    date: new Date().toLocaleString().toString(),
  });
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/trpc", createExpressMiddleware({ router: appRouter }));

io.on("connection", (socket) => {
  console.log("client connected", socket.id);
  socket.on("disconnect", () => console.log("client disconnected", socket.id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`backend listening on ${PORT}`));
