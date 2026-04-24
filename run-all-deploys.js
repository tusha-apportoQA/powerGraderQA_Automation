const { execSync } = require('child_process');

const suites = ['canvas', 'd2l', 'moodle'];

suites.forEach((suite, index) => {
    const isFirst = index === 0;
    console.log(`\n🚀 Starting ${suite.toUpperCase()} deploy...\n`);
    try {
        execSync(`node full-deploy.js ${suite}`, { 
            stdio: 'inherit',
            env: { ...process.env, FIRST_RUN: String(isFirst) }
        });
    } catch (e) {
        console.log(`⚠️ ${suite} completed with failures. Continuing...`);
    }
});

console.log('\n✅ All LMS deploys complete.');