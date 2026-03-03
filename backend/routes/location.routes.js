const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Cuidado_2026-cp1!",
  database: "cuidado_medihelp",
});

router.get("/provinces", (req, res) => {
  db.query(
    "SELECT id, province_name FROM provinces ORDER BY province_name",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.get("/municipalities/:provinceId", (req, res) => {
  db.query(
    "SELECT id, province_id, name FROM municipalities WHERE province_id = ? ORDER BY name",
    [req.params.provinceId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.get("/barangays/:municipalityId", (req, res) => {
  db.query(
    "SELECT id, municipality_id, name FROM barangays WHERE municipality_id = ? ORDER BY name",
    [req.params.municipalityId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;