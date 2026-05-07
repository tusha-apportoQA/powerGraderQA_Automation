/**
 * inject-case-report-to-allure.js
 *
 * Reads case-config-report.json and writes one Allure-compatible
 * *-result.json file per (caseId × config) outcome into allure-results/.
 * Also copies the full JSON as an attachment so the dashboard can show it.
 *
 * Run AFTER tests finish, BEFORE `allure generate`.
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── paths (override via CLI args) ──────────────────────────────────────────
const REPORT_FILE  = process.argv[2] || './case-config-report.json';
const RESULTS_DIR  = process.argv[3] || './allure-results';

// ── helpers ────────────────────────────────────────────────────────────────
function uid() {
  return crypto.randomBytes(16).toString('hex');
}

function statusToAllure(status) {
  switch (status) {
    case 'passed':      return 'passed';
    case 'not_reached': return 'skipped';
    default:            return 'failed';   // failed / partially_passed row-level
  }
}

function nowMs() {
  return Date.now();
}

// ── main ───────────────────────────────────────────────────────────────────
if (!fs.existsSync(REPORT_FILE)) {
  console.warn(`[inject-case-report] File not found: ${REPORT_FILE} — skipping.`);
  process.exit(0);
}

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
let written = 0;

for (const c of report.cases || []) {
  const { caseId, caseName, passedConfigs = [], failedConfigs = [] } = c;

  // Build a combined list of outcomes: one entry per config
  const outcomes = [];

  for (const cfg of passedConfigs) {
    outcomes.push({ config: cfg, status: 'passed', failure: null });
  }

  for (const f of failedConfigs) {
    if (!f) continue;
    outcomes.push({
      config:  f.config  || 'unknown-config',
      status:  f.status  || 'failed',
      failure: f,
    });
  }

  // If a case has zero outcomes (edge case) write one synthetic row
  if (outcomes.length === 0) {
    outcomes.push({ config: 'unknown-config', status: c.status || 'failed', failure: null });
  }

  for (const outcome of outcomes) {
    const allureStatus = statusToAllure(outcome.status);
    const ts = nowMs();

    // labels
    const labels = [
      { name: 'suite',      value: 'Case Config Summary' },
      { name: 'subSuite',   value: caseId },
     // { name: 'testType',   value: 'caseConfigSummary' },
      { name: 'testCaseId', value: `${caseId}${caseName ? ':' + caseName : ''}` },
      { name: 'caseConfig', value: outcome.config },
      { name: 'lms',        value: outcome.config.split('|')[0] || 'unknown' },
    ];

    // status details for failures
    let statusDetails = {};
    if (outcome.failure) {
      statusDetails = {
        message: outcome.failure.error     || 'Test did not pass',
        trace:   outcome.failure.failedStep
                   ? `Failed step: ${outcome.failure.failedStep}`
                   : '',
      };
    }

    const result = {
      uuid:      uid(),
      historyId: `${caseId}::${outcome.config}`,
      testCaseId: `${caseId}::${outcome.config}`,
      fullName:  `${caseId} | ${outcome.config}`,
      name:      `${caseId}${caseName ? ' – ' + caseName : ''} [${outcome.config}]`,
      status:    allureStatus,
      stage:     'finished',
      start:     ts - 100,
      stop:      ts,
      labels,
      statusDetails,
      parameters: [
        { name: 'caseId',   value: caseId },
        { name: 'config',   value: outcome.config },
        { name: 'outcome',  value: outcome.status },
      ],
      links: [],
      attachments: [],
      steps: [],
    };

    const outFile = path.join(RESULTS_DIR, `${uid()}-case-summary-result.json`);
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
    written++;
  }
}

// ── also copy the raw JSON as a named attachment ───────────────────────────
/*const attachmentName = 'case-config-report.json';
const attachmentDest = path.join(RESULTS_DIR, attachmentName);
fs.copyFileSync(REPORT_FILE, attachmentDest);*/
/*const attachmentUid = uid();
const attachmentName = `${attachmentUid}-case-config-report.json`;
const attachmentDest = path.join(RESULTS_DIR, attachmentName);
fs.copyFileSync(REPORT_FILE, attachmentDest);*/

// write the allure attachment descriptor so it shows in the report
/*const attachmentMeta = {
  uuid:   uid(),
  name:   'Case Config Summary (full JSON)',
  status: 'passed',
  stage:  'finished',
  start:  nowMs() - 10,
  stop:   nowMs(),
  fullName: 'Case Config Summary Attachment',
  labels: [{ name: 'suite', value: 'Case Config Summary' }],
  attachments: [{
    name:   'case-config-report.json',
    source: attachmentName,
    type:   'application/json',
  }],
  steps: [],
  links: [],
  parameters: [],
  statusDetails: {},
};*/
/*fs.writeFileSync(
  path.join(RESULTS_DIR, `${uid()}-case-summary-attachment-result.json`),
  JSON.stringify(attachmentMeta, null, 2)
);*/

//console.log(`[inject-case-report] Done. Written ${written} result(s) + 1 attachment to ${RESULTS_DIR}`);
console.log(`[inject-case-report] Done. Written ${written} result(s) to ${RESULTS_DIR}`);