import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const violations = [];
const MAX_SOURCE_LINES = 1800;

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
    violations.push(`${path.relative(process.cwd(), file)}:${line} ${message}`);
  }
}

for (const file of await collectFiles(sourceRoot)) {
  const source = await readFile(file, "utf8");
  const relativeFile = path.relative(process.cwd(), file);
  const lineCount = source.split(/\r?\n/).length;

  if (lineCount > MAX_SOURCE_LINES) {
    violations.push(
      `${relativeFile}:1 Module has ${lineCount} lines; split it before adding more behavior`,
    );
  }

  addMatches(file, source, /@ts-(?:ignore|nocheck)/g, "Do not bypass TypeScript checks");
  addMatches(file, source, /\bas any\b/g, "Use a validated type guard instead of 'as any'");
  addMatches(file, source, /eslint-disable/g, "Fix or narrowly configure lint rules instead of suppressing them inline");
  addMatches(file, source, /console\.(?:log|debug)\s*\(/g, "Remove debug logging");
  addMatches(file, source, /(?<!Number\.)\bparseInt\s*\(/g, "Use shared integer parsing or Number.parseInt with an explicit radix");
  addMatches(file, source, /\b[A-Za-z_$][\w$]*!(?=[.\[])/g, "Use explicit null narrowing instead of a non-null assertion");
  addMatches(file, source, /Number\(\s*formData\.get\(/g, "Use readInteger or readPositiveInteger for form identifiers");
  addMatches(file, source, /formData\.get\([^\n]+\)\s+as\s+string/g, "Use readFormText for form input");

  if (!relativeFile.endsWith(path.join("src", "lib", "env.ts"))) {
    addMatches(
      file,
      source,
      /process\.env\.(?!NODE_ENV\b)[A-Z0-9_]+/g,
      "Read configuration through src/lib/env.ts",
    );
  }

  if (!relativeFile.includes(`${path.sep}lib${path.sep}`)) {
    addMatches(
      file,
      source,
      /function\s+(?:normalizeSearchValue|toLatinDigits|getUserDisplayName|getPlainTextSnippet|hasRichTextContent)\s*\(/g,
      "Use the canonical shared text helper",
    );
  }
}

for (const boundary of ["src/app/error.tsx", "src/app/global-error.tsx"]) {
  try {
    await access(path.resolve(boundary));
  } catch {
    violations.push(`${boundary}:1 Required application error boundary is missing`);
  }
}

if (violations.length > 0) {
  console.error("Code quality check failed:\n");
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Code quality check passed.");
}
