const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const suite = process.argv[2];
const cfg = 'playwright.config.ts';
const resultsDir = path.join(__dirname, 'allure-results');

const testCmds = {
    canvas: `npx playwright test -c ${cfg} e2e/features/canvas`,
    'canvas-quick': `npx playwright test -c ${cfg} e2e/features/canvas --grep "Short Accurate"`,
    d2l: `npx playwright test -c ${cfg} e2e/features/d2l`,
    moodle: `npx playwright test -c ${cfg} e2e/features/moodle`,
    'canvas-d2l': `npx playwright test -c ${cfg} e2e/features/canvas && npx playwright test -c ${cfg} e2e/features/d2l`,
    'canvas-single': `npx playwright test -c ${cfg} e2e/features/canvas --grep "Long Accurate Existing Rubric PDF"`,
};

const testCmd = testCmds[suite] || `npx playwright test -c ${cfg}`;

function clean(dir) {
    if (fs.existsSync(path.join(__dirname, dir))) {
        fs.rmSync(path.join(__dirname, dir), { recursive: true, force: true });
    }
}

// Only run tests if suite is explicitly provided
/*if (suite) {
    clean('allure-results');
    clean('allure-report');
    try {
        execSync(testCmd, { stdio: 'inherit' });
    } catch (e) { console.log('⚠️ Tests completed with failures.'); }
}*/

/*if (suite) {
    const isFirstRun = process.env.FIRST_RUN !== 'false';
    if (isFirstRun) {
        clean('allure-results');
        clean('allure-report');
    }
    try {
        execSync(testCmd, { stdio: 'inherit' });
    } catch (e) { console.log('⚠️ Tests completed with failures.'); }
}*/
if (suite) {
    const isFirstRun = process.env.FIRST_RUN !== 'false';
    if (isFirstRun) {
        // Backup allure history before cleaning
        const historyDir = path.join(__dirname, 'allure-report', 'history');
        //const historyBackup = path.join(__dirname, 'allure-history-backup');
        const permanentHistory = path.join(__dirname, 'allure-history-permanent');

        if (fs.existsSync(historyDir)) {
            //fs.cpSync(historyDir, historyBackup, { recursive: true, force: true });
            //console.log('📦 Allure history backed up.');
            fs.cpSync(historyDir, permanentHistory, { recursive: true, force: true });
            console.log('📦 Allure history backed up to permanent store.');
        }
        clean('allure-results');
        clean('allure-report');
    }
    try {
        execSync(testCmd, { stdio: 'inherit' });
    } catch (e) { console.log('⚠️ Tests completed with failures.'); }
}

let detailedPattern = null; 

try {
    if (fs.existsSync(resultsDir)) {
        const resultFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('-result.json'));

        for (const file of resultFiles) {
            const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf-8'));

            let lmsType = "Canvas"; // Default
            const suiteLabel = (data.labels || []).find(l => l.name === 'suite' || l.name === 'parentSuite')?.value || "";
            if (suiteLabel.toLowerCase().includes('moodle')) lmsType = "Moodle";
            else if (suiteLabel.toLowerCase().includes('d2l')) lmsType = "D2L";

            for (const attachment of data.attachments ?? []) {
                if (attachment.name === 'SBERT Drift Report') {
                    const attachPath = path.join(resultsDir, attachment.source);
                    if (fs.existsSync(attachPath)) {
                        const sbert = JSON.parse(fs.readFileSync(attachPath, 'utf-8'));
                        detailedPattern = {
                            run_date: new Date().toISOString(),
                            lms: lmsType,
                            student_file: sbert.fileName || sbert.student_file || "unknown",
                            baseline: {
                                instruction: sbert.baseline?.instruction || sbert.baselineInstruction || "N/A",
                                total_score:
                                sbert.baseline?.totalScore ||
                                sbert.baseline?.total_score ||
                                sbert.baselineScore || 0,
                                criterion_feedback:
                                sbert.baseline?.overallFeedback ||
                                sbert.baselineFeedback || "N/A",
                                criteria:
                                (sbert.baseline?.criteria || sbert.baselineCriteria || []).map(c => ({
                                    name: c.name,
                                    score: c.score || c.points || 0,
                                    feedback: c.feedback || "N/A",
                                })),
                            },
                            current: {
                                instruction: sbert.current?.instruction || sbert.currentInstruction || "N/A",
                                total_score:
                                sbert.current?.totalScore ||
                                sbert.current?.total_score ||
                                sbert.currentScore || 0,
                                criterion_feedback:
                                sbert.current?.overallFeedback ||
                                sbert.currentFeedback || "N/A",
                                criteria:
                                (sbert.current?.criteria || sbert.currentCriteria || []).map(c => ({
                                    name: c.name,
                                    score: c.score || c.points || 0,
                                    feedback: c.feedback || "N/A",
                                })),
                            },
                            drift: {
                                sbert_similarity:
                                sbert.summary?.similarityScore ||
                                (1 - (sbert.summary?.maxConfidencePct / 100)) || 0,
                                score_delta:
                                (sbert.current?.totalScore || sbert.current?.total_score || 0) -
                                (sbert.baseline?.totalScore || sbert.baseline?.total_score || 0),
                            },
                        };
                        const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                        fs.writeFileSync(path.join(resultsDir, `latest-run-${uid}.json`), JSON.stringify(detailedPattern, null, 2));
                    }
                }
            }
        }
    }
} catch (e) { console.log('⚠️ Scavenger error:', e.message); }

/*if (detailedPattern) {
    fs.writeFileSync(path.join(resultsDir, 'latest-run.json'), JSON.stringify(detailedPattern, null, 2));
    console.log('📦 latest-run.json saved. Deploying...');
    const deployCmd = "node sync.js && npx allure-commandline generate ./allure-results --clean -o ./allure-report && npm run patch-report && npx wrangler pages deploy ./allure-report --project-name=powergrader-automation-qa-hub --commit-dirty=true";  
    execSync(deployCmd, { stdio: 'inherit' });
    //execSync('npm run deploy-hub', { stdio: 'inherit' });
}*/

/*if (detailedPattern) {
    fs.writeFileSync(path.join(resultsDir, `latest-run-${Date.now()}.json`), JSON.stringify(detailedPattern, null, 2));
    console.log('📦 latest-run.json created from Allure results.');
}*/

// 2. 🎯 ALWAYS DEPLOY: Move this outside the IF block
console.log('🚀 Starting Sync and Deployment phase...');
// Clear stale latest-run files older than 2 hours before sync
if (fs.existsSync(resultsDir)) {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    fs.readdirSync(resultsDir)
        .filter(f => f.startsWith('latest-run') && f.endsWith('.json'))
        .forEach(f => {
            const filePath = path.join(resultsDir, f);
            if (fs.statSync(filePath).mtimeMs < twoHoursAgo) {
                fs.rmSync(filePath);
                console.log(`🗑️ Removed stale: ${f}`);
            }
        });
}
// Restore allure history into allure-results before generate
//const historyBackup = path.join(__dirname, 'allure-history-backup');
const permanentHistory = path.join(__dirname, 'allure-history-permanent');
const historyRestore = path.join(__dirname, 'allure-results', 'history');
/*if (fs.existsSync(historyBackup)) {
    fs.cpSync(historyBackup, historyRestore, { recursive: true, force: true });
    fs.rmSync(historyBackup, { recursive: true, force: true });
    console.log('📦 Allure history restored.');
}*/
if (fs.existsSync(permanentHistory)) {
    fs.cpSync(permanentHistory, historyRestore, { recursive: true, force: true });
    console.log('📦 Allure history restored from permanent store.');
}

execSync("node sync.js", { stdio: 'inherit' });
if (fs.existsSync(resultsDir)) {
    fs.readdirSync(resultsDir)
        .filter(f => f.endsWith('-case-summary-result.json'))
        .forEach(f => fs.rmSync(path.join(resultsDir, f), { force: true }));
    console.log('🧹 Cleaned old case summary results.');
}
if (fs.existsSync('./case-config-report.json')) {
    fs.rmSync('./case-config-report.json', { force: true });
    console.log('🧹 Cleaned stale case-config-report.json');
}
execSync("node parse-case-config-report.js", { stdio: 'inherit' });
execSync("node inject-case-report-to-allure.js", { stdio: 'inherit' });
//const deployCmd = "node sync.js && npx allure-commandline generate ./allure-results --clean -o ./allure-report && npm run patch-report && npx wrangler pages deploy ./allure-report --project-name=powergrader-automation-qa-hub --commit-dirty=true";  
const deployCmd = "npx allure-commandline generate ./allure-results --clean -o ./allure-report && npm run patch-report && npx wrangler pages deploy ./allure-report --project-name=powergrader-automation-qa-hub --commit-dirty=true";

try {
    //execSync(deployCmd, { stdio: 'inherit' });
    execSync("npx allure-commandline generate ./allure-results --clean -o ./allure-report", { stdio: 'inherit' });
    // Create missing behaviors.json to prevent 500 error in Allure dashboard
    fs.writeFileSync(
        path.join(__dirname, 'allure-report', 'widgets', 'behaviors.json'),
        JSON.stringify({ total: 0, items: [] })
    );
    console.log('✅ behaviors.json created.');

    // Only update permanent history if report has actual test results
    const newHistory = path.join(__dirname, 'allure-report', 'history');
   // const permanentHistory = path.join(__dirname, 'allure-history-permanent');
    const summaryFile = path.join(newHistory, 'history-trend.json');
    if (fs.existsSync(summaryFile)) {
        const trend = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
        const hasResults = trend.some(t => (t.data?.total ?? 0) > 0);
        if (hasResults) {
            fs.cpSync(newHistory, permanentHistory, { recursive: true, force: true });
            console.log('📦 Allure history updated in permanent store.');
        } else {
            console.log('⚠️ Empty run - keeping existing permanent history.');
        }
    }

    execSync("npm run patch-report && npx wrangler pages deploy ./allure-report --project-name=powergrader-automation-qa-hub --commit-dirty=true", { stdio: 'inherit' });
} catch (deployError) {
    console.error('❌ Deployment failed:', deployError.message);
}
