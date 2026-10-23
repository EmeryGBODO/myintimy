import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    // Les parcours Playwright sont exécutés séparément par `npm run test:e2e`.
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
