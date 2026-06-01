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

function cleanMessage(value) {
  if (!value) return null;
  return String(value).replace(/\s+/g, ' ').trim() || null;
}

function findFirstFailedStep(steps) {
  if (!Array.isArray(steps)) return null;
  for (const step of steps) {
    if (!step) continue;
    if (step.status === 'failed' || step.status === 'broken') {
      return step;
    }
    const nested = findFirstFailedStep(step.steps);
    if (nested) return nested;
  }
  return null;
}

function extractCaseErrorForId(result, caseId) {
  const prefix = `${caseId}:`;
  for (const raw of collectNamedValues(result, 'caseError')) {
    const text = String(raw);
    if (text.startsWith(prefix)) {
      return cleanMessage(text.slice(prefix.length));
    }
  }
  return null;
}

function findFailedStepForCaseName(steps, caseName) {
  if (!Array.isArray(steps) || !caseName) return null;
  const needle = caseName.toLowerCase();
  for (const step of steps) {
    if (!step) continue;
    const stepName = cleanMessage(step.name);
    if (
      (step.status === 'failed' || step.status === 'broken') &&
      stepName &&
      stepName.toLowerCase().includes(needle)
    ) {
      return step;
    }
    const nested = findFailedStepForCaseName(step.steps, caseName);
    if (nested) return nested;
  }
  return null;
}

function extractFailureInfo(result, filePath) {
  const statusDetails = result?.statusDetails || {};
  const failedStep = findFirstFailedStep(result?.steps);
  const tracePreview = cleanMessage(statusDetails?.trace)?.slice(0, 500);
  const error =
    cleanMessage(statusDetails?.message) ||
    cleanMessage(failedStep?.statusDetails?.message) ||
    tracePreview ||
    'No error details available';

  return {
    config: null, // assigned by caller
    error,
    failedStep: cleanMessage(failedStep?.name),
    test: cleanMessage(result?.fullName || result?.name),
    resultFile: path.basename(filePath),
  };
}

function getTestIdentity(result, filePath) {
  return (
    result?.historyId ||
    result?.testCaseId ||
    result?.fullName ||
    result?.name ||
    path.basename(filePath)
  );
}

function buildCaseConfigReport(resultsDir = './allure-results') {
  const files = getResultFiles(resultsDir);
  const perCase = new Map();
  const latestByTestAndConfig = new Map();

  for (const file of files) {
    const result = readJson(file);
    if (!result) continue;
    const caseConfigLabels = collectNamedValues(result, 'caseConfig');
    const config = caseConfigLabels[0] || 'unknown-config';
    const testIdentity = getTestIdentity(result, file);
    const resultTimestamp = Number(result?.stop ?? result?.start ?? 0);
    const key = `${testIdentity}::${config}`;
    const existing = latestByTestAndConfig.get(key);
    if (!existing || resultTimestamp >= existing.timestamp) {
      latestByTestAndConfig.set(key, { file, result, config, timestamp: resultTimestamp });
    }
  }

  for (const { file, result, config } of latestByTestAndConfig.values()) {
    const caseLabels = collectNamedValues(result, 'testCaseId');
    const caseStatusLabels = collectNamedValues(result, 'caseStatus');
    const statusesByCase = new Map();
    for (const statusItem of caseStatusLabels.map(parseCaseStatus)) {
      if (!statusItem.id || !statusItem.status) continue;
      if (!statusesByCase.has(statusItem.id)) statusesByCase.set(statusItem.id, new Set());
      statusesByCase.get(statusItem.id).add(statusItem.status);
    }

    for (const rawCaseLabel of caseLabels) {
      const parsed = parseCaseLabel(rawCaseLabel);
      if (!parsed.id) continue;

      if (!perCase.has(parsed.id)) {
        perCase.set(parsed.id, {
          caseId: parsed.id,
          caseName: parsed.name,
          outcomes: [],
        });
      }

      const entry = perCase.get(parsed.id);
      if (!entry.caseName && parsed.name) {
        entry.caseName = parsed.name;
      }

      const caseStatuses = statusesByCase.get(parsed.id) || new Set();
      const isPassed = caseStatuses.has('passed');
      const isReached = caseStatuses.has('reached');
      const isNotReached = caseStatuses.has('not_reached');
      let outcomeStatus = 'failed';
      if (isPassed) outcomeStatus = 'passed';
      else if (isReached) outcomeStatus = 'failed';
      else if (isNotReached) outcomeStatus = 'not_reached';

      const failure = outcomeStatus === 'passed' ? null : (() => {
        const f = extractFailureInfo(result, file);
        f.config = config;
        f.status = outcomeStatus;
        const caseError = extractCaseErrorForId(result, parsed.id);
        if (caseError) {
          f.error = caseError;
        } else if (parsed.name) {
          const caseStep = findFailedStepForCaseName(result?.steps, parsed.name);
          if (caseStep) {
            const stepMsg = cleanMessage(caseStep?.statusDetails?.message);
            if (stepMsg) f.error = stepMsg;
            const stepName = cleanMessage(caseStep?.name);
            if (stepName) f.failedStep = stepName;
          }
        }
        return f;
      })();
      entry.outcomes.push({ config, status: outcomeStatus, failure });
    }
  }

  const summary = Array.from(perCase.values()).map((entry) => {
    const passedConfigs = entry.outcomes.filter((o) => o.status === 'passed').map((o) => o.config);
    const failedConfigs = entry.outcomes.filter((o) => o.status !== 'passed').map((o) => o.failure);
    const failedCount = failedConfigs.filter((f) => f?.status === 'failed').length;
    const notReachedCount = failedConfigs.filter((f) => f?.status === 'not_reached').length;
    const passedCount = passedConfigs.length;

    let status = 'failed';
    if (passedCount > 0 && failedCount === 0) status = 'passed';
    else if (passedCount > 0 && failedCount > 0) status = 'partially_passed';
    else if (passedCount === 0 && failedCount === 0 && notReachedCount > 0) status = 'not_reached';
    else if (passedCount === 0 && failedCount > 0) status = 'failed';

    return {
      caseId: entry.caseId,
      caseName: entry.caseName,
      status,
      passedConfigs: [...new Set(passedConfigs)],
      failedConfigs: failedConfigs.filter(
        (item, index, arr) =>
          arr.findIndex(
            (x) =>
              x.config === item.config &&
              x.error === item.error &&
              x.failedStep === item.failedStep
          ) === index
      ),
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
