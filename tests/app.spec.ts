import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { privateKeyToAccount } from 'viem/accounts';

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
}
async function openMission(page: Page, title: string) {
  const article = page
    .locator('.mission-card')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await article.getByRole('button', { name: `View mission: ${title}` }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('the public website works on desktop and mobile with keyboard navigation and reduced motion', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: 'Make your mark.' })).toBeVisible();
  await expect(page.locator('.hero-copy')).toHaveCSS('opacity', '1');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('h1 .line-content')].every(
      (element) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42) < 0.5,
    ),
  );
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByRole('button', { name: 'Pause background animation' }).click();
  await expect(page.getByRole('button', { name: 'Play background animation' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await noOverflow(page);
  const journey = page.getByRole('group', { name: 'Explore the contribution journey' });
  await journey.getByRole('button', { name: 'Share the evidence', exact: false }).click();
  await expect(page.locator('.ledger-device')).toContainText('Evidence received');
  await expect(
    journey.getByRole('button', { name: 'Share the evidence', exact: false }),
  ).toHaveAttribute('aria-pressed', 'true');
  await journey.getByRole('button', { name: 'Follow the decision', exact: false }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.ledger-device')).toContainText('Contribution approved');
  await expect(page.locator('.ledger-device')).toContainText('Your contribution journey');
  await journey.getByRole('button', { name: 'Choose your mission', exact: false }).click();
  await expect(page.locator('.ledger-device')).toContainText('Ready to contribute');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: '.local/captures/landing-desktop.png' });
  await page.screenshot({ path: '.local/captures/landing-desktop-full.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('link', { name: 'Questions', exact: true }).click();
  await page.locator('summary').filter({ hasText: 'Do I need to connect a wallet?' }).click();
  await expect(
    page.getByText('You can explore the mission board freely.', {
      exact: false,
    }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await noOverflow(page);
  await page.screenshot({ path: '.local/captures/landing-mobile.png' });
  await page.screenshot({ path: '.local/captures/landing-mobile-full.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.motes')).toBeHidden();
  for (const backdrop of await page.locator('.section-backdrop').all())
    await expect(backdrop).toHaveCSS('transform', 'none');
  expect(errors).toEqual([]);
});

test('contribution paths support keyboard selection and open the matching mission category', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [label, category] of [
    ['Tell the story.', 'Content'],
    ['Open the door.', 'Community'],
    ['Make it better.', 'Testing'],
  ]) {
    await page.goto('/');
    await page.getByRole('tab').filter({ hasText: label }).click();
    await expect(page.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      `atlas-tab-${category}`,
    );
    await page.getByRole('link', { name: `Explore ${category.toLowerCase()} missions` }).click();
    await expect(
      page
        .getByRole('group', { name: 'Filter by category' })
        .getByRole('button', { name: category, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.mission-card').first().waitFor();
    const missionCategories = await page
      .locator('.mission-card .mission-category')
      .allTextContents();
    expect(missionCategories.length).toBeGreaterThan(0);
    expect(missionCategories.every((value) => value.trim() === category)).toBe(true);
  }
  await page.goto('/');
  await page.getByRole('tab').filter({ hasText: 'Tell the story.' }).focus();
  await page.keyboard.press('ArrowDown');
  const community = page.getByRole('tab').filter({ hasText: 'Open the door.' });
  await expect(community).toBeFocused();
  await expect(community).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab').filter({ hasText: 'Make it better.' })).toBeFocused();
});

async function wallet(page: Page, key = '2') {
  const account = privateKeyToAccount(('0x' + key.repeat(64)) as `0x${string}`);
  await page.exposeFunction('orderTestWallet', async (method: string, params: unknown[]) => {
    if (method === 'eth_requestAccounts') return [account.address];
    if (method === 'eth_chainId') return '0x1';
    if (method === 'personal_sign') {
      const hex = params[0] as string;
      const message = Buffer.from(hex.slice(2), 'hex').toString('utf8');
      return account.signMessage({ message });
    }
    throw new Error('Unexpected wallet method ' + method);
  });
  await page.addInitScript(() => {
    const provider = {
      request: ({ method, params = [] }: { method: string; params?: unknown[] }) =>
        (
          window as unknown as {
            orderTestWallet: (method: string, params: unknown[]) => Promise<unknown>;
          }
        ).orderTestWallet(method, params),
    };
    const announce = () =>
      window.dispatchEvent(
        new CustomEvent('eip6963:announceProvider', {
          detail: {
            info: { uuid: 'test-wallet', name: 'Test wallet', rdns: 'test.fixture' },
            provider,
          },
        }),
      );
    window.addEventListener('eip6963:requestProvider', announce);
  });
  return account;
}
async function signIn(page: Page, key = '2') {
  const account = await wallet(page, key);
  await page.goto('/#/app/profile');
  await page.getByRole('button', { name: 'Continue with Test wallet' }).click();
  await expect(page.getByRole('heading', { name: 'Wallet authenticated' })).toBeVisible();
  return account;
}
async function linkFixtureX(page: Page, id: string) {
  const session = await (await page.request.get('/api/session')).json();
  const start = await page.request.post('/api/auth/x/start', {
    headers: { Origin: 'http://127.0.0.1:5180', 'X-CSRF-Token': session.csrf },
    data: {},
  });
  expect(start.ok()).toBe(true);
  const url = new URL((await start.json()).url);
  const callback = await page.request.get(
    '/api/auth/x/callback?state=' + url.searchParams.get('state') + '&code=' + id,
    { maxRedirects: 0 },
  );
  expect(callback.status()).toBe(302);
  expect(callback.headers().location).toContain('success');
  await page.reload();
  await expect(page.locator('.membership-badge')).toHaveText('Ready to contribute');
}
test('guest access is read only; profile connections and Keeper access are required', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/app');
  await page.locator('.mission-card').first().waitFor();
  await openMission(page, 'Share the vision of the Order');
  await expect(
    page.getByRole('heading', { name: 'Connect your accounts to contribute' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit evidence', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.goto('/#/app/keepers');
  await expect(page.getByRole('heading', { name: 'Keeper access required' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create mission' })).toHaveCount(0);
  await page.goto('/#/app/profile');
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).last().click();
  await expect(page.getByRole('alert')).toContainText('No wallet was detected');
  await page.setViewportSize({ width: 360, height: 844 });
  await noOverflow(page);
  await page.screenshot({ path: '.local/captures/profile-guest-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('a real wallet signature creates a persistent profile; wallet alone cannot submit a mission', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const account = await signIn(page, '2');
  await expect(page.locator('.wallet-address')).toContainText(account.address);
  await expect(page.locator('.membership-badge')).toHaveText('Complete your profile');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wallet authenticated' })).toBeVisible();
  await page.getByLabel('Display name').fill('');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Enter a display name of 1 to 40 characters.',
  );
  await page.getByLabel('Display name').fill('Connected Member');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();
  await page.goto('/#/app');
  await openMission(page, 'Share the vision of the Order');
  await expect(
    page.getByRole('heading', { name: 'Connect your accounts to contribute' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.goto('/#/app/profile');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your place in the Order' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('wallet plus X enables server evidence, authorized reviews, points and persistence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await signIn(page, '1');
  await linkFixtureX(page, '2002');
  await page.getByRole('link', { name: /^Keepers\b/ }).click();
  await page.getByRole('button', { name: 'Create mission' }).click();
  const title = 'Server-reviewed contribution';
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page
    .getByLabel('Description', { exact: true })
    .fill('Share an original contribution with clear evidence for the community.');
  await page.getByLabel('Points', { exact: true }).fill('175');
  await page
    .getByLabel('Requirements', { exact: true })
    .fill('Publish an original contribution.\nSubmit a link with a useful explanation.');
  await page.getByRole('button', { name: 'Publish mission' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('link', { name: 'Missions', exact: true }).click();
  await openMission(page, title);
  await page.getByLabel('Public link').fill('https://example.com/server-contribution');
  await page
    .getByLabel('Tell us what you did')
    .fill('I published an original contribution explaining a practical improvement.');
  await page.getByRole('button', { name: 'Submit evidence', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.stats-grid')).toContainText('0pts');
  await page.getByRole('link', { name: /^Keepers\b/ }).click();
  await page.getByRole('button', { name: 'Review submission', exact: true }).click();
  await page
    .getByLabel('Reason for the decision')
    .fill('The work is original and meets every requirement.');
  await page.getByRole('button', { name: 'Record decision' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('link', { name: 'My journey', exact: true }).click();
  await expect(page.locator('.stats-grid')).toContainText('175pts');
  await page.reload();
  await expect(page.locator('.stats-grid')).toContainText('175pts');
  await expect(page.locator('.history-list')).toContainText('Verified');
  await page.goto('/#/app/profile');
  await expect(page.locator('.membership-badge')).toHaveText('Ready to contribute');
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('.route-content')!).opacity === '1',
  );
  await page.screenshot({ path: '.local/captures/profile-connected-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});
test('previous browser records are preserved but cannot inject points into an authenticated profile', async ({
  page,
}) => {
  const previous = JSON.stringify({
    version: 1,
    profile: 'Old local profile',
    missions: [],
    submissions: [{ status: 'verified', points: 99999 }],
  });
  await page.addInitScript((raw) => localStorage.setItem('order-of-steering:v1', raw), previous);
  await page.goto('/#/app');
  await page.locator('.mission-card').first().waitFor();
  await expect(page.locator('.stats-grid')).toContainText('0pts');
  await page.goto('/#/app/settings');
  await expect(page.getByRole('heading', { name: 'Browser archive' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export browser archive' }).click();
  expect((await download).suggestedFilename()).toBe('order-browser-archive.json');
  expect(await page.evaluate(() => localStorage.getItem('order-of-steering:v1'))).toBe(previous);
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('.mission-app')).toHaveAttribute('data-theme', 'light');
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({ path: '.local/captures/settings-light-mobile.png', fullPage: true });
});
