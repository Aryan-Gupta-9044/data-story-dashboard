// Deterministic sample datasets (seeded RNG so every boot produces the same demo data).
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const companies = ["Infosys", "TCS", "Wipro", "Accenture", "Google", "Amazon", "Deloitte", "Zoho"];
const branches = ["CSE", "ECE", "Mech", "IT", "EEE", "Civil"];

export function campusPlacements(n = 240) {
  const r = rng(42);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const placed = r() > 0.28;
    const spike = i === 77; // one deliberate outlier for the anomaly demo
    rows.push({
      student_id: `STU${1000 + i}`,
      branch: branches[i % branches.length],
      cgpa: Math.round((6 + r() * 4) * 100) / 100,
      company: placed ? companies[Math.floor(r() * companies.length)] : "Not placed",
      package_lpa: spike ? 78 : placed ? Math.round((4 + r() * 26) * 10) / 10 : 0,
      placed: placed ? "Yes" : "No",
      placement_date: new Date(Date.UTC(2025, i % 12, 1 + (i % 27))).toISOString().slice(0, 10),
    });
  }
  return rows;
}

const cities = ["Chennai", "Pune", "Austin", "Berlin", "Nairobi", "Osaka"];
const sources = ["Solar", "Wind", "Grid", "Battery"];

export function smartCityEnergy(n = 300) {
  const r = rng(7);
  const rows = [];
  const start = Date.UTC(2025, 0, 1);
  for (let i = 0; i < n; i++) {
    const source = sources[Math.floor(r() * sources.length)];
    const base = 800 + 400 * Math.sin(i / 12);
    const spike = i === 150 ? 900 : 0;
    rows.push({
      date: new Date(start + i * 86400000).toISOString().slice(0, 10),
      city: cities[i % cities.length],
      energy_source: source,
      consumption_mwh: Math.max(50, Math.round(base + (r() - 0.5) * 200 + spike)),
      renewable_pct: Math.round(source === "Solar" || source === "Wind" ? 70 + r() * 30 : r() * 40),
    });
  }
  return rows;
}

export const SAMPLES = [
  { name: "Campus Placements", rows: campusPlacements },
  { name: "Smart City Energy", rows: smartCityEnergy },
];
