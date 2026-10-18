import { spawnSync } from "node:child_process";
import { adminEmail, adminPassword, assertSafeDatabase, backendDir, databaseUrl, pythonExecutable } from "./env.mjs";

export default async function globalSetup() {
  assertSafeDatabase();
  const python = pythonExecutable();
  const args = [
    "-m",
    "app.scripts.verify_fresh_install",
    "--database-url",
    databaseUrl,
    "--admin-email",
    adminEmail,
    "--admin-password",
    adminPassword,
  ];

  console.log(`[E2E] Préparation d'une base dédiée avec ${python}`);
  const result = spawnSync(python, args, {
    cwd: backendDir,
    env: process.env,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`La préparation E2E a échoué avec le code ${result.status}.`);
  }
}
