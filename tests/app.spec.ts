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
  for (const [label, pathCategory, category] of [
    ['Tell the story.', 'Content', 'Content'],
    ['Open the door.', 'Community', 'Community'],
    ['Make it better.', 'Testing', 'All'],
  ]) {
    await page.goto('/');
    await page.getByRole('tab').filter({ hasText: label }).click();
    await expect(page.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      `atlas-tab-${pathCategory}`,
    );
    await page
      .getByRole('link', {
        name:
          category === 'All' ? 'Explore missions' : `Explore ${category.toLowerCase()} missions`,
        exact: true,
      })
      .click();
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
    if (category !== 'All')
      expect(missionCategories.every((value) => value.trim() === category)).toBe(true);
  }
  await page.goto('/#/app?category=Testing');
  const filters = page.getByRole('group', { name: 'Filter by category' });
  await expect(filters.getByRole('button', { name: 'All', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(filters.getByRole('button')).toHaveText(['All', 'Content', 'Community']);
  await expect(page.locator('.route-content')).toHaveCSS('opacity', '1');
  await filters.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/captures/mission-filters-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await filters.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/captures/mission-filters-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 960 });
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
  // Hash navigation may keep the old document; reload to install the wallet fixture.
  await page.reload();
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
test('X name, handle and photo appear across the app, persist on reload and recover from an unavailable image', async ({
  page,
}) => {
  const avatar = 'https://pbs.twimg.com/profile_images/3003/test-avatar.jpg';
  const fallback = '/assets/branding/pfp-approved-v01.png';
  const photos = page.locator('.profile-identity img, .profile-link img, .topbar-avatar img');
  await page.route('https://pbs.twimg.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="80" fill="#465769"/><circle cx="80" cy="61" r="29" fill="#e8d2b4"/><path d="M24 160c0-66 112-66 112 0" fill="#aabbd0"/></svg>',
    }),
  );
  await signIn(page, '4');
  await linkFixtureX(page, '3003');
  await expect(page.locator('.profile-identity h2')).toHaveText('Order Member');
  await expect(page.locator('.profile-identity p')).toHaveText('@order_member_3003');
  await expect(page.locator('.profile-link strong')).toHaveText('Order Member');
  await expect(page.locator('.profile-link small')).toHaveText('@order_member_3003');
  await expect(page.getByLabel('Display name')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save profile' })).toHaveCount(0);
  await expect(photos).toHaveCount(3);
  for (const photo of await photos.all()) await expect(photo).toHaveAttribute('src', avatar);
  await expect(page.locator('.sidebar-brand img')).toHaveAttribute('src', fallback);
  await page.waitForFunction(() =>
    [
      ...document.querySelectorAll('.profile-identity img, .profile-link img, .topbar-avatar img'),
    ].every((photo) => (photo as HTMLImageElement).naturalWidth > 0),
  );
  await expect(page.locator('.route-content')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '.local/captures/x-identity-desktop.png', fullPage: true });
  await page.reload();
  await expect(page.locator('.profile-identity h2')).toHaveText('Order Member');
  for (const photo of await photos.all()) await expect(photo).toHaveAttribute('src', avatar);
  await page.setViewportSize({ width: 360, height: 844 });
  await noOverflow(page);
  await expect(page.locator('.route-content')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '.local/captures/x-identity-mobile.png', fullPage: true });
  await page.unroute('https://pbs.twimg.com/**');
  await page.route('https://pbs.twimg.com/**', (route) => route.abort());
  await page.reload();
  for (const photo of await photos.all()) await expect(photo).toHaveAttribute('src', fallback);
  await expect(page.locator('.profile-identity h2')).toHaveText('Order Member');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('.profile-identity h2')).toHaveText('A new perspective');
  await expect(page.locator('.profile-link strong')).toHaveText('Explorer');
});

test('@empty-board a Keeper can publish the first mission, submit evidence and record a review', async ({
  page,
}) => {
  test.skip(
    process.env.ORDER_TEST_EMPTY_BOARD !== '1',
    'Run with ORDER_TEST_EMPTY_BOARD=1 and --grep @empty-board',
  );
  await page.route('https://pbs.twimg.com/**', (route) => route.abort());
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/app');
  await expect(page.getByRole('heading', { name: 'A new chapter is on its way.' })).toBeVisible();
  await expect(page.locator('.mission-card')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.mission-card')).toHaveCount(0);
  await signIn(page, '1');
  await linkFixtureX(page, '4004');
  await page.getByRole('link', { name: /^Keepers\b/ }).click();
  await page.getByRole('button', { name: /Manage missions/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Your first mission starts here.' }),
  ).toBeVisible();
  await expect(page.locator('.route-content')).toHaveCSS('opacity', '1');
  await noOverflow(page);
  await expect(page.locator('.profile-link img')).toHaveAttribute(
    'src',
    '/assets/branding/pfp-approved-v01.png',
  );
  await page.screenshot({ path: '.local/captures/keeper-empty-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({ path: '.local/captures/keeper-empty-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Create your first mission' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await noOverflow(page);
  await page.getByLabel('Title', { exact: true }).fill('Our first community mission');
  await page
    .getByLabel('Description', { exact: true })
    .fill('Share an original contribution about the Order and submit a public link for review.');
  await page.getByLabel('Points', { exact: true }).fill('25');
  await page
    .getByLabel('Requirements', { exact: true })
    .fill('Publish an original contribution.\nSubmit a public link with a useful explanation.');
  await page.getByRole('button', { name: 'Publish mission' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('link', { name: 'Missions', exact: true }).click();
  await expect(page.locator('.mission-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.mission-card')).toHaveCount(1);
  await openMission(page, 'Our first community mission');
  await page.getByLabel('Public link').fill('https://example.com/first-community-contribution');
  await page
    .getByLabel('Tell us what you did')
    .fill('I published an original reflection explaining a practical way to contribute.');
  await page.getByRole('button', { name: 'Submit evidence', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.stats-grid')).toContainText('0pts');
  await page.getByRole('link', { name: /^Keepers\b/ }).click();
  await page.getByRole('button', { name: 'Review submission', exact: true }).click();
  await page
    .getByLabel('Reason for the decision')
    .fill('The evidence is original and meets all mission requirements.');
  await page.getByRole('button', { name: 'Record decision' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('link', { name: 'My journey', exact: true }).click();
  await expect(page.locator('.stats-grid')).toContainText('25pts');
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
  await page.getByLabel('Verification', { exact: true }).selectOption('x_reply');
  await page.getByLabel('Target X post ID', { exact: true }).fill('https://x.com/orderofsteering');
  await page.getByRole('button', { name: 'Publish mission' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Enter the numeric post ID to verify a reply.',
  );
  await page.getByLabel('Verification', { exact: true }).selectOption('manual');
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
  await page.getByRole('link', { name: /^Keepers\b/ }).click();
  await page.getByRole('button', { name: /Manage missions/ }).click();
  const managed = page
    .locator('.manage-list article')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await managed.getByRole('button', { name: `Delete ${title}`, exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete mission', exact: true });
  await expect(confirm.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await expect(confirm).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '.local/captures/delete-mission-desktop.png' });
  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  await expect(managed).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await managed.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/captures/keeper-delete-mobile.png' });
  await managed.getByRole('button', { name: `Delete ${title}`, exact: true }).click();
  await expect(confirm).toHaveCSS('opacity', '1');
  await noOverflow(page);
  await page.screenshot({ path: '.local/captures/delete-mission-mobile.png' });
  await confirm.getByRole('button', { name: 'Delete mission', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(confirm).toBeHidden();
  await expect(managed).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: /Manage missions/ }).click();
  await expect(managed).toHaveCount(0);
  await page.getByRole('link', { name: 'Missions', exact: true }).click();
  await page.getByLabel('Filter by availability').selectOption('all');
  await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'My journey', exact: true }).click();
  await expect(page.locator('.stats-grid')).toContainText('175pts');
  await expect(page.locator('.history-list')).toContainText(title);
  await expect(page.locator('.history-list')).toContainText('Verified');
  expect(errors).toEqual([]);
});

test('@automatic-visit a Keeper publishes an X account visit and a member receives persistent points after three seconds', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.context().route('https://x.com/orderofsteering', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html lang="en"><title>Order X account</title><body>Order X account fixture</body></html>',
    }),
  );
  await signIn(page, '1');
  await linkFixtureX(page, '2002');
  await page.getByRole('link', { name: /^Keepers\b/ }).click();
  await page.getByRole('button', { name: 'Create mission', exact: true }).click();
  const title = 'Visit our X account';
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page
    .getByLabel('Description', { exact: true })
    .fill('Discover The Order of Steering on X and visit our official account.');
  await page.getByLabel('Category', { exact: true }).selectOption('Community');
  await page.getByLabel('Points', { exact: true }).fill('100');
  await page.getByLabel('Estimated time', { exact: true }).fill('1 min');
  await page
    .getByLabel('Requirements', { exact: true })
    .fill('Open our official X account using the mission button.');
  await page.getByLabel('Verification', { exact: true }).selectOption('visit');
  await page.getByRole('button', { name: 'Publish mission' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    'Add a mission link for an automatic visit.',
  );
  await page.getByLabel('Mission link', { exact: true }).fill('https://x.com/orderofsteering');
  await noOverflow(page);
  await page.getByLabel('Verification', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/captures/visit-editor-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.getByLabel('Verification', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/captures/visit-editor-mobile.png' });
  await page.getByRole('button', { name: 'Publish mission' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.goto('/#/app/profile');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  page = await page.context().newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, '5');
  await linkFixtureX(page, '6006');
  await page.getByRole('link', { name: 'Missions', exact: true }).click();
  await openMission(page, title);
  await expect(page.getByRole('button', { name: 'Submit evidence', exact: true })).toHaveCount(0);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Open link & start visit' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/captures/visit-mission-mobile.png' });
  const popupPromise = page.waitForEvent('popup');
  const started = Date.now();
  await page.getByRole('button', { name: 'Open link & start visit' }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL('https://x.com/orderofsteering');
  await expect(
    page.getByRole('dialog').getByText('Visit in progress', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog').getByText('Your visit is complete.', { exact: false }),
  ).toBeVisible();
  expect(Date.now() - started).toBeGreaterThanOrEqual(3000);
  await expect(page.getByRole('dialog').getByText('Verified', { exact: true })).toBeVisible();
  await popup.close();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.stats-grid')).toContainText('100pts');
  await page.reload();
  await expect(page.locator('.stats-grid')).toContainText('100pts');
  await page.getByLabel('Filter by availability').selectOption('all');
  await openMission(page, title);
  await expect(page.getByRole('button', { name: 'Open link & start visit' })).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 960 });
  await noOverflow(page);
  await expect(page.locator('.route-content')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '.local/captures/visit-completed-desktop.png' });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('link', { name: 'My journey', exact: true }).click();
  await expect(page.locator('.history-list')).toContainText('Verified');
  await expect(page.locator('.stats-grid')).toContainText('100pts');
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
