import { test, expect } from '@playwright/test';
import type { LeaderboardData } from '../src/lib/leaderboard';

test('leaderboard shows 50 ranks, supports refresh and retry, and adapts to mobile and light mode', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const data: LeaderboardData = {
    entries: Array.from({ length: 50 }, (_, i) => ({
      rank: i + 1,
      name:
        ['Aster', 'Lyra', 'Rowan'][i] ||
        (i === 49
          ? 'A very long example member name that still fits on a small screen'
          : 'Example Member ' + (i + 1)),
      username: 'example_member_' + (i + 1),
      avatarUrl: i === 0 ? 'https://pbs.twimg.com/profile_images/example/missing.jpg' : null,
      points: i === 0 ? 12345 : (50 - i) * 100,
      isYou: false,
    })),
  };
  let outcome: 'loaded' | 'empty' | 'failed' = 'loaded';
  // These are rendering fixtures; aggregation and private-data boundaries use real API tests.
  await page.route('**/api/leaderboard', async (route) => {
    if (outcome === 'failed') {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'The leaderboard is temporarily unavailable. Please try again.',
        }),
      });
    } else {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(outcome === 'empty' ? { entries: [] } : data),
      });
    }
  });
  await page.route('https://pbs.twimg.com/**', (route) => route.abort());
  await page.goto('/#/app');
  const navigation = page.getByRole('navigation', { name: 'App navigation' });
  await navigation.getByRole('link', { name: 'Leaderboard', exact: true }).focus();
  await page.keyboard.press('Enter');
  const table = page.getByRole('table', { name: 'Member ranking by approved mission points' });
  await expect(table.locator('tbody tr')).toHaveCount(50);
  await expect(table.locator('tbody tr').first()).toContainText('12,345pts');
  await expect(table.locator('tbody tr').last()).toContainText('50');
  await expect(page.locator('.leaderboard-leader')).toHaveCount(3);
  await expect(page.locator('.leaderboard-place-1 img')).toHaveAttribute(
    'src',
    '/assets/branding/pfp-approved-v01.png',
  );
  await expect(table.getByRole('link', { name: 'View @example_member_1 on X' })).toHaveAttribute(
    'href',
    'https://x.com/example_member_1',
  );
  await expect(table.getByRole('link', { name: 'View @example_member_1 on X' })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await expect(page.locator('.route-content')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '.local/captures/leaderboard-desktop.png' });
  data.entries[0].points = 12445;
  await page.getByRole('button', { name: 'Refresh leaderboard', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(table.locator('tbody tr').first()).toContainText('12,445pts');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.local/captures/leaderboard-mobile.png' });
  await table.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/captures/leaderboard-mobile-table.png' });
  const lastName = table.locator('tbody tr').last().locator('.leaderboard-member-copy strong');
  expect(await lastName.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.local/captures/leaderboard-light.png' });
  outcome = 'failed';
  await page.getByRole('button', { name: 'Refresh leaderboard', exact: true }).click();
  await expect(page.locator('.leaderboard-error')).toContainText('temporarily unavailable');
  await expect(table.locator('tbody tr')).toHaveCount(50);
  outcome = 'empty';
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The first place is waiting.' })).toBeVisible();
  await expect(table).toHaveCount(0);
  await page.getByRole('link', { name: 'Explore missions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mission board', exact: true })).toBeVisible();
  outcome = 'loaded';
  await navigation.getByRole('link', { name: 'Leaderboard', exact: true }).click();
  await expect(table.locator('tbody tr')).toHaveCount(50);
  await page.reload();
  await expect(table.locator('tbody tr')).toHaveCount(50);
  expect(errors).toEqual([]);
});
