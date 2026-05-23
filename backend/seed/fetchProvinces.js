/**
 * fetchProvinces.js
 * Fetches ALL Philippine provinces (Luzon + Visayas + Mindanao) from the PSGC API
 * plus Metro Manila (NCR) which is a Region in PSGC but treated as a province here.
 * Writes the result to provinces.csv.
 *
 * Run: node fetchProvinces.js
 */

const fs = require("fs");
const axios = require("axios");

const BASE = "https://psgc.gitlab.io/api";
const ISLAND_GROUPS = ["luzon", "visayas", "mindanao"];

// Metro Manila is a Region in PSGC, not a province — add it manually
const NCR = { code: "130000000", name: "Metro Manila" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAndConvert() {
  let allProvinces = [NCR]; // Metro Manila first

  for (const ig of ISLAND_GROUPS) {
    try {
      const { data } = await axios.get(`${BASE}/island-groups/${ig}/provinces/`);
      allProvinces.push(...data.map((d) => ({ code: d.code, name: d.name })));
      console.log(`✔ ${ig}: ${data.length} provinces`);
    } catch (e) {
      console.error(`✖ Failed to fetch ${ig}: ${e.message}`);
    }
    await sleep(300);
  }

  let csv = "id,name\n";
  allProvinces.forEach((p) => {
    csv += `${p.code},"${p.name.replace(/"/g, '""')}"\n`;
  });

  fs.writeFileSync("provinces.csv", csv, "utf8");
  console.log(`\nprovinces.csv created ✅  (${allProvinces.length} provinces)`);
}

fetchAndConvert().catch(console.error);
