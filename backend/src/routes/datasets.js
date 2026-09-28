import express from "express";
import { store } from "../lib/store.js";

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try { res.json({ datasets: await store.list() }); } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const dataset = await store.get(req.params.id);
    if (!dataset) return res.status(404).json({ error: "Dataset not found." });
    res.json({ dataset });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const d = await store.get(req.params.id);
    if (!d) return res.status(404).json({ error: "Dataset not found." });
    if (d.source === "sample") return res.status(403).json({ error: "Sample datasets can't be deleted." });
    await store.remove(req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
