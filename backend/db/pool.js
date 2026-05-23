const pg = require("pg");
require("dotenv").config();

const { Pool } = pg;

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const normalizeSql = (sql) =>
  String(sql)
    .replace(/\bDATABASE\(\)/gi, "current_database()")
    .replace(/TABLE_SCHEMA\s*=\s*current_database\(\)/gi, "table_schema = current_schema()")
    // MySQL date functions → PostgreSQL equivalents
    .replace(/\bCURDATE\(\)/gi, "CURRENT_DATE")
    .replace(/\bNOW\(\)/gi, "NOW()")
    .replace(/\bDATE_FORMAT\s*\(\s*([^,]+),\s*'%Y-%m-%d'\s*\)/gi, "TO_CHAR($1, 'YYYY-MM-DD')")
    .replace(/\bDATE_FORMAT\s*\(\s*([^,]+),\s*'%Y-%m-01'\s*\)/gi, "DATE_TRUNC('month', $1)")
    .replace(/\bDATE_FORMAT\s*\(\s*([^,]+),\s*'%Y-%m'\s*\)/gi, "TO_CHAR($1, 'YYYY-MM')")
    .replace(/\bDATE_ADD\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)/gi, "($1 + INTERVAL '$2 $3')")
    .replace(/\bDATE_SUB\s*\(\s*([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)/gi, "($1 - INTERVAL '$2 $3')")
    // TIME_FORMAT(col, '%H:%i') → TO_CHAR(col, 'HH24:MI')
    .replace(/\bTIME_FORMAT\s*\(\s*([^,]+?)\s*,\s*'%H:%i'\s*\)/gi, "TO_CHAR($1, 'HH24:MI')")
    // GROUP_CONCAT(col SEPARATOR 'x') → STRING_AGG(col, 'x')
    .replace(/\bGROUP_CONCAT\s*\(\s*([\s\S]*?)\s+SEPARATOR\s+'([^']+)'\s*\)/gi, "STRING_AGG($1, '$2')")
    // SUM(DATE(col) = CURDATE()) → SUM(CASE WHEN col::date = CURRENT_DATE THEN 1 ELSE 0 END)
    .replace(/\bSUM\s*\(\s*DATE\s*\(\s*(\w+)\s*\)\s*=\s*CURRENT_DATE\s*\)/gi,
      "SUM(CASE WHEN $1::date = CURRENT_DATE THEN 1 ELSE 0 END)")
    // SUM(col = 'value') → SUM(CASE WHEN col = 'value' THEN 1 ELSE 0 END)
    .replace(/\bSUM\s*\(\s*(\w+(?:\.\w+)?)\s*=\s*'([^']*)'\s*\)/gi,
      "SUM(CASE WHEN $1 = '$2' THEN 1 ELSE 0 END)")
    // SUM(col IN ('a','b',...)) → SUM(CASE WHEN col IN ('a','b',...) THEN 1 ELSE 0 END)
    .replace(/\bSUM\s*\(\s*(\w+(?:\.\w+)?)\s+IN\s*\(([^)]+)\)\s*\)/gi,
      "SUM(CASE WHEN $1 IN ($2) THEN 1 ELSE 0 END)");

const convertPlaceholders = (sql, params = []) => {
  let index = 0;
  const values = [];

  const text = normalizeSql(sql).replace(/\?/g, () => {
    const value = params[index++];

    if (Array.isArray(value)) {
      if (value.length === 0) return "NULL";
      const placeholders = value.map((item) => {
        values.push(item);
        return `$${values.length}`;
      });
      return placeholders.join(", ");
    }

    values.push(value);
    return `$${values.length}`;
  });

  return { text, values };
};

const toMysqlStyleResult = (result) => {
  const meta = {
    affectedRows: result.rowCount || 0,
    changedRows: result.rowCount || 0,
    rowCount: result.rowCount || 0,
    rows: result.rows,
  };

  const firstRow = result.rows?.[0];
  if (firstRow) {
    meta.insertId = firstRow.id ?? firstRow.insertId ?? firstRow.insert_id ?? 0;
  }

  const rowsCommand = ["SELECT", "SHOW"].includes(String(result.command || "").toUpperCase());
  return [rowsCommand ? result.rows : meta, meta];
};

const runQuery = async (runner, sql, params = []) => {
  const { text, values } = convertPlaceholders(sql, params);
  const result = await runner.query(text, values);
  return toMysqlStyleResult(result);
};

const withCallback = (promise, callback) => {
  if (typeof callback !== "function") return promise;

  promise
    .then(([rows, meta]) => callback(null, rows, meta))
    .catch((error) => callback(error));

  return undefined;
};

const createConnection = (client) => ({
  query(sql, params = [], callback) {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }

    return withCallback(runQuery(client, sql, params), callback);
  },
  execute(sql, params = [], callback) {
    return this.query(sql, params, callback);
  },
  beginTransaction() {
    return client.query("BEGIN");
  },
  commit() {
    return client.query("COMMIT");
  },
  rollback() {
    return client.query("ROLLBACK");
  },
  release() {
    client.release();
  },
});

module.exports = {
  query(sql, params = [], callback) {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }

    return withCallback(runQuery(pgPool, sql, params), callback);
  },
  execute(sql, params = [], callback) {
    return this.query(sql, params, callback);
  },
  async getConnection() {
    const client = await pgPool.connect();
    return createConnection(client);
  },
  end() {
    return pgPool.end();
  },
  connect() {
    return pgPool.connect();
  },
  raw: pgPool,
};
