/**
 * Lists the tests that failed first and passed on a retry ("flaky") in the GitHub job summary and as
 * warnings, so Playwright's retries (2 in CI) cannot hide them. Reads the JSON report written by
 * playwright.config.ts. Usage: `node scripts/ci-flaky-summary.mjs <job name>`. Never fails the job.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const label = process.argv[2] ?? "playwright";
const reportPath = "playwright-json/results.json";
if (!existsSync(reportPath)) {
  console.log(`No ${reportPath}; nothing to summarise.`);
  process.exit(0);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const flaky = [];
const failed = [];

function visit(suite, titles) {
  const here = suite.title && !suite.file ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const name = `${spec.file}:${spec.line} › ${[...here, spec.title].join(" › ")} [${test.projectName}]`;
      if (test.status === "flaky") flaky.push({ name, retries: test.results.length - 1 });
      if (test.status === "unexpected") failed.push(name);
    }
  }
  for (const child of suite.suites ?? []) visit(child, here);
}
for (const suite of report.suites ?? []) visit(suite, []);

const lines = [
  `### Playwright (${label})`,
  "",
  `${report.stats?.expected ?? 0} passed, ${report.stats?.unexpected ?? 0} failed, ${report.stats?.flaky ?? 0} flaky, ${report.stats?.skipped ?? 0} skipped`,
  "",
];
if (flaky.length > 0) {
  lines.push("**Flaky (failed, then passed on retry):**", "", ...flaky.map((test) => `- ${test.name} (${test.retries} retr${test.retries === 1 ? "y" : "ies"})`), "");
  for (const test of flaky) console.log(`::warning title=Flaky test (${label})::${test.name}`);
}
if (failed.length > 0) lines.push("**Failed:**", "", ...failed.map((name) => `- ${name}`), "");

console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
