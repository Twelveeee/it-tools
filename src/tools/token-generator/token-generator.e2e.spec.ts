import { expect, test } from '@playwright/test';

test.describe('Tool - Token generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/token-generator');
  });

  test('Has title', async ({ page }) => {
    await expect(page).toHaveTitle('Token generator - IT Tools');
  });

  test('New token on refresh', async ({ page }) => {
    const initialToken = await page.getByPlaceholder('The token...').inputValue();
    await page.getByRole('button', { name: 'Refresh' }).click();
    const newToken = await page.getByPlaceholder('The token...').inputValue();

    expect(newToken).not.toEqual(initialToken);
  });

  test('Length input updates the token and query parameter', async ({ page }) => {
    const lengthInput = page.locator('.length-input input');

    await lengthInput.fill('32');
    await lengthInput.blur();

    await expect(page.getByPlaceholder('The token...')).toHaveValue(/^.{32}$/);
    await expect(page).toHaveURL(/\blength=32\b/);

    await lengthInput.fill('');
    await lengthInput.blur();

    await expect(lengthInput).toHaveValue('32');
    await expect(page).toHaveURL(/\blength=32\b/);
  });

  test('Length slider updates the number input', async ({ page }) => {
    const lengthInput = page.locator('.length-input input');
    const slider = page.locator('.length-controls .n-slider-handle-wrapper');

    await slider.focus();
    await slider.press('ArrowRight');

    await expect(lengthInput).toHaveValue('65');
    await expect(page).toHaveURL(/\blength=65\b/);
  });
});
