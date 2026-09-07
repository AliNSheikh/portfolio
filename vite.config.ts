import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import project from "./project.config.json" with { type: "json" };

export default defineConfig({
  base: project.basePath,
  plugins: [react()],
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        site: resolve("index.html"),
        admin: resolve("admin/index.html"),
      },
    },
  },
});
