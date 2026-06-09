import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

async function main() {
  const dbPath = path.join(process.cwd(), "data", "progress.db");
  const migrationsDir = path.join(process.cwd(), "prisma", "progress", "migrations");

  const client = createClient({ url: `file:${dbPath}` });

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files to apply.");
    return;
  }

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    const sql = readFileSync(fullPath, "utf-8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    console.log(`✓ applied ${file}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
