import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["lib/index.ts"],
  format: ["esm", "cjs"],
  outDir: "dist",
  splitting: false,
  clean: true,
  dts: true,
  external: ["cloudflare:workers"],
});
