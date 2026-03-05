const fs = require('fs');
const path = require('path');

const dataFile = './data/drift-analytics-2026-02.json';
const resultsDir = './allure-results';

if (!fs.existsSync(dataFile)) {
    console.log("No data file found to fix.");
    process.exit();
}

let history = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const allFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));

console.log(`Scanning ${allFiles.length} files for drift data...`);

// Iterate through history and repair entries with real data
history = history.map((entry) => {
    // We only repair if data is missing
    if (
        !entry.baseline ||
        !entry.current ||
        entry.student_file === "unknown" ||
        entry.student_file === "assignment_v1.pdf" ||
        entry.baseline.total_score === 0 ||
        entry.current.total_score === 0 ||
        entry.baseline.instruction === "N/A"
    )  {
        
        for (const file of allFiles) {
            const content = fs.readFileSync(path.join(resultsDir, file), 'utf-8');
            
            // Check if this file contains the drift keys
            if (content.includes('baselineInstruction') || content.includes('baseline_instruction')) {
                const sbert = JSON.parse(content);
                
                // Only use this file if the similarity matches the entry to keep them synced
                const fileSim = sbert.summary?.similarityScore || sbert.drift?.sbert_similarity || 0;
                
                // Allow a small margin for float comparison
                if (Math.abs(fileSim - (entry.drift?.sbert_similarity || 0)) < 0.001) {
                    console.log(`✅ MATCHED: ${file} -> ${sbert.fileName || 'Assignment'}`);
                    
                    return {
                        ...entry,
                        student_file: sbert.fileName || sbert.student_file || "assignment_v1.pdf",
                        baseline: {
                            instruction: sbert.baselineInstruction || sbert.baseline?.instruction || "N/A",
                            total_score: sbert.baselineScore || sbert.baseline?.total_score || 0,
                            criterion_feedback: sbert.baselineFeedback || sbert.baseline?.criterion_feedback || "N/A"
                        },
                        current: {
                            instruction: sbert.currentInstruction || sbert.current?.instruction || "N/A",
                            total_score: sbert.currentScore || sbert.current?.total_score || 0,
                            criterion_feedback: sbert.currentFeedback || sbert.current?.criterion_feedback || "N/A"
                        }
                    };
                }
            }
        }
    }
    return entry;
});

fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
console.log("✅ Repair complete. History is now synchronized with raw test data.");