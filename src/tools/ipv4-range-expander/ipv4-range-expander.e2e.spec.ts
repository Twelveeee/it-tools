import { type Locator, expect, test } from '@playwright/test';

async function textWithoutTooltip(locator: Locator) {
  return locator.evaluate((element: HTMLElement) => {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[role="tooltip"]').forEach(tooltip => tooltip.remove());
    return clone.textContent ?? '';
  });
}

test.describe('Tool - IPv4 range expander', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ipv4-range-expander');
  });

  test('Has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('IPv4 range expander - IT Tools');
  });

  test('Calculates correct for valid input', async ({ page }) => {
    await page.getByPlaceholder('Start IPv4 address...').fill('192.168.1.1');
    await page.getByPlaceholder('End IPv4 address...').fill('192.168.7.255');

    expect(await textWithoutTooltip(page.getByTestId('start-address.old'))).toEqual('192.168.1.1');
    expect(await textWithoutTooltip(page.getByTestId('start-address.new'))).toEqual('192.168.0.0');
    expect(await textWithoutTooltip(page.getByTestId('end-address.old'))).toEqual('192.168.7.255');
    expect(await textWithoutTooltip(page.getByTestId('end-address.new'))).toEqual('192.168.7.255');
    expect(await textWithoutTooltip(page.getByTestId('addresses-in-range.old'))).toEqual('1,791');
    expect(await textWithoutTooltip(page.getByTestId('addresses-in-range.new'))).toEqual('2,048');
    expect(await textWithoutTooltip(page.getByTestId('cidr.old'))).toEqual('');
    expect(await textWithoutTooltip(page.getByTestId('cidr.new'))).toEqual('192.168.0.0/21');
  });

  test('Calculates correct for valid input, where first octet is lower than 128', async ({ page }) => {
    await page.getByPlaceholder('Start IPv4 address...').fill('10.0.0.1');
    await page.getByPlaceholder('End IPv4 address...').fill('10.0.0.17');

    expect(await textWithoutTooltip(page.getByTestId('start-address.old'))).toEqual('10.0.0.1');
    expect(await textWithoutTooltip(page.getByTestId('start-address.new'))).toEqual('10.0.0.0');
    expect(await textWithoutTooltip(page.getByTestId('end-address.old'))).toEqual('10.0.0.17');
    expect(await textWithoutTooltip(page.getByTestId('end-address.new'))).toEqual('10.0.0.31');
    expect(await textWithoutTooltip(page.getByTestId('addresses-in-range.old'))).toEqual('17');
    expect(await textWithoutTooltip(page.getByTestId('addresses-in-range.new'))).toEqual('32');
    expect(await textWithoutTooltip(page.getByTestId('cidr.old'))).toEqual('');
    expect(await textWithoutTooltip(page.getByTestId('cidr.new'))).toEqual('10.0.0.0/27');
  });

  test('Hides result for invalid input', async ({ page }) => {
    await page.getByPlaceholder('Start IPv4 address...').fill('192.168.1.1');
    await page.getByPlaceholder('End IPv4 address...').fill('192.168.0.255');

    await expect(page.getByTestId('result')).not.toBeVisible();
  });
});
