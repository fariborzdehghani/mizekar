# Mizekar Code Quality Contract

## Boundaries

- Database, filesystem, authentication, AI provider, and secret-bearing modules must remain server-only.
- Server Actions and Route Handlers are public entry points. Authenticate within each entry point and validate every argument received from forms, JSON, query strings, or route parameters.
- Pass minimal DTOs to Client Components. Do not pass complete Prisma records when the UI needs only selected fields.
- Expected errors are returned as typed result values. Unexpected errors are logged on the server and replaced with a safe public message.

## Shared foundations

- `src/lib/input.ts`: form, integer, JSON object, and JSON array parsing.
- `src/lib/selection.ts`: structural validation for person and user selections.
- `src/lib/env.ts`: environment parsing and production secret requirements.
- `src/lib/errors.ts`: public errors and consistent unexpected-error reporting.
- `src/lib/ndjson.ts`: shared newline-delimited JSON streaming responses.
- `src/lib/richText.ts`, `src/lib/text.ts`, and `src/lib/userDisplay.ts`: canonical text and display helpers.

## Implementation rules

- Prefer `unknown` plus a type guard at external boundaries; do not use `any` or unchecked JSON casts.
- Prefer `Number.isSafeInteger` through the shared input helpers for identifiers.
- Use `crypto.randomUUID()` for stored-file names.
- Do not swallow unexpected failures. Either recover intentionally or log with operational context.
- Avoid non-null assertions when control-flow narrowing or an explicit guard can prove the value.
- Split a module when unrelated workflows make it difficult to test or review. Existing large action modules should be decomposed by feature without changing their exported action API.

## Verification

`npm run verify` is the merge gate. It runs UI and code-quality guards, unit tests, ESLint, TypeScript, and the production build.

When adding a reusable pure helper, add a focused test under `tests/`. Async Server Components and authenticated user flows should be covered with end-to-end tests when browser infrastructure is available.
