// Manual seeding (mainly for Supabase mode). Local mode auto-seeds on server boot.
import { ensureSamples, storeMode } from "./lib/store.js";
console.log(`Seeding samples into ${storeMode} store…`);
ensureSamples().then(() => process.exit(0)).catch((e) => { console.error("Seeding failed:", e.message); process.exit(1); });
