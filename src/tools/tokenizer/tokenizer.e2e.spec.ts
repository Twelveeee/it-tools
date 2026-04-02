import { expect, test } from '@playwright/test';

test.describe('Tool - Tokenizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tokenizer');
  });

  test('Has title', async ({ page }) => {
    await expect(page).toHaveTitle('Tokenizer - IT Tools');
  });

  test('Counts GPT-5.4 tokens in text mode', async ({ page }) => {
    await page.getByPlaceholder('Enter text to tokenize...').fill('hello world');
    await expect(page.getByText('Token count')).toBeVisible();
    await expect(page.getByText(/\b2\b|\b3\b/).first()).toBeVisible();
  });
});
