import { chromium, FullConfig } from '@playwright/test';
import E2ETestHelpers from './helpers';
import testUsers from './test_users';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch({ headless: false });
  const helper = new E2ETestHelpers(baseURL || '', browser);
  const pages = await Promise.all(testUsers.map(() => browser.newPage()));

  try {
    await Promise.all(
      pages.map((page, index) => {
        const user = testUsers[index];
        console.log(`Authenticating Canvas ${user.role} user: ${user.username}`);
        return helper.checkAndAuthenticateCanvasUser(user, page);
      })
    );
    console.log('Canvas authentication completed. Storage states saved.');
  } catch (error) {
    console.log('Global setup failed', error);
    throw error;
  } finally {
    await Promise.all(pages.map((page) => page.close()));
    await browser.close();
  }
}

export default globalSetup;
