import { expect, test } from '@playwright/test';

test.describe('Tool - MySQL IN query builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mysql-in-query');
  });

  test('Input is reset when the page is reopened', async ({ page }) => {
    const input = page.getByPlaceholder('Paste your values here...');

    await input.fill('cached value');
    await page.evaluate(() => localStorage.setItem('mysql-in-query:input', JSON.stringify('cached value')));
    await page.reload();

    await expect(input).toHaveValue('');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('mysql-in-query:input'))).toBeNull();
  });

  test('Back to top appears after scrolling and returns to the page top', async ({ page }) => {
    const input = page.getByPlaceholder('Paste your values here...');
    const scrollContainer = page.locator('.n-layout-scroll-container').last();
    const backToTop = page.getByTestId('back-to-top');
    const values = Array.from({ length: 300 }, (_, index) => String(index + 1)).join('\n');

    await expect(backToTop).toBeHidden();
    await input.fill(values);
    await expect.poll(() => scrollContainer.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);

    await scrollContainer.evaluate(element => element.scrollTo({ top: 1000 }));

    await expect(backToTop).toBeVisible();
    await backToTop.click();
    await expect.poll(() => scrollContainer.evaluate(element => element.scrollTop)).toBe(0);
    await expect(backToTop).toBeHidden();
  });
});
