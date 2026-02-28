import { defineConfig } from "drizzle-kit";
import fs from "fs";
import os from "os";
import path from "path";

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function readDbUrl(): string {
  const raw = fs.readFileSync(getConfigFilePath(), "utf-8");
  const parsed = JSON.parse(raw) as { db_url?: unknown };

  if (typeof parsed.db_url !== "string" || parsed.db_url.length === 0) {
    throw new Error('Missing "db_url" in ~/.gatorconfig.json');
  }
  return parsed.db_url;
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: readDbUrl(),
  },
});