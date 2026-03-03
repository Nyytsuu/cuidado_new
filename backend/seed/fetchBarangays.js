const fs = require("fs");
const axios = require("axios");
const csv = require("csv-parser");

const BASE = "https://psgc.gitlab.io/api/cities-municipalities";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const municipalities = [];

  fs.createReadStream("municipalities.csv")
    .pipe(csv())
    .on("data", (row) => municipalities.push(row))
    .on("end", async () => {
      let out = "id,municipality_id,name\n";

      for (const m of municipalities) {
        const url = `${BASE}/${m.id}/barangays.json`;

        try {
          const { data } = await axios.get(url);

          data.forEach((b) => {
            const safeName = (b.name || "").replace(/"/g, '""');
            out += `${b.code},${m.id},"${safeName}"\n`;
          });

          console.log(`✔ ${m.name} (${data.length})`);
        } catch (e) {
          console.log(
            `✖ ${m.id} ${m.name} -> ${e.response?.status || e.message}`
          );
        }

        // IMPORTANT: barangays are MANY — slow down requests
        await sleep(200);
      }

      fs.writeFileSync("barangays.csv", out, "utf8");
      console.log("barangays.csv created ✅");
      process.exit(0);
    });
}

run().catch(console.error);