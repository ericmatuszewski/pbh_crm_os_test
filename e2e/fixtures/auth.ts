import { test as base, expect } from "@playwright/test";
import { Page } from "@playwright/test";

// Extend the base test with authenticated context
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page, context }, use) => {
    // Set up mock authentication session
    // In a real setup, you would either:
    // 1. Use a test database with seeded test users
    // 2. Mock the auth endpoints
    // 3. Use a special test login flow

    // For now, we'll set a mock session cookie
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: "test-session-token",
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // Mock the session API to return a test user
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-id",
            name: "Test User",
            email: "test@example.com",
            role: "ADMIN",
            businessId: "test-business-id",
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await use(page);
  },
});

export { expect };

// Helper to wait for page to be ready
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle");
  // Wait for any loading spinners to disappear
  const spinners = page.locator('[class*="animate-spin"], [class*="loading"]');
  if (await spinners.count() > 0) {
    await spinners.first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  }
}

// Helper to fill a form field
export async function fillField(
  page: Page,
  label: string,
  value: string,
  fieldType: "input" | "textarea" | "select" = "input"
) {
  const field = page.locator(`label:has-text("${label}") + ${fieldType}, [aria-label="${label}"], [placeholder*="${label}" i]`).first();

  if (fieldType === "select") {
    await field.click();
    await page.locator(`[role="option"]:has-text("${value}")`).click();
  } else {
    await field.fill(value);
  }
}

// Helper to click a button by text
export async function clickButton(page: Page, text: string) {
  await page.locator(`button:has-text("${text}"), [role="button"]:has-text("${text}")`).first().click();
}

// Helper to wait for toast notification
export async function waitForToast(page: Page, text?: string) {
  const toastSelector = text
    ? `[data-sonner-toast]:has-text("${text}"), [role="status"]:has-text("${text}")`
    : '[data-sonner-toast], [role="status"]';
  await page.locator(toastSelector).first().waitFor({ state: "visible", timeout: 5000 });
}
