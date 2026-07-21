import { expect, test } from '@playwright/test';

test.describe('Tool - Regex tester', () => {
  test('evaluates matches outside the main thread', async ({ page }) => {
    await page.goto('/regex-tester');
    await page.getByPlaceholder('Put the regex to test').fill('a+');
    await page.getByPlaceholder('Put the text to match').fill('baaa');

    await expect(page.getByRole('cell', { name: 'aaa' })).toBeVisible();
    await expect(page.getByText('Evaluating regular expression…')).toHaveCount(0);
  });
});
