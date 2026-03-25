/*import fs from "node:fs";
import path from "node:path";

const BASELINE_PATH = path.resolve(
  process.cwd(),
  "e2e/test-data/baselines/powergrader-baseline.json"
);

export function baselineExists(): boolean {
  return fs.existsSync(BASELINE_PATH);
}

export function createBaseline(snapshot: unknown) {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });

  fs.writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        snapshot
      },
      null,
      2
    )
  );
}*/

import fs from "node:fs";
import path from "node:path";

/*function baselinePathFor(assignmentKey: string) {
  // make filename safe
  const safe = assignmentKey.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return path.resolve(
    process.cwd(),
    `e2e/test-data/baselines/powergrader/${safe}.json`
  );
}*/

function baselinePathFor(assignmentKey: string) {
  // 🎯 STRIP THE BRACKETS HERE TOO
  const normalizedKey = assignmentKey.replace(/\s*\[\d+\]\s*$/, "").trim();
  const safe = normalizedKey.replace(/[^a-zA-Z0-9._-]+/g, "_");
  
  return path.resolve(
    process.cwd(),
    `e2e/test-data/baselines/powergrader/${safe}.json`
  );
}

export function baselineExists(assignmentKey: string): boolean {
  return fs.existsSync(baselinePathFor(assignmentKey));
}

export function createBaseline(assignmentKey: string, snapshot: unknown) {
  const p = baselinePathFor(assignmentKey);
  fs.mkdirSync(path.dirname(p), { recursive: true });

  fs.writeFileSync(
    p,
    JSON.stringify({ createdAt: new Date().toISOString(), snapshot }, null, 2)
  );
}

export function loadBaseline(assignmentKey: string): any {
  const p = baselinePathFor(assignmentKey);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}