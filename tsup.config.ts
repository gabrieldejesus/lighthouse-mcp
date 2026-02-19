import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  sourcemap: true,
  format: ["esm"],
  target: "node18",
  entry: ["src/index.ts"],
});
