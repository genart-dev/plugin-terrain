#!/usr/bin/env node
/**
 * Renders all .genart example files to .png thumbnails.
 * Usage: node render-examples.cjs
 *
 * Prerequisite: generate-genart-files.cjs must have been run first.
 * Uses genart CLI to render each sketch to a 600×600 PNG.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const examplesDir = path.join(root, "examples");

// Recursively find all .genart files
function findGenartFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findGenartFiles(full));
    } else if (entry.name.endsWith(".genart")) {
      results.push(full);
    }
  }
  return results;
}

const files = findGenartFiles(examplesDir).sort();

console.log(`Found ${files.length} .genart files to render.\n`);

let success = 0;
let failed = 0;

for (const absFile of files) {
  const outFile = absFile.replace(/\.genart$/, ".png");
  const label = path.relative(examplesDir, absFile);

  process.stdout.write(`  ${label} ... `);

  try {
    execSync(
      `${process.env.GENART_CLI || "npx @genart-dev/cli"} render "${absFile}" -o "${outFile}" --width 600 --height 600`,
      { stdio: "pipe", timeout: 30_000 }
    );
    console.log("OK");
    success++;
  } catch (err) {
    console.log("FAILED");
    if (err.stderr) {
      console.error(`    ${err.stderr.toString().trim()}`);
    }
    failed++;
  }
}

console.log(`\nDone: ${success} succeeded, ${failed} failed (of ${files.length} total)`);
process.exit(failed > 0 ? 1 : 0);
