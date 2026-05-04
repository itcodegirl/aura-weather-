// Discovers every *.render.test.mjs file under src/ and hands them to
// `node --test`. Replaces the shell-glob `node --test 'src/**/*.render.test.mjs'`
// approach because npm scripts run under POSIX `sh` on Linux runners
// (and on most CI), where `**` is not expanded — Node then treats the
// literal path as a missing file and exits non-zero. This script does
// the discovery in JavaScript so the behaviour does not depend on the
// shell or the Node version's glob support.
//
// Exits 0 with a friendly message when no render tests exist (so a
// freshly-cloned repo does not break CI before any render test ships).
// Otherwise exits with whatever status `node --test` returned.

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_SUFFIX = ".render.test.mjs";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SEARCH_DIR = join(ROOT, "src");

async function findRenderTests(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return found;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findRenderTests(full)));
    } else if (entry.isFile() && entry.name.endsWith(TEST_SUFFIX)) {
      found.push(full);
    }
  }

  return found;
}

const files = (await findRenderTests(SEARCH_DIR)).sort();

if (files.length === 0) {
  console.log(`No ${TEST_SUFFIX} files found under src/. Skipping render tests.`);
  process.exit(0);
}

console.log(`Running ${files.length} render test file(s):`);
for (const file of files) {
  console.log(`  - ${relative(ROOT, file)}`);
}

const child = spawn(process.execPath, ["--test", ...files], {
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
