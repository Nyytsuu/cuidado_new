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
    .replace(/TABLE_SCHEMA\s*=\s*current_database\(\)/gi, "table_schema = current_schema()");

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
