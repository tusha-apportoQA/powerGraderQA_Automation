
// repair.js
const fs = require("fs");
const path = require("path");

// 1. Target the current month dynamically
const month = new Date().toISOString().slice(0, 7); 
const dataFile = `./data/drift-analytics-${month}.json`;
//const latestRunFile = "./allure-results/latest-run.json";
const resultsDir = "./allure-results";


// 2. Read existing history or start a fresh array
/*let history = [];
if (fs.existsSync(dataFile)) {
    try {
        history = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    } catch (e) {
        history = []; 
    }
}*/

let history = [];
if (fs.existsSync(dataFile)) {
    try {
        history = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    } catch (e) {
        history = []; 
    }
}

// 3. Load the fresh test result (Ensure test was run first)
/*if (!fs.existsSync(latestRunFile)) {
    console.error("❌ No test results found in allure-results. Run your Playwright test first.");
    process.exit(1);
}*/

const resultFiles = fs.readdirSync(resultsDir)
    .filter(f => f.startsWith('latest-run') && f.endsWith('.json'))
    .map(f => ({ file: f, time: fs.statSync(path.join(resultsDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

if (resultFiles.length === 0) {
    console.error("❌ No test results found in allure-results. Run your Playwright test first.");
    process.exit(1);
}
//const latestRun = JSON.parse(fs.readFileSync(latestRunFile, "utf8"));
const latestRunFile = path.join(resultsDir, resultFiles[0].file);
console.log(`📂 Using latest result file: ${resultFiles[0].file}`);
const latestRun = JSON.parse(fs.readFileSync(latestRunFile, "utf8"));

// 4. Extract Dynamic Data (Handles changing timestamps/filenames)
const bScore = latestRun.baseline?.total_score ?? 0;
const cScore = latestRun.current?.total_score ?? 0;
const feedback = latestRun.baseline?.criterion_feedback || "No feedback recorded in test results.";

// Log a warning for 0 scores but DO NOT abort the push
if (bScore === 0 && cScore === 0) {
    console.warn("⚠️ Warning: Test returned 0/0. Proceeding to map feedback to dashboard...");
}

const newEntry = {
    run_date: new Date().toISOString(),
    // Dynamically captures the name of whatever assignment you just ran
    student_file: latestRun.student_file || "assignment_v1.pdf", 
    baseline: {
        instruction: latestRun.baseline?.instruction || "N/A",
        totalScore: bScore,
        total_score: bScore,
        overallFeedback: feedback,
        criterion_feedback: feedback,
        // ADD THIS: It populates the individual criteria scores/feedback
        criteria: latestRun.baseline?.criteria || [] 
    },
    current: {
        instruction: latestRun.current?.instruction || "N/A",
        totalScore: cScore,
        total_score: cScore,
        overallFeedback: feedback,
        criterion_feedback: feedback,
        // ADD THIS: It populates the individual criteria scores/feedback
        criteria: latestRun.current?.criteria || [] 
    },
    drift: latestRun.drift || { sbert_similarity: 1, score_delta: 0 }
};

// 6. Append and Save
history.push(newEntry);
fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));

console.log(`✅ Successfully repaired and added: ${newEntry.student_file}`);
console.log(`🚀 Ready for 'npm run deploy-hub'`);
