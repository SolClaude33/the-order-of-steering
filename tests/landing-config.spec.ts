import { test, expect } from '@playwright/test';

test('public landing configuration exposes X and a copyable token address in hero and footer', async ({
  page,
  context,
}) => {
  const configured = !!process.env.VITE_X_URL && !!process.env.VITE_TOKEN_CA;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  if (!configured) {
    await expect(page.locator('.atlas-x-link')).toHaveCount(0);
    await expect(page.locator('.atlas-contract')).toHaveCount(0);
    return;
  }
  const address = process.env.VITE_TOKEN_CA!;
  const x = page.getByRole('link', { name: 'Follow The Order of Steering on X (new tab)' });
  await expect(x).toHaveAttribute('href', process.env.VITE_X_URL!);
  await expect(x).toHaveAttribute('target', '_blank');
  await expect(x).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('.atlas-contract')).toHaveCount(2);
  await expect(page.locator('.atlas-contract-hero code')).toHaveText(address);
  await expect(page.locator('.atlas-contract-footer code')).toHaveText(address);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page
    .locator('.atlas-contract-hero')
    .getByRole('button', { name: 'Copy token contract address' })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.atlas-contract-hero').getByRole('status')).toHaveText(
    'Contract address copied.',
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.atlas-hero-copy')).toHaveCSS('opacity', '1');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.local/captures/landing-token-desktop.png' });
  await page.locator('.atlas-footer').scrollIntoViewIfNeeded();
  await page
    .locator('.atlas-contract-footer')
    .getByRole('button', { name: 'Copy token contract address' })
    .click();
  await expect(page.locator('.atlas-contract-footer').getByRole('status')).toHaveText(
    'Contract address copied.',
  );
  await page.screenshot({ path: '.local/captures/landing-token-footer-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await expect(x).toBeVisible();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  await page.screenshot({ path: '.local/captures/landing-token-mobile.png' });
  await page.locator('.atlas-contract-footer').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/captures/landing-token-footer-mobile.png' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const actions = page.locator('.atlas-header-actions');
  const brand = page.locator('.atlas-header > a').first();
  const [actionBox, brandBox] = await Promise.all([actions.boundingBox(), brand.boundingBox()]);
  expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(actionBox!.x);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('Clipboard blocked')) },
    });
  });
  await page
    .locator('.atlas-contract-hero')
    .getByRole('button', { name: 'Copy token contract address' })
    .click();
  await expect(page.locator('.atlas-contract-hero').getByRole('status')).toContainText(
    'Select the address to copy it.',
  );
  expect(errors).toEqual([]);
});
