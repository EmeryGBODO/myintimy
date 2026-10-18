import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const frontendDir = path.resolve(here, "..");
export const backendDir = path.resolve(
  process.env.MYINTIMY_E2E_BACKEND_DIR || path.join(frontendDir, "..", "backend"),
);

export const databaseUrl = process.env.MYINTIMY_E2E_DATABASE_URL || "";
export const adminEmail = process.env.MYINTIMY_E2E_ADMIN_EMAIL || "e2e-admin@myintimy.local";
export const adminPassword = process.env.MYINTIMY_E2E_ADMIN_PASSWORD || "E2E-only-Admin-42!";
export const apiBaseUrl = process.env.MYINTIMY_E2E_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
export const frontendBaseUrl = process.env.MYINTIMY_E2E_FRONTEND_URL || "http://127.0.0.1:4173";

function firstExisting(paths) {
  return paths.find((candidate) => candidate && fs.existsSync(candidate));
}

export function pythonExecutable() {
  if (process.env.MYINTIMY_E2E_PYTHON) return process.env.MYINTIMY_E2E_PYTHON;

  const virtualEnv = process.env.VIRTUAL_ENV;
  const candidate = firstExisting([
    virtualEnv && path.join(virtualEnv, process.platform === "win32" ? "Scripts/python.exe" : "bin/python"),
    path.join(backendDir, ".venv", "Scripts", "python.exe"),
    path.join(backendDir, ".venv", "bin", "python"),
  ]);
  return candidate || (process.platform === "win32" ? "python.exe" : "python");
}

export function assertSafeDatabase() {
  if (!databaseUrl) {
    throw new Error(
      "MYINTIMY_E2E_DATABASE_URL est obligatoire. Utilise une base PostgreSQL dédiée dont le nom contient test, qa ou fresh.",
    );
  }
  const lower = databaseUrl.toLowerCase();
  if (!["test", "qa", "fresh"].some((marker) => lower.includes(marker))) {
    throw new Error("La base E2E doit contenir test, qa ou fresh dans son nom.");
  }
}

export function backendEnvironment() {
  assertSafeDatabase();
  return {
    ...process.env,
    APP_ENV: "test",
    DEBUG: "false",
    DATABASE_URL: databaseUrl,
    FRONTEND_ORIGINS: frontendBaseUrl,
    JWT_SECRET: "e2e-test-secret-that-must-never-be-used-in-production",
    KKIAPAY_PUBLIC_KEY: "",
    KKIAPAY_PRIVATE_KEY: "",
    KKIAPAY_SECRET_KEY: "",
    KKIAPAY_WEBHOOK_SECRET: "",
    KKIAPAY_SANDBOX: "true",
  };
}
