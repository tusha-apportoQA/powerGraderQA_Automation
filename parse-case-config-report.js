const fs = require('fs');
const path = require('path');

function getResultFiles(resultsDir) {
  if (!fs.existsSync(resultsDir)) return [];
  return fs
    .readdirSync(resultsDir)
    .filter((f) => f.endsWith('-result.json'))
    .map((f) => path.join(resultsDir, f));
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function collectNamedValues(result, targetName) {
  const values = [];

  const pushIfMatch = (name, value) => {
    if (name === targetName && value !== undefined && value !== null) {
      values.push(String(value));
    }
  };

  const labels = Array.isArray(result?.labels) ? result.labels : [];
  for (const item of labels) {
    pushIfMatch(item?.name, item?.value);
  }

  const parameters = Array.isArray(result?.parameters) ? result.parameters : [];
  for (const item of parameters) {
    pushIfMatch(item?.name, item?.value);
  }

  const annotations = Array.isArray(result?.extra?.annotations) ? result.extra.annotations : [];
  for (const item of annotations) {
    pushIfMatch(item?.type, item?.description);
  }

  return values;
}

function parseCaseLabel(testCaseLabel) {
  const [id, ...nameParts] = String(testCaseLabel).split(':');
  return {
    id: id?.trim(),
    name: nameParts.join(':').trim() || null,
  };
}

function parseCaseStatus(statusLabel) {
  const [id, status] = String(statusLabel).split(':');
  return {
    id: id?.trim(),
    status: status?.trim(),
  };
}

function buildCaseConfigReport(resultsDir = './allure-results') {
  const files = getResultFiles(resultsDir);
  const perCase = new Map();

  for (const file of files) {
    const result = readJson(file);
    if (!result) continue;

    const caseLabels = collectNamedValues(result, 'testCaseId');
    const caseStatusLabels = collectNamedValues(result, 'caseStatus');
    const caseConfigLabels = collectNamedValues(result, 'caseConfig');
    const config = caseConfigLabels[0] || 'unknown-config';

    const passedCaseIds = new Set(
      caseStatusLabels
        .map(parseCaseStatus)
        .filter((s) => s.id && s.status === 'passed')
        .map((s) => s.id)
    );

    for (const rawCaseLabel of caseLabels) {
      const parsed = parseCaseLabel(rawCaseLabel);
      if (!parsed.id) continue;

      if (!perCase.has(parsed.id)) {
        perCase.set(parsed.id, {
          caseId: parsed.id,
          caseName: parsed.name,
          passedConfigs: [],
          failedConfigs: [],
        });
      }

      const entry = perCase.get(parsed.id);
      if (!entry.caseName && parsed.name) {
        entry.caseName = parsed.name;
      }

      if (passedCaseIds.has(parsed.id)) {
        entry.passedConfigs.push(config);
      } else {
        entry.failedConfigs.push(config);
      }
    }
  }

  const summary = Array.from(perCase.values()).map((entry) => {
    const passedCount = entry.passedConfigs.length;
    const failedCount = entry.failedConfigs.length;

    let status = 'failed';
    if (passedCount > 0 && failedCount === 0) status = 'passed';
    else if (passedCount > 0 && failedCount > 0) status = 'partially_passed';

    return {
      caseId: entry.caseId,
      caseName: entry.caseName,
      status,
      passedConfigs: [...new Set(entry.passedConfigs)],
      failedConfigs: [...new Set(entry.failedConfigs)],
    };
  });

  summary.sort((a, b) => a.caseId.localeCompare(b.caseId));
  return {
    generatedAt: new Date().toISOString(),
    sourceDir: path.resolve(resultsDir),
    totalCases: summary.length,
    cases: summary,
  };
}

if (require.main === module) {
  const resultsDir = process.argv[2] || './allure-results';
  const outFile = process.argv[3] || './case-config-report.json';
  const report = buildCaseConfigReport(resultsDir);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`Case config report written: ${outFile}`);
}

module.exports = { buildCaseConfigReport };
