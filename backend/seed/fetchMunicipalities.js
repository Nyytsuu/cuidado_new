const fs = require("fs");
const axios = require("axios");
const csv = require("csv-parser");

const BASE = "https://psgc.gitlab.io/api/provinces";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const provinces = [];

  fs.createReadStream("provinces.csv")
    .pipe(csv())
    .on("data", (row) => provinces.push(row))
    .on("end", async () => {
      let out = "id,province_id,name\n";

      for (const p of provinces) {
        const url = `${BASE}/${p.id}/cities-municipalities.json`;

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

        await sleep(150); // be nice to the API
      }

      fs.writeFileSync("municipalities.csv", out, "utf8");
      console.log("municipalities.csv created ✅");
      process.exit(0);
    });
}

run().catch(console.error);