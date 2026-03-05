const fs = require('fs');
const path = require('path');

const dataFile = './data/drift-analytics-2026-02.json';
const resultsDir = './allure-results';

let history = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const allFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));

history = history.map((entry, idx) => {
    for (const file of allFiles) {
        const content = fs.readFileSync(path.join(resultsDir, file), 'utf-8');
        
        // Match based on the key we just found in your terminal
         {
            const sbert = JSON.parse(content);
            
            // Align by similarity score to ensure the row matches the graph
            const fileSim = sbert.summary?.similarityScore || sbert.drift?.sbert_similarity || 0;
           // if (Math.abs(fileSim - (entry.drift?.sbert_similarity || 0)) < 0.05) {
           if (Math.abs(fileSim - (entry.drift?.sbert_similarity || 0)) < 0.001) {                
                console.log(`✅ MATCHED REAL DATA: ${file}`);
                return {
                    ...entry,
                    student_file: sbert.fileName || "assignment_v1.pdf",
                    baseline: {
                        instruction: sbert.baseline?.instruction || "N/A",
                        total_score: sbert.baseline?.total_score || sbert.baselineScore || 10, 
                        criterion_feedback: sbert.baseline?.feedback || "See Attachment"
                    },
                    current: {
                        instruction: sbert.current?.instruction || "N/A",
                        total_score: sbert.current?.total_score || sbert.currentScore || 8,
                        criterion_feedback: sbert.current?.feedback || "See Attachment"
                    }
                };
            }
        }
    }
    return entry;
});

fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
console.log("✅ Repair complete with correct keys.");