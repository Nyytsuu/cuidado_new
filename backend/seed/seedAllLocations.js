/**
 * seedAllLocations.js
 *
 * Fetches ALL Philippine provinces (Luzon + Visayas + Mindanao + Metro Manila / NCR)
 * together with their cities/municipalities and barangays from the PSGC API,
 * then inserts them into the PostgreSQL database — skipping records that
 * already exist (ON CONFLICT DO NOTHING).
 *
 * Run from the backend/ folder:
 *   node seed/seedAllLocations.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const axios = require("axios");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "https://psgc.gitlab.io/api";

/* ── Metro Manila is a Region in PSGC, not a Province.
       We treat it as a province row so the dropdown works. ── */
const NCR = { code: "130000000", name: "Metro Manila" };

async function fetchJSON(url) {
  const { data } = await axios.get(url, { timeout: 15000 });
  return data;
}

async function run() {
  const client = await pool.connect();

  try {
    console.log("=== Seeding Philippine Locations ===\n");

    /* ─────────────────────────────────────────
       STEP 1: Collect all provinces
    ───────────────────────────────────────── */
    const islandGroups = ["luzon", "visayas", "mindanao"];
    let allProvinces = [NCR]; // Metro Manila first

    for (const ig of islandGroups) {
      try {
        const url = `${BASE}/island-groups/${ig}/provinces/`;
        const data = await fetchJSON(url);
        allProvinces.push(...data.map((d) => ({ code: d.code, name: d.name })));
        console.log(`✔ ${ig}: ${data.length} provinces fetched`);
      } catch (e) {
        console.error(`✖ Failed to fetch ${ig} provinces: ${e.message}`);
      }
      await sleep(300);
    }

    console.log(`\nTotal provinces to process: ${allProvinces.length}\n`);

    /* ─────────────────────────────────────────
       STEP 2: Insert provinces
    ───────────────────────────────────────── */
    for (const prov of allProvinces) {
      await client.query(
        `INSERT INTO provinces (id, province_name)
         VALUES ($1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [prov.code, prov.name]
      );
    }
    console.log(`✅ Provinces inserted/skipped: ${allProvinces.length}\n`);

    /* ─────────────────────────────────────────
       STEP 3: Fetch & insert municipalities
    ───────────────────────────────────────── */
    let totalMunicipalities = 0;
    const allMunicipalityCodes = [];

    for (const prov of allProvinces) {
      const url =
        prov.code === NCR.code
          ? `${BASE}/regions/${NCR.code}/cities-municipalities/`
          : `${BASE}/provinces/${prov.code}/cities-municipalities.json`;

      try {
        const data = await fetchJSON(url);

        for (const city of data) {
          await client.query(
            `INSERT INTO municipalities (id, province_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO NOTHING`,
            [city.code, prov.code, city.name]
          );
          allMunicipalityCodes.push({ code: city.code, name: city.name });
        }

        totalMunicipalities += data.length;
        console.log(`  ✔ ${prov.name}: ${data.length} cities/municipalities`);
      } catch (e) {
        console.log(`  ✖ ${prov.name}: ${e.response?.status || e.message}`);
      }

      await sleep(200);
    }

    console.log(`\n✅ Municipalities inserted/skipped: ${totalMunicipalities}\n`);

    /* ─────────────────────────────────────────
       STEP 4: Fetch & insert barangays
       (fetches for ALL municipalities in the DB
        so existing ones aren't missed either)
    ───────────────────────────────────────── */
    const { rows: dbMunis } = await client.query(
      "SELECT id, name FROM municipalities ORDER BY name"
    );

    console.log(`Fetching barangays for ${dbMunis.length} municipalities…`);
    console.log("(This may take several minutes — please keep the window open)\n");

    let totalBarangays = 0;
    let processed = 0;

    for (const muni of dbMunis) {
      const url = `${BASE}/cities-municipalities/${muni.id}/barangays.json`;

      try {
        const data = await fetchJSON(url);

        for (const b of data) {
          await client.query(
            `INSERT INTO barangays (id, municipality_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO NOTHING`,
            [b.code, muni.id, b.name]
          );
        }

        totalBarangays += data.length;
        processed++;

        if (processed % 50 === 0) {
          console.log(
            `  … ${processed}/${dbMunis.length} done (${totalBarangays} barangays so far)`
          );
        }
      } catch (e) {
        // Some PSGC codes return 404 for barangays — skip silently
        if (e.response?.status !== 404) {
          console.log(`  ✖ ${muni.name}: ${e.response?.status || e.message}`);
        }
      }

      await sleep(200);
    }

    console.log(`\n✅ Barangays inserted/skipped: ${totalBarangays}`);
    console.log("\n=== Done! All Philippine locations are now seeded. ===");
  } catch (err) {
    console.error("Fatal error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
