const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// YOUR JIRA INFO
const JIRA_BASE = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_KEY = process.env.JIRA_KEY;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'POW';
const JIRA_TEST_CASE_ISSUE_TYPE = process.env.JIRA_TEST_CASE_ISSUE_TYPE || 'TestCase';

async function getAgileStats() {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_KEY}`).toString('base64');
    const headers = {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    console.log('🚀 Starting deep sync with Jira (Agile Test)...');

    try {
        // --- 1. AGILE (JIRA) SYNC ---
        // Read-only: POST /search/approximate-count returns just { count }, no issues fetched.
        const getCount = async (jql) => {
            const { data } = await axios.post(
                `${JIRA_BASE}/rest/api/3/search/approximate-count`,
                { jql },
                { headers }
            );
            return data.count || 0;
        };

        const baseJql = `project = "${JIRA_PROJECT_KEY}" AND issuetype = "${JIRA_TEST_CASE_ISSUE_TYPE}" AND status != "Invalid" AND labels = "regression"`;

        const [total, automated, not_automatable, automation_in_progress, yet_to_automate] = await Promise.all([
            getCount(baseJql),
            getCount(`${baseJql} AND labels = "automated"`),
            getCount(`${baseJql} AND labels = "manual_qa"`),
            getCount(`${baseJql} AND labels = "automation_in_progress"`),
            getCount(`${baseJql} AND labels = "yet_to_automate"`),
        ]);

        const stats = {
            total,
            automated,
            not_automatable,
            automation_in_progress,
            yet_to_automate,
            lastUpdated: new Date().toLocaleString()
        };

        const labelTotal = automated + not_automatable + automation_in_progress + yet_to_automate;
        if (labelTotal !== total) {
            const offset = total - labelTotal;
            console.warn(`⚠️ Test Case count mismatch: total offset:${offset} case(s)`);
        }

        fs.writeFileSync('./agile-stats.json', JSON.stringify(stats, null, 2));
        console.log('💾 Agile stats saved.');

        // --- 2. DRIFT ANALYTICS CONSOLIDATION (Process ALL results) ---
        const resultsDir = './allure-results';
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const dataFile = path.join(dataDir, `drift-analytics-${new Date().toISOString().slice(0, 7)}.json`);
        let history = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];

        const resultFiles = fs.readdirSync(resultsDir).filter(f => f.startsWith('latest-run') && f.endsWith('.json'));

        if (resultFiles.length === 0) {
            console.warn('⚠️ No latest-run JSON files found in allure-results.');
            return;
        }

        resultFiles.forEach(file => {
            try {
                const latest = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
                if (latest.student_file?.toLowerCase().includes('no rubric')) {
                    console.log(`⏭️ Skipping No Rubric entry: ${latest.student_file}`);
                    return;
                }

                const sbertValue = (latest.drift && latest.drift.sbert_similarity !== undefined)
                    ? latest.drift.sbert_similarity
                    : (latest.sbertSimilarity ?? 0);

                const newEntry = {
                    run_date: latest.run_date || new Date().toISOString(),
                    lms: latest.lms || "Canvas",
                    student_file: latest.student_file || latest.uniqueTitle || "Unknown File",
                    sbert_similarity: sbertValue,
                    drift: latest.drift || {
                        sbert_similarity: sbertValue,
                        score_delta: (latest.current?.total_score || 0) - (latest.baseline?.total_score || 0)
                    },
                    baseline: latest.baseline || {},
                    current: latest.current || {},
                    grade_time_mins: latest.grade_time_mins ?? 'N/A',
                    status: latest.status ?? 'unknown',
                };

                const isDuplicate = history.find(h =>
                    h.run_date === newEntry.run_date &&
                    h.student_file === newEntry.student_file
                );
                if (!isDuplicate) {
                    history.push(newEntry);
                    console.log(`✅ Added: ${newEntry.student_file} (Similarity: ${(sbertValue * 100).toFixed(1)}%)`);
                } else {
                    console.log(`⏭️ Skipped exact duplicate: ${newEntry.student_file}`);
                }
            } catch (e) {
                console.error(`❌ Error processing ${file}:`, e.message);
            }
        });

        // --- 3. SAVE & TRUNCATE ---
        const MAX_HISTORY = 100;
        if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

        fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
        console.log(`✅ Consolidated data saved to ${path.basename(dataFile)}.`);

    } catch (err) {
        console.error('❌ Sync Error:', err.response ? err.response.data : err.message);
    }
}

getAgileStats();
