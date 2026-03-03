const fs = require("fs");
const axios = require("axios");

const URL =
  "https://psgc.gitlab.io/api/island-groups/luzon/provinces/"; // example endpoint

async function fetchAndConvert() {
  const res = await axios.get(URL);

  const rows = res.data.map((item) => ({
    id: item.code,
    name: item.name,
  }));

  let csv = "id,name\n";
  rows.forEach((r) => {
    csv += `${r.id},"${r.name}"\n`;
  });

  fs.writeFileSync("provinces.csv", csv);
  console.log("provinces.csv created ✅");
}

fetchAndConvert();