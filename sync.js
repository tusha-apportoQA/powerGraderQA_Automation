            /*const axios = require('axios');
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
                /* const allurePath = './allure-results/latest-run.json';
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

                    /*const newEntry = {
                        run_date: new Date().toISOString(),
                        student_file: latest.student_file,
                        sbert_similarity: latest.drift.sbert_similarity, // 🔥 Fixed for Graph
                        baseline: latest.baseline, // 🔥 Fixed for Modal
                        current: latest.current    // 🔥 Fixed for Modal
                    };*/

                    // --- 2. DRIFT ANALYTICS CONSOLIDATION (Process ALL results) ---
                    /*const resultsDir = './allure-results';
                    const dataDir = path.join(__dirname, 'data');
                    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
                    const dataFile = path.join(dataDir, `drift-analytics-${new Date().toISOString().slice(0, 7)}.json`);
                    let history = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];

                    // 🎯 NEW: Find all files named 'latest-run-*.json' to avoid missing data from parallel/sequential runs
                    const resultFiles = fs.readdirSync(resultsDir).filter(f => f.startsWith('latest-run') && f.endsWith('.json'));

                    if (resultFiles.length === 0) {
                        console.warn('⚠️ No latest-run JSON files found in allure-results.');
                        return;
                    }

                    resultFiles.forEach(file => {
                        const latest = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
                        
                        const sbertValue = (latest.drift && latest.drift.sbert_similarity !== undefined) 
                            ? latest.drift.sbert_similarity 
                            : (latest.sbertSimilarity ?? 0);

                        const newEntry = {
                            run_date: latest.run_date || new Date().toISOString(),
                            student_file: latest.student_file || latest.uniqueTitle || "Unknown File",
                            sbert_similarity: sbertValue,
                            baseline: latest.baseline || {},
                            current: latest.current || {}
                        };

                        // Only add if this specific run (by timestamp) isn't already in history
                        if (!history.find(h => h.run_date === newEntry.run_date)) {
                            history.push(newEntry);
                            console.log(`✅ Added to history: ${newEntry.student_file}`);
                        }
                    });

                    // 🎯 FIX: Added defensive checks so the sync doesn't fail if drift is missing
                    /*const sbertValue = (latest.drift && latest.drift.sbert_similarity !== undefined) 
                        ? latest.drift.sbert_similarity 
                        : (latest.sbertSimilarity ?? 0);

                    const newEntry = {
                        run_date: latest.run_date || new Date().toISOString(),
                        student_file: latest.student_file || latest.uniqueTitle || "Unknown File",
                        sbert_similarity: sbertValue, // Ensures Graph line always draws
                        baseline: latest.baseline || {}, // Ensures Modal Base Score populates
                        current: latest.current || {}    // Ensures Modal Curr Score populates
                    };

                    const MAX_HISTORY = 50; 


                    let history = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];
                    console.log(`\n📊 [SYNC CHECK] Student File: ${latest.student_file}`);
                    //console.log(`📊 [SYNC CHECK] SBERT Similarity: ${(latest.drift?.sbert_similarity * 100).toFixed(1)}%`);
                    console.log(`📊 [SYNC CHECK] SBERT Similarity: ${(sbertValue * 100).toFixed(1)}%`);

                // const currentFeedback = newEntry.current?.criteria?.[0]?.feedback;
                const currentFeedback = newEntry.current?.criteria?.[0]?.feedback || newEntry.current?.criterion_feedback;*/
                    
                /* if (currentFeedback && currentFeedback !== 'N/A') {
                        console.log(`✅ [SYNC SUCCESS] Found feedback for modal: "${currentFeedback.substring(0, 50)}..."`);
                    } else {
                        console.log(`⚠️ [SYNC WARNING] No feedback found in latest-run.json for the Deep-Dive modal.`);
                    }
                    // 🎯 Set your retention limit (e.g., last 50 runs or last 30 days)
                    
                    history.push(newEntry);
                    // 🎯 Keep only the most recent entries
                    if (history.length > MAX_HISTORY) {
                        history = history.slice(-MAX_HISTORY);
                    }
                    fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
                    console.log(`✅ Consolidated data saved to ${path.basename(dataFile)} with Graph compatibility.`);

                } catch (err) {
                    console.error('❌ Sync Error:', err.response ? err.response.data : err.message);
                }
            }

            getRealStats();*/

            // --- 2. DRIFT ANALYTICS CONSOLIDATION (Process ALL results) ---
                /*   const resultsDir = './allure-results';
                    const dataDir = path.join(__dirname, 'data');
                    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
                    
                    const dataFile = path.join(dataDir, `drift-analytics-${new Date().toISOString().slice(0, 7)}.json`);
                    let history = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile)) : [];

                    // Find all unique latest-run files
                    const resultFiles = fs.readdirSync(resultsDir).filter(f => f.startsWith('latest-run') && f.endsWith('.json'));

                    if (resultFiles.length === 0) {
                        console.warn('⚠️ No latest-run JSON files found in allure-results.');
                        return;
                    }

                    resultFiles.forEach(file => {
                        try {
                            const latest = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
                            
                            const sbertValue = (latest.drift && latest.drift.sbert_similarity !== undefined) 
                                ? latest.drift.sbert_similarity 
                                : (latest.sbertSimilarity ?? 0);

                            const newEntry = {
                                run_date: latest.run_date || new Date().toISOString(),
                                student_file: latest.student_file || latest.uniqueTitle || "Unknown File",
                                sbert_similarity: sbertValue,
                                baseline: latest.baseline || {},
                                current: latest.current || {}
                            };

                            // Only add if this specific run (by timestamp) isn't already in history
                            if (!history.find(h => h.run_date === newEntry.run_date)) {
                                history.push(newEntry);
                                console.log(`✅ Added to history: ${newEntry.student_file} (Similarity: ${(sbertValue * 100).toFixed(1)}%)`);
                            }
                        } catch (e) {
                            console.error(`❌ Error processing ${file}:`, e.message);
                        }
                    });

                    // --- 3. SAVE & TRUNCATE HISTORY ---
                    const MAX_HISTORY = 100; 
                    if (history.length > MAX_HISTORY) {
                        history = history.slice(-MAX_HISTORY);
                    }

                    fs.writeFileSync(dataFile, JSON.stringify(history, null, 2));
                    console.log(`✅ Consolidated data saved to ${path.basename(dataFile)}.`);

                } catch (err) {
                    console.error('❌ Sync Error:', err.response ? err.response.data : err.message);
                }
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
                        //allCases = allCases.concat(cases);
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

                            const hasValidBaseline = latest.baseline && 
                                                    (latest.baseline.instruction !== "N/A" || 
                                                    latest.baseline.criteria?.length > 0);

                            //if (!hasValidBaseline) {
                            // console.log(`skipping ${file} - No baseline rubric found.`);
                            // return; // Skip this iteration
                        // }
                            
                            const sbertValue = (latest.drift && latest.drift.sbert_similarity !== undefined) 
                                ? latest.drift.sbert_similarity 
                                : (latest.sbertSimilarity ?? 0);

                            /*const newEntry = {
                            // run_date: latest.run_date || new Date().toISOString(),
                                run_date: latest.run_date || new Date().toLocaleString(),
                                student_file: latest.student_file || latest.uniqueTitle || "Unknown File",
                                sbert_similarity: sbertValue,
                                baseline: latest.baseline || {},
                                current: latest.current || {}
                            };*/

                            const newEntry = {
                                run_date: latest.run_date || new Date().toISOString(),
                                lms: latest.lms || "Canvas", // 👈 ADD THIS LINE
                                student_file: latest.student_file || latest.uniqueTitle || "Unknown File",
                                sbert_similarity: sbertValue,
                                // 🎯 ADD THE DRIFT OBJECT FOR THE DASHBOARD
                                drift: latest.drift || { 
                                    sbert_similarity: sbertValue, 
                                    score_delta: (latest.current?.total_score || 0) - (latest.baseline?.total_score || 0) 
                                },
                                baseline: latest.baseline || {},
                                current: latest.current || {}
                            };

                            /*const baseName = newEntry.student_file.replace(/\s*\[\d+\]\s*$/, "").trim();
                            const existingIndex = history.findIndex(h => 
                                h.student_file.replace(/\s*\[\d+\]\s*$/, "").trim() === baseName &&
                                h.run_date === newEntry.run_date
                            );

                            if (existingIndex === -1) {
                        // if (!history.find(h => h.run_date === newEntry.run_date)) {
                        //if (!history.find(h => h.run_date === newEntry.run_date && h.student_file === newEntry.student_file)) {
                                history.push(newEntry);
                                console.log(`✅ Added to history: ${newEntry.student_file} (Similarity: ${(sbertValue * 100).toFixed(1)}%)`);
                            } else{
                                console.log(`⏭️ Skipped duplicate: ${newEntry.student_file}`);
                            }*/
                            const baseName = newEntry.student_file.replace(/\s*\[\d+\]\s*$/, "").trim();
                            const existingHistoryIndex = history.findIndex(h =>
                                h.student_file.replace(/\s*\[\d+\]\s*$/, "").trim() === baseName
                            );

                           /* if (existingHistoryIndex === -1) {
                                history.push(newEntry);
                                console.log(`✅ Added: ${newEntry.student_file} (Similarity: ${(sbertValue * 100).toFixed(1)}%)`);
                            } else if (new Date(newEntry.run_date) > new Date(history[existingHistoryIndex].run_date)) {
                                history[existingHistoryIndex] = newEntry;
                                console.log(`🔄 Updated: ${newEntry.student_file} (Similarity: ${(sbertValue * 100).toFixed(1)}%)`);
                            } else {
                                console.log(`⏭️ Skipped older entry: ${newEntry.student_file}`);
                            }*/
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

            getRealStats();