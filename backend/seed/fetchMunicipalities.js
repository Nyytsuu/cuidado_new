/**
 * fetchMunicipalities.js
 * Reads provinces.csv and fetches all cities/municipalities for each province.
 * Metro Manila (NCR) uses a different PSGC endpoint (region, not province).
 * Writes the result to municipalities.csv.
 *
 * Run AFTER fetchProvinces.js:
 *   node fetchMunicipalities.js
 */

const fs = require("fs");
const axios = require("axios");
const csv = require("csv-parser");

const BASE = "https://psgc.gitlab.io/api";
const NCR_CODE = "130000000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const provinces = [];

  fs.createReadStream("provinces.csv")
    .pipe(csv())
    .on("data", (row) => provinces.push(row))
    .on("end", async () => {
      let out = "id,province_id,name\n";

      for (const p of provinces) {
        // Metro Manila cities come from the regions endpoint, not provinces
        const url =
          p.id === NCR_CODE
            ? `${BASE}/regions/${NCR_CODE}/cities-municipalities/`
            : `${BASE}/provinces/${p.id}/cities-municipalities.json`;

        try {
          const { data } = await axios.get(url);

          data.forEach((cm) => {
            const safeName = (cm.name || "").replace(/"/g, '""');
            out += `${cm.code},${p.id},"${safeName}"\n`;
          });

          console.log(`✔ ${p.name} (${data.length})`);
        } catch (e) {
          console.log(`✖ ${p.id} ${p.name} -> ${e.response?.status || e.message}`);
        }

        await sleep(150);
      }

      fs.writeFileSync("municipalities.csv", out, "utf8");
      console.log("\nmunicipalities.csv created ✅");
      process.exit(0);
    });
}

run().catch(console.error);
