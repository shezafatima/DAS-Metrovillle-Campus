#!/usr/bin/env bash
# Loads .env.local (via @next/env, same loader Next.js and
# e2e/global-setup.ts use) into the shell as properly quoted `export`
# statements and forces the test database name, then execs the given
# command. Needed because Vitest does not auto-load .env.local, and
# `source .env.local` directly breaks on unescaped `&` in MONGODB_URI's
# query string (bash treats it as a background-job separator) — see
# specs/002-foundation/quickstart.md "npm test — Vitest: DB tests need
# MONGODB_URI, else skipped with a notice."
set -a
eval "$(node -e '
const before = new Set(Object.keys(process.env)); // pre-existing (already-exported) keys
const { loadEnvConfig } = require("@next/env");
const { combinedEnv } = loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
for (const [k, v] of Object.entries(combinedEnv)) {
  if (before.has(k)) continue; // keep already-exported values (e.g. our own overrides)
  // Single-quote for POSIX-safe shell literal (no $ / backtick expansion);
  // escape any embedded single quote the usual close-escape-reopen way.
  const shellSafe = "\x27" + String(v).replace(/\x27/g, "\x27\\\x27\x27") + "\x27";
  process.stdout.write(`export ${k}=${shellSafe}\n`);
}
')"
set +a
export MONGODB_DB_NAME=dar_e_arqam_test
exec "$@"
