import { expect, test, type Page } from '@playwright/test';

const SETTINGS = 'smallville-settings-v1';
const root = (page: Page) => page.locator('html');
async function open(page: Page) {
  await page.goto('/?quality=low'); await page.locator('#loading').waitFor({ state: 'hidden', timeout: 60000 });
}
async function press(page: Page, selector: string, mobile: boolean) {
  if (mobile) await page.locator(selector).tap(); else await page.locator(selector).click();
}

test('the language button on the title switches to Hebrew and back, right to left', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const mobile = info.project.name === 'mobile';
  await open(page);
  await expect(root(page)).toHaveAttribute('lang', 'en'); await expect(root(page)).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#begin-button')).toContainText('Begin your journey');
  // The button names the other language in its own script.
  await expect(page.locator('#language-button')).toHaveText('עב');
  await press(page, '#language-button', mobile);
  await expect(root(page)).toHaveAttribute('lang', 'he', { timeout: 30000 }); await expect(root(page)).toHaveAttribute('dir', 'rtl');
  await page.locator('#loading').waitFor({ state: 'hidden', timeout: 60000 });
  await expect(page.locator('#begin-button')).toContainText('התחל את המסע');
  await expect(page.locator('.landing h1')).toContainText('כל אגדה');
  await expect(page.locator('.world-label[data-location="farm"]')).toContainText('חוות קנט');
  await expect(page).toHaveTitle(/סמולוויל/);
  // In Hebrew the landing text sits on the right-hand side of the screen.
  const landing = (await page.locator('#landing').boundingBox())!, width = page.viewportSize()!.width;
  if (!mobile) expect(landing.x + landing.width / 2).toBeGreaterThan(width / 2);
  await expect(page.locator('#language-button')).toHaveText('EN');
  await press(page, '#language-button', mobile);
  await expect(root(page)).toHaveAttribute('lang', 'en', { timeout: 30000 });
  await page.locator('#loading').waitFor({ state: 'hidden', timeout: 60000 });
  await expect(page.locator('#begin-button')).toContainText('Begin your journey');
  expect(errors).toEqual([]);
});

test('a Hebrew game: the story, the objective and a conversation are all in Hebrew', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const mobile = info.project.name === 'mobile';
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ sound: false, reducedMotion: false, quality: 'low', language: 'he' })), SETTINGS);
  await open(page);
  await press(page, '#begin-button', mobile);
  await expect(page.locator('#intro-title')).toHaveText('היום שבו השמיים נפלו.');
  await press(page, '#skip-intro', mobile);
  await expect(page.locator('#objective-title')).toHaveText('מקום לקרוא לו בית');
  await expect(page.locator('#chapter-number')).toContainText('מערכה 01');
  await press(page, '#track-button', mobile);
  const nearby = async () => JSON.parse((await page.locator('#telemetry').textContent())!).nearby;
  await expect.poll(nearby, { timeout: 60000 }).toBe(true);
  await expect(page.locator('#interact-label')).toHaveText('דבר עם ג׳ונתן');
  await press(page, '#interact-button', mobile);
  await expect(page.locator('#speaker')).toHaveText('ג׳ונתן קנט');
  await expect(page.locator('#dialogue-text')).toHaveText('בוקר טוב, קלארק. הגדר יכולה לחכות. האוטובוס של בית הספר לא יחכה.');
  await expect(page.locator('#dialogue-next')).toContainText('המשך');
  expect(errors).toEqual([]);
});

test('settings switch the language, and a Hebrew browser starts in Hebrew', async ({ browser, page }, info) => {
  const mobile = info.project.name === 'mobile';
  await open(page);
  await press(page, '#settings-button', mobile);
  await page.locator('#language-setting').selectOption('he');
  await expect(root(page)).toHaveAttribute('lang', 'he', { timeout: 30000 });
  await page.locator('#loading').waitFor({ state: 'hidden', timeout: 60000 });
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), SETTINGS))!).language).toBe('he');
  // A first visit from a browser set to Hebrew needs no choice at all.
  const context = await browser.newContext({ locale: 'he-IL', viewport: page.viewportSize()! });
  const hebrew = await context.newPage();
  await open(hebrew);
  await expect(root(hebrew)).toHaveAttribute('dir', 'rtl');
  await expect(hebrew.locator('#begin-button')).toContainText('התחל את המסע');
  await context.close();
});
