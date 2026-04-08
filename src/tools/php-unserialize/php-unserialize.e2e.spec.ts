import { expect, test } from '@playwright/test';

test.describe('Tool - PHP unserialize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/php-unserialize');
  });

  test('Has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('PHP unserialize - IT Tools');
  });

  test('updates output when the input changes', async ({ page }) => {
    await page.getByTestId('input').fill('a:2:{s:4:"name";s:5:"Alice";s:5:"items";a:2:{i:0;s:3:"foo";i:1;s:3:"bar";}}');

    const generatedOutput = await page.getByTestId('area-content').innerText();

    expect(generatedOutput.trim()).toEqual(
      `
Array
(
    [name] => Alice
    [items] => Array
        (
            [0] => foo
            [1] => bar
        )
)`.trim(),
    );
  });

  test('switches between PHP output formats', async ({ page }) => {
    await page.getByTestId('input').fill('a:1:{s:3:"foo";s:3:"bar";}');
    await page.getByTestId('var_dump').click();

    await expect(page.getByTestId('area-content')).toContainText('array(1) {');
    await expect(page.getByTestId('area-content')).toContainText('string(3) "bar"');

    await page.getByTestId('var_export').click();

    await expect(page.getByTestId('area-content')).toContainText('array (');
    await expect(page.getByTestId('area-content')).toContainText('\'foo\' => \'bar\',');
  });

  test('shows validation feedback and clears output for invalid input', async ({ page }) => {
    await page.getByTestId('input').fill('not serialized');

    await expect(page.getByText(/Unable to unserialize input\./)).toBeVisible();

    const generatedOutput = await page.getByTestId('area-content').innerText();

    expect(generatedOutput.trim()).toBe('');
  });
});
