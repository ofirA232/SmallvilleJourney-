import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', error => console.error(error));
  await page.clock.install({time:new Date('2026-09-01T00:00:00Z')});
  const actor=process.argv[2]??'clark';
  const directory=actor==='clark'?'docs/model-review':`docs/${actor}-review`;
  await page.goto(`http://127.0.0.1:5187/model-review.html?actor=${actor}`);
  await page.locator('#status').filter({ hasText: 'Loaded' }).waitFor({ timeout: 90000 });
  await page.clock.pauseAt(new Date('2026-09-01T01:00:00Z'));
  await page.screenshot({ path: `${directory}/front.png` });
  await page.locator('#back').click();
  await page.clock.runFor(34);
  await page.screenshot({ path: `${directory}/back.png` });
  await page.locator('#front').click();
  await page.clock.runFor(34);
  for (const motion of ['Walk', 'Run', 'Strength', 'Restrained']) {
    await page.locator(`[data-motion="${motion}"]`).click();
    await page.clock.runFor(250);
    await page.screenshot({ path: `${directory}/${motion.toLowerCase()}.png` });
  }
  console.log('Model loaded; front and back captured.');
} finally { await browser.close(); }
