const axios = require('axios');
const fs = require('fs');

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
}

getRealStats();