const fs = require('fs');
const path = require('path');

const resultsDir = './allure-results';
const statsFile = './agile-stats.json';

try {
    if (!fs.existsSync(resultsDir)) {
        console.log('No allure-results found, skipping reliability calculation.');
        process.exit(0);
    }

    const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('-result.json'));
    const automatedResults = files.map(f => JSON.parse(fs.readFileSync(path.join(resultsDir, f))));

    const pgTests = automatedResults.filter(r => 
        r.name.includes('Short') || 
        r.name.includes('Long') || 
        r.name.includes('D2L')
    );
    
    const passed = pgTests.filter(r => r.status === 'passed').length;
    const totalRuns = pgTests.length;

    // 1. Calculate reliability percentage
    const reliability = totalRuns > 0 ? Math.round((passed / totalRuns) * 100) : 100;

    // 2. Load existing stats to update coverage
    const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));

    // 🎯 NEW: Deduce 'Not Automatable' from Total to fix Coverage %
    /*const totalCases = stats.totalCases || 155; //
    const automatedCount = stats.automated || 22; //
    const notAutomatable = stats.notAutomatable || 40; */

    const totalCases = stats.total || 0;
    const automatedCount = stats.automated || 0;
    const notAutomatable = stats.not_automatable || 0;

    // Calculate effective coverage: Automated / (Total - Not Automatable)
    const automatableTotal = totalCases - notAutomatable;
    const adjustedCoverage = ((automatedCount / automatableTotal) * 100).toFixed(1);

    // Update stats object
    stats.aiReliability = reliability;
    stats.coveragePercent = `${adjustedCoverage}%`;
    
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));

    console.log(`✅ AI Reliability: ${reliability}% (${totalRuns} runs)`);
    console.log(`✅ Adjusted Coverage: ${adjustedCoverage}% (Excluding ${notAutomatable} non-automatable cases)`);

} catch (error) {
    console.error('Error updating stats:', error.message);
}