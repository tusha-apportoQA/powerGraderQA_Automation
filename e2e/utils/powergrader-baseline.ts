/*import fs from "node:fs";
import path from "node:path";

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
}*/

import fs from "node:fs";
import path from "node:path";

function baselinePathFor(assignmentKey: string, lms: string = "canvas") {
  // 🎯 STRIP THE BRACKETS
  const normalizedKey = assignmentKey.replace(/\s*\[\d+\]\s*$/, "").trim();
  const safe = normalizedKey.replace(/[^a-zA-Z0-9._-]+/g, "_");
  
  // 🎯 ADD LMS SUBFOLDER
  return path.resolve(
    process.cwd(),
    `e2e/test-data/baselines/powergrader/${lms.toLowerCase()}/${safe}.json`
  );
}

export function baselineExists(assignmentKey: string, lms: string): boolean {
  return fs.existsSync(baselinePathFor(assignmentKey, lms));
}

export function createBaseline(assignmentKey: string, snapshot: unknown, lms: string) {
  const p = baselinePathFor(assignmentKey, lms);
  fs.mkdirSync(path.dirname(p), { recursive: true });

  fs.writeFileSync(
    p,
    JSON.stringify({ createdAt: new Date().toISOString(), snapshot }, null, 2)
  );
}

export function loadBaseline(assignmentKey: string, lms: string): any {
  const p = baselinePathFor(assignmentKey, lms);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}