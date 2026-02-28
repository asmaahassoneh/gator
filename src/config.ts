import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function writeConfig(cfg: Config): void {
  const filePath = getConfigFilePath();

  const rawToSave = {
    db_url: cfg.dbUrl,
    ...(cfg.currentUserName ? { current_user_name: cfg.currentUserName } : {}),
  };

  fs.writeFileSync(filePath, JSON.stringify(rawToSave, null, 2), "utf-8");
}

function validateConfig(rawConfig: any): Config {
  if (!rawConfig || typeof rawConfig !== "object") {
    throw new Error("Config must be a JSON object");
  }

  if (typeof rawConfig.db_url !== "string" || rawConfig.db_url.length === 0) {
    throw new Error('Config must include a non-empty "db_url" string');
  }

  if (
    rawConfig.current_user_name !== undefined &&
    typeof rawConfig.current_user_name !== "string"
  ) {
    throw new Error('"current_user_name" must be a string if provided');
  }

  return {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name,
  };
}

function ensureConfigFileExists(): void {
  const filePath = getConfigFilePath();
  if (fs.existsSync(filePath)) return;

  fs.writeFileSync(
    filePath,
    JSON.stringify({ db_url: "postgres://example" }, null, 2),
    "utf-8"
  );
}

export function readConfig(): Config {
  ensureConfigFileExists();
  const filePath = getConfigFilePath();

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  return validateConfig(parsed);
}

export function setUser(userName: string): void {
  const cfg = readConfig();
  writeConfig({ ...cfg, currentUserName: userName });
}