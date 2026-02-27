const axios = require('axios');
const fs = require('fs');

// YOUR TESTRAIL INFO
const TR_URL = 'https://apporto.testrail.io/'; 
const TR_USER = 't.Pavuluri@apporto.com'; 
const TR_KEY = 'CmsaN/0JEAFPUS/uvenl-X/lQGgxLM.yDpAMFl9me'; 
const PROJECT_ID = '10'; // 

async function getRealStats() {
   const auth = Buffer.from(`${TR_USER}:${TR_KEY}`).toString('base64');
    let allCases = [];
    let offset = 0;
    const limit = 250; // TestRail's maximum per page
    let hasMore = true;

    console.log('🚀 Starting sync with TestRail...');

    try {
        while (hasMore) {
            console.log(`📡 Fetching cases ${offset} to ${offset + limit}...`);
            
            /*const response = await axios.get(
                `${TR_URL}/index.php?/api/v2/get_cases/${PROJECT_ID}&limit=${limit}&offset=${offset}`, 
                { headers: { 'Authorization': `Basic ${auth}` } }
            );*/
            const response = await axios.get(
                `${TR_URL}/index.php?/api/v2/get_cases/${PROJECT_ID}&suite_id=220&section_id=6693&limit=${limit}&offset=${offset}`, 
                { headers: { 'Authorization': `Basic ${auth}` } }
            );

            const cases = response.data.cases;
            allCases = allCases.concat(cases);

            // Check if there are more pages based on response size
            if (cases.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }

        console.log(`✅ Success! Found ${allCases.length} total cases.`);

        // --- 2. CALCULATE STATS ---
        // Mapping IDs based on your screenshot (Automated=1, Not Automatable=2, etc.)
        const stats = {
            total: allCases.length,
            automated: allCases.filter(c => c.custom_case_automation_status === 1).length,
            not_automatable: allCases.filter(c => c.custom_case_automation_status === 2).length,
            automation_in_progress: allCases.filter(c => c.custom_case_automation_status === 3).length,
            yet_to_automate: allCases.filter(c => c.custom_case_automation_status === 4).length,
            lastUpdated: new Date().toLocaleString()
        };

        // --- 3. SAVE FILE ---
        fs.writeFileSync('./testrail-stats.json', JSON.stringify(stats, null, 2));
        console.log('💾 File saved: testrail-stats.json is ready for upload.');

    } catch (err) {
        console.error('❌ Sync Error:', err.response ? err.response.data : err.message);
    }
    console.log('Raw case object keys:', Object.keys(allCases[0]));
    console.log('Full raw case:', JSON.stringify(allCases[0], null, 2));
    console.log('Status breakdown:', {
    null_or_empty: allCases.filter(c => !c.custom_case_automation_status).length,
    automated: allCases.filter(c => c.custom_case_automation_status === 1).length,
    not_automatable: allCases.filter(c => c.custom_case_automation_status === 2).length,
    in_progress: allCases.filter(c => c.custom_case_automation_status === 3).length,
    yet_to_automate: allCases.filter(c => c.custom_case_automation_status === 4).length,
});
   console.log('Sample Data from TestRail:', allCases.slice(0, 5).map(c => c.custom_case_automation_status));

}

getRealStats();