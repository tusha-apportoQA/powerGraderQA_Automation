const fs = require('fs');
const path = require('path');

const resultsDir = './allure-results';
const statsFile = './testrail-stats.json';

try {
    if (!fs.existsSync(resultsDir)) {
        console.log('No allure-results found, skipping reliability calculation.');
        process.exit(0);
    }

    const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('-result.json'));
    const automatedResults = files.map(f => JSON.parse(fs.readFileSync(path.join(resultsDir, f))));

    // Filter for your specific PowerGrader automated tests
    /*const pgTests = automatedResults.filter(r => 
        r.name.includes('Short') || r.name.includes('Long')
    );*/

    const pgTests = automatedResults.filter(r => 
        r.name.includes('Short') || 
        r.name.includes('Long') || 
        r.name.includes('D2L')
    );
    
    const passed = pgTests.filter(r => r.status === 'passed').length;
    const total = pgTests.length;

    // Calculate reliability percentage
    const reliability = total > 0 ? Math.round((passed / total) * 100) : 100;

    // Update the stats file that the dashboard reads
    const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    stats.aiReliability = reliability;
    
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
    console.log(`✅ AI Reliability calculated: ${reliability}% based on ${total} tests.`);
} catch (error) {
    console.error('Error updating reliability stats:', error.message);
}