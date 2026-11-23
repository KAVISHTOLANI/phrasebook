import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('add phrases, practise, see progress', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('The phrases you’ll');
  await expect(page.locator('.hero .flash')).toBeVisible();
  await page.waitForTimeout(1000);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');

  await page.getByRole('link', { name: 'Browse phrases' }).click();
  await page.getByLabel('Language', { exact: true }).selectOption('it');
  await page.getByLabel(/One per line/).fill('Buongiorno = Good morning\nDov’è il bagno? = Where is the bathroom?');
  await page.getByRole('button', { name: 'Import list' }).click();
  await expect(page.getByText('Imported 2 Italian phrases.')).toBeVisible();
  await snap(page, 'phrases');
  await checkMobile(page);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Practise' }).click();
  await expect(page.getByRole('heading', { name: /A short session/ })).toBeVisible();
  await page.getByLabel('Language', { exact: true }).selectOption('it');
  await page.getByRole('button', { name: 'Start session' }).click();
  for (let i = 0; i < 2; i++) {
    const meaning = await page.locator('.flash-meaning').textContent();
    await page.getByLabel(/Type the phrase/).fill(meaning?.includes('morning') ? 'buongiorno' : 'dove il bagno');
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.locator('.verdict')).toBeVisible();
    if (i === 0) await snap(page, 'practice');
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.getByText('Session complete')).toBeVisible();
  await checkMobile(page, 'practice-mobile');
  await page.reload();

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('img', { name: /Phrases per box/ })).toBeVisible();
  await page.waitForTimeout(900);
  await snap(page, 'progress');
});
