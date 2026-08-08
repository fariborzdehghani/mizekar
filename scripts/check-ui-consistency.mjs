import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const violations = [];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(target);
      return /\.(?:ts|tsx)$/.test(entry.name) ? [target] : [];
    }),
  );
  return nested.flat();
}

function addMatches(file, source, expression, message) {
  for (const match of source.matchAll(expression)) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    violations.push(`${path.relative(process.cwd(), file)}:${line} ${message}: ${match[0]}`);
  }
}

for (const file of await collectFiles(sourceRoot)) {
  const source = await readFile(file, "utf8");

  addMatches(
    file,
    source,
    /rounded-\[(?:\d+(?:\.\d+)?px)\]/g,
    "Use rounded-control, rounded-control-lg, rounded-card, or rounded-panel",
  );
  addMatches(
    file,
    source,
    /liquid-page-header[^"'`\n]*(?:top-\[|\bsticky\b|\bz-\d)/g,
    "Page headers inherit the shared sticky position and z-index",
  );

  if (!file.endsWith(path.join("dashboard", "page.tsx"))) {
    addMatches(
      file,
      source,
      /bg-blue-(?:600|700)|bg-blue-light-(?:600|700)/g,
      "Use brand colors for actions; blue is reserved for data visualization",
    );
  }
}

if (violations.length > 0) {
  console.error("UI consistency check failed:\n");
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("UI consistency check passed.");
}
