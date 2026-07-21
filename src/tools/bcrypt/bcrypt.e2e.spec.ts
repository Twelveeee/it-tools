import { expect, test } from '@playwright/test';

test.describe('Tool - bcrypt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bcrypt');
  });

  test('hashes and compares in a worker', async ({ page }) => {
    await page.getByPlaceholder('Your string to bcrypt...').fill('correct horse battery staple');
    await page.getByPlaceholder('Cost factor...').fill('4');
    await page.getByRole('button', { name: 'Generate hash' }).click();

    const generatedHash = page.getByPlaceholder('Generate a hash to see it here');
    await expect(generatedHash).toHaveValue(/^\$2[aby]?\$04\$/);

    await page.getByPlaceholder('Your string to compare...').fill('correct horse battery staple');
    await page.getByPlaceholder('Your hash to compare...').fill(await generatedHash.inputValue());
    await page.getByRole('button', { name: 'Compare' }).click();
    await expect(page.getByRole('status')).toHaveText('Yes');
  });
});
