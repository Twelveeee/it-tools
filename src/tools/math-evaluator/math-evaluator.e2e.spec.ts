import { expect, test } from '@playwright/test';

test.describe('Tool - Math evaluator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/math-evaluator');
  });

  test('evaluates bounded expressions in a worker', async ({ page }) => {
    await page.getByPlaceholder('Your math expression (ex: 2*sqrt(6) )...').fill('2 * sqrt(6)');
    await page.getByRole('button', { name: 'Evaluate' }).click();
    await expect(page.locator('output')).toHaveText('4.8989794855664');
  });

  test('rejects unbounded allocation helpers', async ({ page }) => {
    await page.getByPlaceholder('Your math expression (ex: 2*sqrt(6) )...').fill('ones(100000, 100000)');
    await page.getByRole('button', { name: 'Evaluate' }).click();
    await expect(page.getByRole('alert')).toContainText('disabled because it can allocate unbounded resources');
  });
});
