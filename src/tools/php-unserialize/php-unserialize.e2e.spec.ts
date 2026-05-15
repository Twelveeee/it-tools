import { expect, test } from '@playwright/test';

test.describe('Tool - PHP serialize / unserialize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/php-unserialize');
  });

  test('Has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('PHP serialize / unserialize - IT Tools');
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

    await page.getByTestId('json').click();

    await expect(page.getByTestId('area-content')).toContainText('"foo": "bar"');
  });

  test('keeps the input position stable when switching modes', async ({ page }) => {
    await page.setViewportSize({ width: 520, height: 900 });
    await page.reload();

    const inputPositionBeforeModeChange = await page.getByTestId('input').boundingBox();

    await page.getByTestId('serialize').click();

    const inputPositionAfterModeChange = await page.getByTestId('input').boundingBox();

    expect(inputPositionAfterModeChange?.y).toBe(inputPositionBeforeModeChange?.y);
  });

  test('shows validation feedback and clears output for invalid input', async ({ page }) => {
    await page.getByTestId('input').fill('not serialized');

    await expect(page.getByText(/Unable to unserialize input\./)).toBeVisible();

    const generatedOutput = await page.getByTestId('area-content').innerText();

    expect(generatedOutput.trim()).toBe('');
  });

  test('serializes JSON input to a PHP serialized value', async ({ page }) => {
    await page.getByTestId('serialize').click();
    await page.getByTestId('input').fill(`
{
  "name": "Alice",
  "items": ["foo", "bar"]
}
    `.trim());

    const generatedOutput = await page.getByTestId('area-content').innerText();

    expect(generatedOutput.trim()).toBe('a:2:{s:4:"name";s:5:"Alice";s:5:"items";a:2:{i:0;s:3:"foo";i:1;s:3:"bar";}}');
  });

  test('shows validation feedback and clears output for invalid JSON input', async ({ page }) => {
    await page.getByTestId('serialize').click();
    await page.getByTestId('input').fill('{not valid json');

    await expect(page.getByText(/Unable to parse JSON input\./)).toBeVisible();

    const generatedOutput = await page.getByTestId('area-content').innerText();

    expect(generatedOutput.trim()).toBe('');
  });
});
