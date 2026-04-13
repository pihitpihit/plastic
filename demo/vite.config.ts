import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/plastic/" : "/",
  resolve: {
    alias: {
      plastic: resolve(__dirname, "../src/index.ts"),
    },
  },
}));
