    /*const axios = require('axios');
    const fs = require('fs');
    const path = require('path');

    // YOUR TESTRAIL INFO
    const TR_URL = 'https://apporto.testrail.io';
    const TR_USER = 't.pavuluri@apporto.com'; 
    const TR_KEY = 'CmsaN/0JEAFPUS/uvenl-X/lQGgxLM.yDpAMFl9me';  
    const PROJECT_ID = '10'; 
    const SUITE_ID = '220'; 
    const PARENT_SECTION_ID = 7288; // "Regression Test Suite (Consolidated) - Master"

    async function getRealStats() {
        const auth = Buffer.from(`${TR_USER}:${TR_KEY}`).toString('base64');
        const headers = { 'Authorization': `Basic ${auth}` };

        console.log('🚀 Starting deep sync with TestRail...');

        try {
            // --- 1. GET ALL SECTIONS TO BUILD THE HIERARCHY ---
            console.log('📂 Fetching section tree...');
            const sectionsRes = await axios.get(
                `${TR_URL}/index.php?/api/v2/get_sections/${PROJECT_ID}&suite_id=${SUITE_ID}`,
                { headers }
            );
            const allSections = sectionsRes.data.sections;

            // Recursive function to get all child IDs
            const getChildIds = (list, parentId) => {
                let ids = [parentId];
                list.filter(s => s.parent_id === parentId).forEach(child => {
                    ids = ids.concat(getChildIds(list, child.id));
                });
                return ids;
            };

            const targetSectionIds = getChildIds(allSections, PARENT_SECTION_ID);
            console.log(`✅ Found ${targetSectionIds.length} sub-sections to include.`);

            // --- 2. FETCH ALL CASES IN THE SUITE (PAGINATED) ---
            let allCases = [];
            let offset = 0;
            const limit = 250;
            let hasMore = true;

            while (hasMore) {
                console.log(`📡 Fetching cases ${offset} to ${offset + limit}...`);
                const response = await axios.get(
                    `${TR_URL}/index.php?/api/v2/get_cases/${PROJECT_ID}&suite_id=${SUITE_ID}&limit=${limit}&offset=${offset}`,
                    { headers }
                );

                const cases = response.data.cases;
                // ONLY keep cases that belong to our target section or its children
                const filtered = cases.filter(c => targetSectionIds.includes(c.section_id));
                allCases = allCases.concat(filtered);

                if (cases.length < limit) {
                    hasMore = false;
                } else {
                    offset += limit;
                }
            }

            console.log(`✅ Success! Found ${allCases.length} relevant cases across the hierarchy.`);

            // --- 3. CALCULATE STATS ---
            const stats = {
                total: allCases.length,
                automated: allCases.filter(c => c.custom_case_automation_status === 1).length,
                not_automatable: allCases.filter(c => c.custom_case_automation_status === 2).length,
                automation_in_progress: allCases.filter(c => c.custom_case_automation_status === 3).length,
                yet_to_automate: allCases.filter(c => c.custom_case_automation_status === 4).length,
                lastUpdated: new Date().toLocaleString('en-US', { 
                    month: 'numeric', day: 'numeric', year: 'numeric', 
                    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true 
                })
            };

            // --- 4. SAVE FILE ---
            fs.writeFileSync('./testrail-stats.json', JSON.stringify(stats, null, 2));
            console.log('💾 File saved: testrail-stats.json is ready.');

        } catch (err) {
            console.error('❌ Sync Error:', err.response ? err.response.data : err.message);
        }
        // 1. Setup paths
        const dataFile = path.join(__dirname, 'data', `drift-analytics-${new Date().toISOString().slice(0, 7)}.json`);

        // 2. Logic to extract 'current' data from Allure results (Simplified)
        const latestResults = JSON.parse(fs.readFileSync('./allure-results/latest-run.json', 'utf8'));

        // 3. Create the object
        const newEntry = {
            run_date: new Date().toISOString(),
            student_file: latestResults.fileName,
            baseline: {
                instruction: latestResults.baselineInstruction,
                total_score: latestResults.baselineScore,
                criterion_feedback: latestResults.baselineFeedback
            },
            current: {
                instruction: latestResults.currentInstruction,
                total_score: latestResults.currentScore,
                criterion_feedback: latestResults.currentFeedback
            },
            drift: {
                sbert_similarity: calculateSBERT(latestResults.baselineFeedback, latestResults.currentFeedback), 
                score_delta: latestResults.currentScore - latestResults.baselineScore
            }
        };

            // 4. Save to the monthly JSON
            let history = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];
            history.push(newEntry);
            fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
            }

    getRealStats();*/
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');
    require('dotenv').config();

    // YOUR TESTRAIL INFO
    const TR_URL = process.env.TR_URL;
    const TR_USER = process.env.TR_USER;
    const TR_KEY = process.env.TR_KEY;  
    //const PROJECT_ID =  process.env.PROJECT_ID;
    const PROJECT_ID =  '10';
    //const SUITE_ID = process.env.SUITE_ID;
    const SUITE_ID = '220';
    //const PARENT_SECTION_ID = Number(process.env.PARENT_SECTION_ID);
    const PARENT_SECTION_ID = 7288;



    // --- Helper for SBERT ---
    function calculateSBERT(str1, str2) {
        if (!str1 || !str2) return 0;
        return str1 === str2 ? 1.0 : 0.85; 
    }

    async function getRealStats() {
        const auth = Buffer.from(`${TR_USER}:${TR_KEY}`).toString('base64');
        const headers = { 'Authorization': `Basic ${auth}` };

        console.log('🚀 Starting deep sync with TestRail...');

        try {
            // --- 1. TESTRAIL SYNC (Using your original working URLs) ---
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

            // --- 2. DRIFT ANALYTICS CONSOLIDATION ---
            const allurePath = './allure-results/latest-run.json';
            if (!fs.existsSync(allurePath)) {
                console.warn('⚠️ No latest-run.json found. Skipping drift update.');
                return;
            }

            const latestResults = JSON.parse(fs.readFileSync(allurePath, 'utf8'));
            const dataDir = path.join(__dirname, 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            
            const dataFile = path.join(dataDir, `drift-analytics-${new Date().toISOString().slice(0, 7)}.json`);

            const newEntry = {
                // run_date: new Date().toISOString(),
                run_date: latestResults.run_date || new Date().toISOString(),
                    student_file: latestResults.student_file || "unknown",
                    baseline: {
                        instruction: latestResults.baseline?.instruction || "N/A",
                        total_score: latestResults.baseline?.total_score || 0,
                        criterion_feedback: latestResults.baseline?.criterion_feedback || "N/A"
                    },
                    current: {
                        instruction: latestResults.current?.instruction || "N/A",
                        total_score: latestResults.current?.total_score || 0,
                        criterion_feedback: latestResults.current?.criterion_feedback || "N/A"
                    },
                    drift: {
                        sbert_similarity: latestResults.drift?.sbert_similarity || 0, 
                        score_delta: (latestResults.current?.total_score || 0) - (latestResults.baseline?.total_score || 0)
                    }
                };

            let history = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];
            history.push(newEntry);
            fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
            console.log(`✅ Consolidated data saved to ${path.basename(dataFile)}`);

        } catch (err) {
            console.error('❌ Sync Error:', err.response ? err.response.data : err.message);
        }
    }

    getRealStats();