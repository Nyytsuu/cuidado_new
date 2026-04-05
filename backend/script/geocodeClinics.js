const pool = require("../db/pool");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanAddress(address) {
  if (!address) return "";

  return address
    .replace(/\(.*?\)/g, " ")          // remove text in parentheses
    .replace(/\bBlk\.?\s*\d+\b/gi, " ") // remove Blk 9
    .replace(/\bBlock\.?\s*\d+\b/gi, " ")
    .replace(/\bLot\.?\s*\d+\b/gi, " ") // remove Lot 22
    .replace(/\bL\s*\d+\b/gi, " ")      // remove L22
    .replace(/\bNo\.?\s*\d+\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildPrimaryQuery(clinic) {
  const cleanedAddress = cleanAddress(clinic.address);

  return [cleanedAddress, "Philippines"].filter(Boolean).join(", ");
}

function buildFallbackQuery(clinic) {
  const cleanedAddress = cleanAddress(clinic.address);

  const firstPart = cleanedAddress.split(",")[0]?.trim() || cleanedAddress;

  return [firstPart, clinic.municipality_name, clinic.province_name, "Philippines"]
    .filter(Boolean)
    .join(", ");
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "cuidado-medihelp/1.0",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return {
    latitude: Number(data[0].lat),
    longitude: Number(data[0].lon),
  };
}

async function main() {
  try {
    const [clinics] = await pool.query(`
      SELECT
        c.id,
        c.clinic_name,
        c.address,
        c.latitude,
        c.longitude,
        b.name AS barangay_name,
        m.name AS municipality_name,
        p.province_name AS province_name
      FROM clinics c
      LEFT JOIN barangays b ON b.id = c.barangay_id
      LEFT JOIN municipalities m ON m.id = c.municipality_id
      LEFT JOIN provinces p ON p.id = c.province_id
      WHERE c.status = 'approved'
        AND c.account_status = 'active'
        AND (c.latitude IS NULL OR c.longitude IS NULL)
    `);

    if (clinics.length === 0) {
      console.log("No clinics need geocoding.");
      return;
    }

    console.log(`Found ${clinics.length} clinic(s) to geocode.`);

    for (const clinic of clinics) {
      try {
        const primaryQuery = buildPrimaryQuery(clinic);
        console.log(`Geocoding clinic #${clinic.id}: ${primaryQuery}`);

        let coords = await geocode(primaryQuery);
        await sleep(1100);

        if (!coords) {
          const fallbackQuery = buildFallbackQuery(clinic);
          console.log(`Fallback clinic #${clinic.id}: ${fallbackQuery}`);

          coords = await geocode(fallbackQuery);
          await sleep(1100);
        }

        if (!coords) {
          console.log(`No result for clinic #${clinic.id}`);
          continue;
        }

        await pool.query(
          `
          UPDATE clinics
          SET latitude = ?, longitude = ?
          WHERE id = ?
          `,
          [coords.latitude, coords.longitude, clinic.id]
        );

        console.log(
          `Updated clinic #${clinic.id}: ${coords.latitude}, ${coords.longitude}`
        );
      } catch (error) {
        console.error(`Failed clinic #${clinic.id}: ${error.message}`);
      }
    }

    console.log("Geocoding finished.");
  } catch (error) {
    console.error("Script failed:", error);
  } finally {
    await pool.end();
  }
}

main();