const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const suite = process.argv[2];
const cfg = 'playwright.config.ts';

const testCmds = {
  canvas: `npx playwright test -c ${cfg} e2e/features/canvas`,
  'canvas-quick': `npx playwright test -c ${cfg} e2e/features/canvas --grep "Short Accurate"`,
  d2l: `npx playwright test -c ${cfg} e2e/features/d2l`,
};

const testCmd = testCmds[suite] || `npx playwright test -c ${cfg}`;

function clean(dir) {
  fs.rmSync(path.join(__dirname, dir), { recursive: true, force: true });
}

function countAllureResults() {
  const resultsDir = path.join(__dirname, 'allure-results');
  if (!fs.existsSync(resultsDir)) return 0;
  return fs.readdirSync(resultsDir).filter(f => f.endsWith('-result.json')).length;
}

// ✅ clean BEFORE running tests
clean('allure-results');
clean('allure-report'); // optional

try {
  execSync(testCmd, { stdio: 'inherit' });
} catch {
  console.log('Some tests failed - continuing to deploy...');
}

// ✅ Write SBERT environment summary for Allure overview
 try {
    const resultsDir = path.join(__dirname, 'allure-results');
    const resultFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('-result.json'));
    
    let maxDrift = 0;
    let worstField = 'none';
    let scores = [];

    for (const file of resultFiles) {
      const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf-8'));
      for (const attachment of data.attachments ?? []) {
        if (attachment.name === 'SBERT Drift Report') {
          const attachPath = path.join(resultsDir, attachment.source);
          if (fs.existsSync(attachPath)) {
            const sbert = JSON.parse(fs.readFileSync(attachPath, 'utf-8'));
            if (sbert.summary.maxConfidencePct > maxDrift) {
              maxDrift = sbert.summary.maxConfidencePct;
              worstField = sbert.summary.worstField;
            }
          }
        }
      }
    }

    fs.writeFileSync(path.join(resultsDir, 'environment.properties'),
  `Max.SBERT.Drift.Pct=${maxDrift.toFixed(1)}
  Worst.Field=${worstField}
  `);
    console.log('✅ environment.properties written');
  } catch (e) {
    console.log('⚠️ Could not write environment.properties:', e.message);
  }

// ✅ sanity check before generating/deploying report
const n = countAllureResults();
console.log('Allure result.json count:', n);
if (n === 0) {
  throw new Error('No Allure results produced. Check allure-playwright reporter outputFolder / config loading.');
}

try {
  execSync('npm run deploy-hub', { stdio: 'inherit' });
} catch {
  console.log('Deploy failed - check wrangler logs above');
}