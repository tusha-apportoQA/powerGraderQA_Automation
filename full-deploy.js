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
};

const testCmd = testCmds[suite] || `npx playwright test -c ${cfg}`;

function clean(dir) {
    if (fs.existsSync(path.join(__dirname, dir))) {
        fs.rmSync(path.join(__dirname, dir), { recursive: true, force: true });
    }
}

// Only run tests if suite is explicitly provided
if (suite) {
    clean('allure-results');
    clean('allure-report');
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
            for (const attachment of data.attachments ?? []) {
                if (attachment.name === 'SBERT Drift Report') {
                    const attachPath = path.join(resultsDir, attachment.source);
                    if (fs.existsSync(attachPath)) {
                        const sbert = JSON.parse(fs.readFileSync(attachPath, 'utf-8'));
                        
                        // ✅ NORMALIZE DATA: Map everything to a stable nested structure
                        /*detailedPattern = {
                            student_file: sbert.fileName || sbert.student_file || "unknown",
                            baseline: {
                                instruction: sbert.baseline?.instruction || sbert.baselineInstruction || "N/A",
                                totalScore: sbert.baseline?.totalScore || sbert.baseline?.total_score || sbert.baselineScore || 0,
                                overallFeedback: sbert.baseline?.overallFeedback || sbert.baselineFeedback || "N/A",
                                criteria: (sbert.baseline?.criteria || sbert.baselineCriteria || []).map(c => ({
                                    name: c.name, score: c.score || c.points || 0, feedback: c.feedback || "N/A"
                                }))
                            },
                            current: {
                                instruction: sbert.current?.instruction || sbert.currentInstruction || "N/A",
                                totalScore: sbert.current?.totalScore || sbert.current?.total_score || sbert.currentScore || 0,
                                overallFeedback: sbert.current?.overallFeedback || sbert.currentFeedback || "N/A",
                                criteria: (sbert.current?.criteria || sbert.currentCriteria || []).map(c => ({
                                    name: c.name, score: c.score || c.points || 0, feedback: c.feedback || "N/A"
                                }))
                            },
                            drift: { sbert_similarity: sbert.summary?.similarityScore || (1 - (sbert.summary?.maxConfidencePct / 100)) || 0 }
                        };*/

                        detailedPattern = {
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

if (detailedPattern) {
    fs.writeFileSync(path.join(resultsDir, 'latest-run.json'), JSON.stringify(detailedPattern, null, 2));
    console.log('📦 latest-run.json created from Allure results.');
}

// 2. 🎯 ALWAYS DEPLOY: Move this outside the IF block
console.log('🚀 Starting Sync and Deployment phase...');
const deployCmd = "node sync.js && npx allure-commandline generate ./allure-results --clean -o ./allure-report && npm run patch-report && npx wrangler pages deploy ./allure-report --project-name=powergrader-automation-qa-hub --commit-dirty=true";  

try {
    execSync(deployCmd, { stdio: 'inherit' });
} catch (deployError) {
    console.error('❌ Deployment failed:', deployError.message);
}