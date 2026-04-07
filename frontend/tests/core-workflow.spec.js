import { test, expect } from '@playwright/test';

test.describe('Automated Chaos Testing: Core Workflow & Paywalls', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the local dev server
    await page.goto('http://localhost:5173/');
  });

  test('Test 1 (Auth): Unauthenticated user should trigger AuthModal on action', async ({ page }) => {
    // Navigate to a campaign flow
    await page.goto('http://localhost:5173/campaign/new/flow');
    
    // Find the Launch Pipeline / Execute Workflow button
    const launchButton = page.getByRole('button', { name: /Launch Pipeline|Execute Workflow/i });
    
    // Ensure button is somewhat interactable (needs formData.niche though, or it's disabled)
    // The button is disabled if `!formData.niche` is empty. Let's fill the niche input first.
    const nicheInput = page.getByPlaceholder('SaaS, Fitness, etc.');
    await nicheInput.fill('Chaos Engineering Tools');
    
    // Click the button
    await launchButton.click();
    
    // Assert AuthModal appears
    const authModalHeading = page.getByRole('heading', { name: /Get Started|Welcome/i });
    await expect(authModalHeading).toBeVisible({ timeout: 5000 });
  });

  test('Test 2 & 3 (Credit Drain & Paywall Trigger): Mocking 1 credit triggers Paywall', async ({ page, context }) => {
    // Mock the backend credits endpoint to return exactly 1 credit
    await page.route('**/api/workflow/credits', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ credits: 1 })
      });
    });

    // Mock the user profile endpoint to validate the JWT
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test_user', email: 'chaos@testing.com', tier: 'free' })
      });
    });

    // Mock authentication state in localStorage
    await context.addInitScript(() => {
      localStorage.setItem('jwt_token', 'mock_jwt_token_for_testing');
      localStorage.setItem('workspace_id', 'test_user');
      localStorage.setItem('user_email', 'chaos@testing.com');
    });

    // Go to the campaign flow
    await page.goto('http://localhost:5173/campaign/new/flow');

    // Fill required niche
    const nicheInput = page.getByPlaceholder('SaaS, Fitness, etc.');
    await nicheInput.fill('Playwright Testing Services');

    // The button text should dynamically change to 'Top Up Credits' because cost > 1
    const topUpButton = page.getByRole('button', { name: /Top Up Credits/i });
    await expect(topUpButton).toBeVisible();

    // If they were to bypass the UI disabled state and hit the API anyway
    // Let's mock the execute endpoint returning 402 Payment Required
    await page.route('**/api/workflow/execute', async route => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ detail: { deficit: 15, message: 'Insufficient credits' } })
      });
    });

    // We can also trigger the paywall modal by clicking the blocked button (if we force it)
    // Or if the UI allows clicking Top Up to open the modal
    await topUpButton.click({ force: true });
    
    // Assert the Razorpay paywall block appears
    const paywallHeading = page.getByRole('heading', { name: /Credits Required/i });
    await expect(paywallHeading).toBeVisible();
    
    // Assert the Razorpay packs are visible
    const starterPackBtn = page.getByRole('button', { name: /Starter Pack/i });
    await expect(starterPackBtn).toBeVisible();
  });

});
