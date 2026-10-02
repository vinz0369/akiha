import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const sqlPath = process.argv[2];

if (!sqlPath) {
  console.error("Usage: node tests/database/run-sql.mjs <file.sql>");
  process.exit(2);
}

const sql = await readFile(sqlPath, "utf8");
const child = spawn(
  "docker",
  [
    "exec",
    "-i",
    "supabase_db_akiha",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);

child.stdin.end(sql);
child.on("exit", (code) => process.exit(code ?? 1));

