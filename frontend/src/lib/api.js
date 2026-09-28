const BASE = import.meta.env.VITE_API_URL || "http://localhost:8787";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}
const netErr = () => new Error("Can't reach the API. Is the backend running on " + BASE + "?");
const call = (url, opts) => fetch(url, opts).catch(() => { throw netErr(); });

export const listDatasets = async () => handle(await call(`${BASE}/datasets`)).then((d) => d.datasets);

export async function uploadDataset(file) {
  const form = new FormData();
  form.append("file", file);
  return handle(await call(`${BASE}/upload`, { method: "POST", body: form })).then((d) => d.dataset);
}

export async function filterDataset(body, signal) {
  return handle(
    await call(`${BASE}/analytics/filter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    })
  );
}

export function exportUrl({ datasetId, filters, search, sort }) {
  const params = new URLSearchParams({ datasetId });
  if (filters && Object.keys(filters).length) params.set("filters", JSON.stringify(filters));
  if (search) params.set("search", search);
  if (sort?.col) { params.set("sortCol", sort.col); params.set("sortDir", sort.dir); }
  return `${BASE}/export?${params.toString()}`;
}
