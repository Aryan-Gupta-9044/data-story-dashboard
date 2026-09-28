import express from "express";
import cors from "cors";
import "dotenv/config";

import uploadRouter from "./routes/upload.js";
import datasetsRouter from "./routes/datasets.js";
import analyticsRouter from "./routes/analytics.js";
import exportRouter from "./routes/export.js";
import { ensureSamples, storeMode } from "./lib/store.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*", exposedHeaders: ["Content-Disposition"] }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, store: storeMode }));

app.use("/upload", uploadRouter);
app.use("/datasets", datasetsRouter);
app.use("/analytics", analyticsRouter);
app.use("/export", exportRouter);

app.use((_req, res) => res.status(404).json({ error: "Route not found." }));

// Centralised { error } responses (multer size/type errors included).
app.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "That file is over the 10MB limit." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Malformed JSON body." });
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Unexpected error." });
});
const PORT = process.env.PORT || 8787;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});