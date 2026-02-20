const { execSync } = require('child_process');

const suite = process.argv[2];

const testCmds = {
  'canvas': 'npx playwright test e2e/features/canvas',
  'canvas-quick': 'npx playwright test e2e/features/canvas --grep "Short Accurate"',
  'd2l': 'npx playwright test e2e/features/d2l',
};

const testCmd = testCmds[suite] || 'npm run test';

try {
  execSync(testCmd, { stdio: 'inherit' });
} catch {
  console.log('Some tests failed - continuing to deploy...');
}

try {
  execSync('npm run deploy-hub', { stdio: 'inherit' });
} catch {
  console.log('Deploy failed - check wrangler logs above');
}