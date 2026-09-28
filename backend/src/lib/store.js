// Storage abstraction. Routes only talk to this module.
//  - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set  -> Supabase Postgres
//  - otherwise                                     -> in-memory + backend/data/store.json
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { detectColumns, cleanRows } from "./dataUtils.js";
import { SAMPLES } from "./samples.js";

const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const storeMode = useSupabase ? "supabase" : "local";

const META_FIELDS = "id, name, source, row_count, columns, created_at";

// ---------- local implementation ----------
const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data/store.json");
let db = { datasets: [], rows: {} };

function loadLocal() {
  try {
    db = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    db = { datasets: [], rows: {} };
  }
}
function saveLocal() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(db));
  } catch (e) {
    console.warn("[store] could not persist to disk (continuing in memory):", e.message);
  }
}

const local = {
  async list() {
    return db.datasets.map(strip).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },
  async get(id) {
    const d = db.datasets.find((x) => x.id === id);
    return d ? strip(d) : null;
  },
  async rows(id) {
    return db.rows[id] || [];
  },
  async create(meta, rows) {
    const dataset = { id: randomUUID(), created_at: new Date().toISOString(), ...meta };
    db.datasets.push(dataset);
    db.rows[dataset.id] = rows;
    saveLocal();
    return dataset;
  },
  async remove(id) {
    db.datasets = db.datasets.filter((d) => d.id !== id);
    delete db.rows[id];
    saveLocal();
  },
};
const strip = ({ original_filename, ...d }) => d;

// ---------- supabase implementation ----------
let sb;
async function client() {
  if (!sb) sb = (await import("./supabaseClient.js")).supabase;
  return sb;
}
const remote = {
  async list() {
    const { data, error } = await (await client()).from("datasets").select(META_FIELDS).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async get(id) {
    const { data, error } = await (await client()).from("datasets").select(META_FIELDS).eq("id", id).single();
    return error ? null : data;
  },
  async rows(id) {
    const c = await client();
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await c.from("dataset_records").select("data").eq("dataset_id", id).order("row_index").range(from, from + 999);
      if (error) throw error;
      out.push(...data.map((r) => r.data));
      if (data.length < 1000) break;
    }
    return out;
  },
  async create(meta, rows) {
    const c = await client();
    const { data: dataset, error } = await c.from("datasets").insert(meta).select().single();
    if (error) throw error;
    const recs = rows.map((data, i) => ({ dataset_id: dataset.id, row_index: i, data }));
    for (let i = 0; i < recs.length; i += 500) {
      const { error: e2 } = await c.from("dataset_records").insert(recs.slice(i, i + 500));
      if (e2) throw e2;
    }
    return dataset;
  },
  async remove(id) {
    const { error } = await (await client()).from("datasets").delete().eq("id", id);
    if (error) throw error;
  },
};

const impl = useSupabase ? remote : local;
if (!useSupabase) loadLocal();

export const store = {
  list: () => impl.list(),
  get: (id) => impl.get(id),
  rows: (id) => impl.rows(id),
  create: (meta, rows) => impl.create(meta, rows),
  remove: (id) => impl.remove(id),
};

// Insert the two sample datasets if they're missing (idempotent).
export async function ensureSamples() {
  const existing = await store.list();
  for (const s of SAMPLES) {
    if (existing.some((d) => d.name === s.name && d.source === "sample")) continue;
    const raw = s.rows();
    const columns = detectColumns(raw);
    const rows = cleanRows(raw, columns);
    await store.create({ name: s.name, source: "sample", row_count: rows.length, columns }, rows);
    console.log(`[seed] ${s.name}: ${rows.length} rows`);
  }
}
