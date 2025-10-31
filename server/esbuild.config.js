import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sharedPath = path.resolve(__dirname, "../shared");
const sharedSchemaPath = path.join(sharedPath, "schema.ts");
const sharedConstantsPath = path.join(sharedPath, "constants.ts");
const sharedFeatureFlagsPath = path.join(sharedPath, "feature-flags.ts");

// Plugin to resolve shared directory imports
const resolveSharedPlugin = {
  name: "resolve-shared",
  setup(build) {
    // Match patterns like "../shared/schema", "../../shared/schema", etc.
    build.onResolve({ filter: /^(\.\.\/)+shared\/schema(\.js)?$/ }, () => {
      return { path: sharedSchemaPath, external: false };
    });
    // Match @shared/schema
    build.onResolve({ filter: /^@shared\/schema$/ }, () => {
      return { path: sharedSchemaPath, external: false };
    });
    // Match patterns like "../shared/constants", "../../shared/constants", etc.
    build.onResolve({ filter: /^(\.\.\/)+shared\/constants(\.js)?$/ }, () => {
      return { path: sharedConstantsPath, external: false };
    });
    build.onResolve({ filter: /^@shared\/constants$/ }, () => {
      return { path: sharedConstantsPath, external: false };
    });
    // Match patterns like "../shared/feature-flags", "../../shared/feature-flags", etc.
    build.onResolve({ filter: /^(\.\.\/)+shared\/feature-flags(\.js)?$/ }, () => {
      return { path: sharedFeatureFlagsPath, external: false };
    });
    build.onResolve({ filter: /^@shared\/feature-flags$/ }, () => {
      return { path: sharedFeatureFlagsPath, external: false };
    });
  },
};

esbuild
  .build({
    entryPoints: ["index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: "dist",
    packages: "external",
    resolveExtensions: [".ts", ".js"],
    plugins: [resolveSharedPlugin],
    logLevel: "info",
  })
  .then(() => {
    // Copy shared directory to dist for runtime access
    const distSharedPath = path.resolve(__dirname, "dist/shared");
    if (!existsSync(distSharedPath)) {
      mkdirSync(distSharedPath, { recursive: true });
    }
    // Note: We're bundling, so this might not be needed, but keeping for safety
    console.log("✅ Build complete");
  })
  .catch((error) => {
    console.error("❌ Build failed:", error);
    process.exit(1);
  });
