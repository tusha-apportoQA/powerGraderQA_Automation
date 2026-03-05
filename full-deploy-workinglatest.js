const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const suite = process.argv[2];
const cfg = 'playwright.config.ts';
const resultsDir = path.join(__dirname, 'allure-results');

// 1. Define commands FIRST
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

// 2. Only run tests IF a suite is provided.
if (suite) {
    console.log(`🚀 Suite '${suite}' detected. Cleaning and running tests...`);
    clean('allure-results');
    clean('allure-report');
    try {
        execSync(testCmd, { stdio: 'inherit' });
    } catch (e) { 
        console.log('⚠️ Some tests failed, but proceeding to scavenger...'); 
    }
} else {
    console.log('✅ No suite provided. Scavenging existing results from manual run...');
}

let maxDrift = 0;
let worstField = 'none';
let detailedPattern = {}; 

// 3. Process results (Scavenger)
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

                        // ✅ PRIORITY CHECK: Don't let older reports overwrite the specific run we want
                        const isTarget = sbert.student_file?.includes("Long Accurate") || sbert.fileName?.includes("Long Accurate");
                        
                        if (isTarget || !detailedPattern.student_file) {
                            console.log(`✅ Found report for: ${sbert.student_file || sbert.fileName || "unknown"}`);
                            
                            detailedPattern = {
                                student_file: sbert.fileName || sbert.student_file || "unknown",
                                baseline: {
                                    instruction: sbert.baseline?.instruction || sbert.baselineInstruction || "N/A",
                                    totalScore: sbert.baseline?.totalScore || sbert.baseline?.total_score || sbert.baselineScore || 0,
                                    overallFeedback: sbert.baseline?.overallFeedback || sbert.baseline?.criterion_feedback || sbert.baselineFeedback || "N/A",
                                    criteria: (sbert.baseline?.criteria || sbert.baselineCriteria || []).map(c => ({
                                        name: c.name,
                                        score: c.score || c.points || 0, 
                                        feedback: c.feedback || "N/A"
                                    }))
                                },
                                current: {
                                    instruction: sbert.current?.instruction || sbert.currentInstruction || "N/A",
                                    totalScore: sbert.current?.totalScore || sbert.current?.total_score || sbert.currentScore || 0,
                                    overallFeedback: sbert.current?.overallFeedback || sbert.current?.criterion_feedback || sbert.currentFeedback || "N/A",
                                    criteria: (sbert.current?.criteria || sbert.currentCriteria || []).map(c => ({
                                        name: c.name,
                                        score: c.score || c.points || 0,
                                        feedback: c.feedback || "N/A"
                                    }))
                                },
                                drift: {
                                    sbert_similarity: sbert.summary?.similarityScore || (1 - (sbert.summary?.maxConfidencePct / 100)) || 0
                                }
                            };

                            if (sbert.summary?.maxConfidencePct > maxDrift) {
                                maxDrift = sbert.summary.maxConfidencePct;
                                worstField = sbert.summary.worstField || 'none';
                            }
                        }
                    }
                }
            }
        }
    }
} catch (e) {
    console.log('⚠️ Failed to process results:', e.message);
}

// 4. Save and Deploy
try {
    const summary = {
        ...detailedPattern,
        maxDrift: maxDrift,
        worstField: worstField,
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(path.join(resultsDir, 'latest-run.json'), JSON.stringify(summary, null, 2));
    console.log('📦 latest-run.json saved with Deep-Dive data.');
    
    // ✅ Generate Allure report and upload to Cloudflare
    console.log('🚀 Triggering deployment hub...');
    execSync('npm run deploy-hub', { stdio: 'inherit' });
} catch (e) {
    console.log('⚠️ Deployment failed:', e.message);
}