import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sharedPath = path.resolve(__dirname, "shared");

// Plugin to resolve @shared alias to ./shared directory
const resolveSharedPlugin = {
  name: "resolve-shared",
  setup(build) {
    // Resolve @shared/* imports to ./shared/*
    build.onResolve({ filter: /^@shared\// }, (args) => {
      const relativePath = args.path.replace(/^@shared\//, "");
      const resolvedPath = path.join(sharedPath, relativePath);
      return { 
        path: resolvedPath.endsWith('.ts') || resolvedPath.endsWith('.js') 
          ? resolvedPath 
          : `${resolvedPath}.ts`,
        external: false 
      };
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
    console.log("✅ Build complete");
  })
  .catch((error) => {
    console.error("❌ Build failed:", error);
    process.exit(1);
  });
