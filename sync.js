const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// YOUR TESTRAIL INFO
const TR_URL = process.env.TR_URL;
const TR_USER = process.env.TR_USER;
const TR_KEY = process.env.TR_KEY;  
const PROJECT_ID = process.env.PROJECT_ID;
const SUITE_ID = process.env.SUITE_ID;
const PARENT_SECTION_ID = Number(process.env.PARENT_SECTION_ID);

async function getRealStats() {
    const auth = Buffer.from(`${TR_USER}:${TR_KEY}`).toString('base64');
    const headers = { 'Authorization': `Basic ${auth}` };

    console.log('🚀 Starting deep sync with TestRail...');

    try {
        // --- 1. TESTRAIL SYNC ---
        const sectionsRes = await axios.get(
            `${TR_URL}/index.php?/api/v2/get_sections/${PROJECT_ID}&suite_id=${SUITE_ID}`,
            { headers }
        );
        const allSections = sectionsRes.data.sections;

        const getChildIds = (list, parentId) => {
            let ids = [parentId];
            list.filter(s => s.parent_id === parentId).forEach(child => {
                ids = ids.concat(getChildIds(list, child.id));
            });
            return ids;
        };

        const targetSectionIds = getChildIds(allSections, PARENT_SECTION_ID);
        console.log(`🔍 DEBUG: Searching in ${targetSectionIds.length} sections.`);
        
        let allCases = [];
        let offset = 0;
        const limit = 250;
        let hasMore = true;

        while (hasMore) {
            const response = await axios.get(
                `${TR_URL}/index.php?/api/v2/get_cases/${PROJECT_ID}&suite_id=${SUITE_ID}&limit=${limit}&offset=${offset}`,
                { headers }
            );
            const cases = response.data.cases;
            const filtered = cases.filter(c => targetSectionIds.includes(c.section_id));
            allCases = allCases.concat(filtered);
            if (cases.length < limit) hasMore = false; else offset += limit;
        }

        console.log("Success! Found " + allCases.length + " relevant cases");
        console.log("Automated count: " + allCases.filter(c => c.custom_case_automation_status === 1).length);

        const stats = {
            total: allCases.length,
            automated: allCases.filter(c => c.custom_case_automation_status === 1).length,
            not_automatable: allCases.filter(c => c.custom_case_automation_status === 2).length,
            automation_in_progress: allCases.filter(c => c.custom_case_automation_status === 3).length,
            yet_to_automate: allCases.filter(c => c.custom_case_automation_status === 4).length,
            lastUpdated: new Date().toLocaleString()
        };

        fs.writeFileSync('./testrail-stats.json', JSON.stringify(stats, null, 2));
        console.log('💾 TestRail stats saved.');

        // --- 2. DRIFT ANALYTICS CONSOLIDATION (RE-WIRED FOR NESTED DATA) ---
        const allurePath = './allure-results/latest-run.json';
        if (!fs.existsSync(allurePath)) {
            console.warn('⚠️ No latest-run.json found. Skipping drift update.');
            return;
        }

        const latest = JSON.parse(fs.readFileSync(allurePath, 'utf8'));
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        
        const dataFile = path.join(dataDir, `drift-analytics-${new Date().toISOString().slice(0, 7)}.json`);

        /*const newEntry = {
            run_date: latest.timestamp || new Date().toISOString(),
            student_file: latest.student_file || "unknown",
            
            // ✅ Fix 1: Store FULL nested objects so Deep-Dive Modal works
            baseline: latest.baseline || { instruction: "N/A", totalScore: 0, overallFeedback: "N/A", criteria: [] },
            current: latest.current || { instruction: "N/A", totalScore: 0, overallFeedback: "N/A", criteria: [] },
            
            // ✅ Fix 2: Flat keys at top level so Graph and Main Table don't break
            sbert_similarity: latest.drift?.sbert_similarity || 0,
            total_score: latest.current?.totalScore || latest.current?.total_score || 0,
            criterion_feedback: latest.current?.overallFeedback || latest.current?.criterion_feedback || "N/A"
        };*/

        const newEntry = {
            run_date: new Date().toISOString(),
            student_file: latest.student_file,
            sbert_similarity: latest.drift.sbert_similarity, // 🔥 Fixed for Graph
            baseline: latest.baseline, // 🔥 Fixed for Modal
            current: latest.current    // 🔥 Fixed for Modal
        };

        let history = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];
        console.log(`\n📊 [SYNC CHECK] Student File: ${latest.student_file}`);
        console.log(`📊 [SYNC CHECK] SBERT Similarity: ${(latest.drift?.sbert_similarity * 100).toFixed(1)}%`);

        const currentFeedback = newEntry.current?.criteria?.[0]?.feedback;
        if (currentFeedback && currentFeedback !== 'N/A') {
            console.log(`✅ [SYNC SUCCESS] Found feedback for modal: "${currentFeedback.substring(0, 50)}..."`);
        } else {
            console.log(`⚠️ [SYNC WARNING] No feedback found in latest-run.json for the Deep-Dive modal.`);
        }
        history.push(newEntry);
        fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
        console.log(`✅ Consolidated data saved to ${path.basename(dataFile)} with Graph compatibility.`);

    } catch (err) {
        console.error('❌ Sync Error:', err.response ? err.response.data : err.message);
    }
}

getRealStats();