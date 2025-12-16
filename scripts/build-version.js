#!/usr/bin/env node

import { execSync } from "child_process";
import { parseArgs } from "util";
import { readFileSync } from "fs";
import ALL_VERSIONS from "./versions.json" with { type: "json" };

const REACT_PACKAGES = ["react", "react-dom", "react-server-dom-webpack"];

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

function getLatestVersion() {
  const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
  return pkg.dependencies.react;
}

function installReactVersion(version) {
  const packages = REACT_PACKAGES.map((p) => `${p}@${version}`).join(" ");
  run(`npm install ${packages} --no-save`);
}

function buildForVersion(version, outDir) {
  console.log(`\n========================================`);
  console.log(
    `Building React ${version} (dev + prod) → ${outDir || `dist/${version}`}`,
  );
  console.log(`========================================`);

  installReactVersion(version);

  const dir = outDir || `dist/${version}`;
  // Base path for assets (e.g., /19.1.0/ or / for root)
  const basePath = outDir === "dist" ? "/" : `/${version}/`;
  const devBasePath = outDir === "dist" ? "/dev/" : `/${version}/dev/`;

  // Production build
  console.log(`\n--- Production build ---`);
  run(`npm run build -- --outDir=${dir} --base=${basePath}`);

  // Development build (unminified, development mode)
  console.log(`\n--- Development build ---`);
  run(
    `npm run build -- --outDir=${dir}/dev --base=${devBasePath} --mode=development --minify=false`,
  );
}

function restorePackages() {
  console.log(`\n========================================`);
  console.log(`Restoring original packages`);
  console.log(`========================================`);
  run("npm install");
}

// Parse arguments
const { values } = parseArgs({
  options: {
    version: { type: "string", short: "v" },
    all: { type: "boolean", short: "a" },
  },
  allowPositionals: true,
});

try {
  if (values.all) {
    // Build latest (from package.json) to dist/ root first (cleans dist/)
    const latest = getLatestVersion();
    buildForVersion(latest, "dist");
    // Then build all versions to dist/{version}/ (each cleans only its own dir)
    for (const version of ALL_VERSIONS) {
      buildForVersion(version);
    }
  } else if (values.version) {
    // Build single version
    buildForVersion(values.version);
  } else {
    console.error("Usage:");
    console.error("  node scripts/build-version.js --version=19.2.0");
    console.error("  node scripts/build-version.js --all");
    process.exit(1);
  }

  restorePackages();
  console.log("\nDone!");
} catch (err) {
  console.error("\nBuild failed:", err.message);
  // Still try to restore packages on failure
  try {
    restorePackages();
  } catch {}
  process.exit(1);
}
