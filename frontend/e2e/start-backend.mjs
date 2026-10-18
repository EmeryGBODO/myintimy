import { spawn } from "node:child_process";
import { backendDir, backendEnvironment, pythonExecutable } from "./env.mjs";

const child = spawn(
  pythonExecutable(),
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--log-level", "warning"],
  {
    cwd: backendDir,
    env: backendEnvironment(),
    stdio: "inherit",
  },
);

const stop = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

child.on("error", (error) => {
  console.error("[E2E] Impossible de démarrer le backend:", error);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
