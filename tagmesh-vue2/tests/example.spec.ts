import { test, expect } from '@playwright/test';

test('Add tag', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Expect a title "to contain" a substring.
  await page.getByRole('button', { name: 'Open' }).click();
  
  await expect(page.getByText('Edit Annotation')).toBeVisible();

  await page.type('#name', 'TestTag')

  await page.type('#notes', 'This is a test note')
  
  await page.getByRole('button', { name: 'Save' }).click();
  
  await expect(page.getByText('Edit Annotation')).not.toBeVisible();
  
});

/*

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

*/