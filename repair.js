// repair.js
/*const fs = require("fs");
const path = require("path");

const dataFile = "./data/drift-analytics-2026-02.json";
const resultsDir = "./allure-results";
const latestRunFile = path.join(resultsDir, "latest-run.json");

if (!fs.existsSync(dataFile)) {
  console.log("No data file found.");
  process.exit(1);
}
if (!fs.existsSync(resultsDir)) {
  console.log("No allure-results dir found.");
  process.exit(1);
}
if (!fs.existsSync(latestRunFile)) {
  console.log("No latest-run.json found in allure-results. Nothing to repair from.");
  process.exit(1);
}

let history = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const latestRun = JSON.parse(fs.readFileSync(latestRunFile, "utf8"));

console.log(`Checking ${history.length} history entries...`);
console.log("Loaded latest-run.json");

let repairedCount = 0;

history = history.map((entry) => {
  const baselineScore = entry?.baseline?.total_score;
  const currentScore = entry?.current?.total_score;

  const needsRepair =
    entry?.student_file === "unknown" ||
    entry?.student_file === "assignment_v1.pdf" ||
    !entry?.baseline ||
    !entry?.current ||
    typeof baselineScore !== "number" ||
    typeof currentScore !== "number" ||
    (baselineScore === 0 && currentScore === 0);

  if (!needsRepair) return entry;

  repairedCount++;
  /*return {
    ...entry,
    student_file: latestRun.student_file || entry.student_file || "assignment_v1.pdf",
    baseline: {
      instruction: latestRun.baseline?.instruction ?? "N/A",
      total_score: latestRun.baseline?.total_score ?? 0,
      criterion_feedback: latestRun.baseline?.criterion_feedback ?? "See Attachment",
    },
    current: {
      instruction: latestRun.current?.instruction ?? "N/A",
      total_score: latestRun.current?.total_score ?? 0,
      criterion_feedback: latestRun.current?.criterion_feedback ?? "See Attachment",
    },
    // keep whatever drift the entry already had; if missing, copy from latest-run
    drift: entry.drift ?? latestRun.drift,
  };*/

  // REPAIR.JS (Updated Mapping)
  // repair.js
  /*return {
    ...entry,
    // Ensure we aren't passing "N/A" strings where the component expects content
    baseline: {
      instruction: latestRun.baseline?.instruction || "No Instruction Provided",
      totalScore: latestRun.baseline?.total_score || 0,
      overallFeedback: latestRun.baseline?.overall_feedback || latestRun.baseline?.criterion_feedback || "No Feedback",
      criteria: latestRun.baseline?.criteria || []
    },
    current: {
      instruction: latestRun.current?.instruction || "No Instruction Provided",
      totalScore: latestRun.current?.total_score || 0,
      overallFeedback: latestRun.current?.overall_feedback || latestRun.current?.criterion_feedback || "No Feedback",
      criteria: latestRun.current?.criteria || []
    }
  };
});

fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
console.log(`✅ Repair complete. Repaired ${repairedCount} entries. data/drift-analytics-2026-02.json is now populated.`);*/

/*const fs = require("fs");
const path = require("path");

// Fix 1: Dynamically target the current month (2026-03)
const month = new Date().toISOString().slice(0, 7); 
const dataFile = `./data/drift-analytics-${month}.json`;
const resultsDir = "./allure-results";
const latestRunFile = path.join(resultsDir, "latest-run.json");

if (!fs.existsSync(dataFile)) {
  console.log(`No data file found for ${month}. Creating it...`);
  fs.writeFileSync(dataFile, "[]");
}

let history = JSON.parse(fs.readFileSync(dataFile, "utf8"));
const latestRun = JSON.parse(fs.readFileSync(latestRunFile, "utf8"));

// --- NEW STATUS CHECK ---
const baseScore = latestRun.baseline?.total_score;
const currScore = latestRun.current?.total_score;

if (typeof baseScore !== 'number' || baseScore === 0) {
    console.error("❌ ABORTING: Baseline score is 0 or missing in latest-run.json.");
    console.error("Check your test execution before repairing history.");
    process.exit(1); // Exits the script with an error code
}

console.log("✅ Data validation passed. Proceeding with history repair...");
// --- END OF STATUS CHECK ---

history = history.map((entry) => {
// If the latest run is just zeros, DON'T use it to "repair" the entry.
  // Use the existing entry values as a fallback.
  const bScore = (latestRun.baseline?.total_score > 0) ? latestRun.baseline.total_score : (entry.baseline?.totalScore || 0);
  const cScore = (latestRun.current?.total_score > 0) ? latestRun.current.total_score : (entry.current?.totalScore || 0);

  return {
    ...entry,
    baseline: {
      ...entry.baseline,
      totalScore: bScore,
      total_score: bScore,
      overallFeedback: latestRun.baseline?.criterion_feedback || entry.baseline?.overallFeedback || "N/A"
    },
    current: {
      ...entry.current,
      totalScore: cScore,
      total_score: cScore,
      overallFeedback: latestRun.current?.criterion_feedback || entry.current?.overallFeedback || "N/A"
    }
  };

});

fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
console.log(`✅ Fixed March file: ${dataFile}`);*/

// repair.js
// repair.js
/*const fs = require("fs");
const path = require("path");

// 1. Target the current month (March 2026)
const month = new Date().toISOString().slice(0, 7); 
const dataFile = `./data/drift-analytics-${month}.json`;
const latestRunFile = "./allure-results/latest-run.json";

// 2. Read existing history (or start fresh if we wiped it)
let history = [];
if (fs.existsSync(dataFile)) {
    try {
        history = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    } catch (e) {
        history = []; 
    }
}

// 3. Load the fresh test result
if (!fs.existsSync(latestRunFile)) {
    console.error("❌ No test results found in allure-results. Run the test first.");
    process.exit(1);
}
const latestRun = JSON.parse(fs.readFileSync(latestRunFile, "utf8"));

// 4. FIX: Log a warning instead of ABORTING on 0 scores
const bScore = latestRun.baseline?.total_score ?? 0;
const cScore = latestRun.current?.total_score ?? 0;

if (bScore === 0 && cScore === 0) {
    console.warn("⚠️ Warning: Test returned 0/0. Proceeding to update history and fix drill-down...");
}

// 5. APPEND: Map scores and inject feedback into the drill-down fields
const newEntry = {
    run_date: new Date().toISOString(),
    student_file: latestRun.student_file || "assignment_v1.pdf",
    baseline: {
        instruction: latestRun.baseline?.instruction || "N/A",
        totalScore: bScore,
        total_score: bScore,
        overallFeedback: latestRun.baseline?.criterion_feedback || "N/A",
        criterion_feedback: latestRun.baseline?.criterion_feedback || "N/A"
    },
    current: {
        instruction: latestRun.current?.instruction || "N/A",
        totalScore: cScore,
        total_score: cScore,
        overallFeedback: latestRun.current?.criterion_feedback || "N/A",
        criterion_feedback: latestRun.current?.criterion_feedback || "N/A"
    },
    drift: latestRun.drift || { sbert_similarity: 1, score_delta: 0 }
};

// Push to array and save to the March 2026 file
history.push(newEntry);
fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));

console.log(`✅ Successfully updated ${dataFile} (Score: ${bScore}).`);
console.log(`🚀 Ready for Cloudflare deployment.`);*/

// repair.js
// repair.js
const fs = require("fs");
const path = require("path");

// 1. Target the current month dynamically
const month = new Date().toISOString().slice(0, 7); 
const dataFile = `./data/drift-analytics-${month}.json`;
const latestRunFile = "./allure-results/latest-run.json";

// 2. Read existing history or start a fresh array
let history = [];
if (fs.existsSync(dataFile)) {
    try {
        history = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    } catch (e) {
        history = []; 
    }
}

// 3. Load the fresh test result (Ensure test was run first)
if (!fs.existsSync(latestRunFile)) {
    console.error("❌ No test results found in allure-results. Run your Playwright test first.");
    process.exit(1);
}
const latestRun = JSON.parse(fs.readFileSync(latestRunFile, "utf8"));

// 4. Extract Dynamic Data (Handles changing timestamps/filenames)
const bScore = latestRun.baseline?.total_score ?? 0;
const cScore = latestRun.current?.total_score ?? 0;
const feedback = latestRun.baseline?.criterion_feedback || "No feedback recorded in test results.";

// Log a warning for 0 scores but DO NOT abort the push
if (bScore === 0 && cScore === 0) {
    console.warn("⚠️ Warning: Test returned 0/0. Proceeding to map feedback to dashboard...");
}

// 5. Create the New Entry (Mapping keys for the HTML modal)
/*const newEntry = {
    run_date: new Date().toISOString(),
    student_file: latestRun.student_file || "assignment_v1.pdf",
    baseline: {
        instruction: latestRun.baseline?.instruction || "N/A",
        totalScore: bScore,
        total_score: bScore,
        // We populate both keys so the HTML 'openModal' function finds the text
        overallFeedback: feedback,
        criterion_feedback: feedback
    },
    current: {
        instruction: latestRun.current?.instruction || "N/A",
        totalScore: cScore,
        total_score: cScore,
        overallFeedback: feedback,
        criterion_feedback: feedback
    },
    drift: latestRun.drift || { sbert_similarity: 1, score_delta: 0 }
};*/

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
