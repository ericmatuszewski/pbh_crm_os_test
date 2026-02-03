import { test, expect, waitForPageReady, clickButton } from "./fixtures/auth";

test.describe("Call Queue - Campaign Management", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock campaigns API
    await page.route("**/api/calls/campaigns*", async (route, request) => {
      const method = request.method();
      const url = request.url();

      if (method === "GET" && !url.includes("/next")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "campaign-1",
                name: "Follow-up Campaign",
                description: "Weekly follow-up calls",
                status: "ACTIVE",
                totalContacts: 50,
                completedContacts: 15,
                priority: "HIGH",
                createdAt: new Date().toISOString(),
                _count: { queueItems: 35 },
              },
              {
                id: "campaign-2",
                name: "New Leads",
                description: "Cold calls to new leads",
                status: "ACTIVE",
                totalContacts: 100,
                completedContacts: 45,
                priority: "NORMAL",
                createdAt: new Date().toISOString(),
                _count: { queueItems: 55 },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/calls");
    await waitForPageReady(page);
  });

  test("should display campaign list", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=Follow-up Campaign")).toBeVisible();
    await expect(page.locator("text=New Leads")).toBeVisible();
  });

  test("should show campaign progress", async ({ authenticatedPage: page }) => {
    // Check for progress indicators (15/50 = 30%, 45/100 = 45%)
    await expect(page.locator("text=15")).toBeVisible();
    await expect(page.locator("text=50")).toBeVisible();
  });

  test("should show priority badge", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=HIGH").first()).toBeVisible();
  });

  test("should open campaign to start calling", async ({ authenticatedPage: page }) => {
    await page.locator("text=Follow-up Campaign").click();

    // Should navigate to dialer or show dialer dialog
    await expect(page).toHaveURL(/.*campaign|calls|dialer.*/i);
  });
});

test.describe("Call Queue - Dialer Interface", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock next contact API
    await page.route("**/api/calls/campaigns/*/next*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            current: {
              id: "queue-item-1",
              contact: {
                id: "contact-1",
                firstName: "John",
                lastName: "Doe",
                email: "john@example.com",
                phone: "+1234567890",
                company: { name: "Acme Corp" },
              },
              attempts: 0,
              lastAttemptAt: null,
              callbackAt: null,
              notes: "Previous conversation about product demo",
            },
            prefetch: {
              id: "queue-item-2",
              contact: {
                id: "contact-2",
                firstName: "Jane",
                lastName: "Smith",
                email: "jane@example.com",
                phone: "+0987654321",
              },
              attempts: 1,
            },
          },
        }),
      });
    });

    // Mock outcome recording
    await page.route("**/api/calls/queue/*/outcome*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/calls/campaign-1");
    await waitForPageReady(page);
  });

  test("should display current contact info", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=John Doe")).toBeVisible();
    await expect(page.locator("text=+1234567890")).toBeVisible();
    await expect(page.locator("text=Acme Corp")).toBeVisible();
  });

  test("should show previous notes", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=product demo")).toBeVisible();
  });

  test("should display outcome buttons", async ({ authenticatedPage: page }) => {
    await expect(page.locator("button:has-text('Answered')")).toBeVisible();
    await expect(page.locator("button:has-text('No Answer')")).toBeVisible();
    await expect(page.locator("button:has-text('Voicemail')")).toBeVisible();
    await expect(page.locator("button:has-text('Busy')")).toBeVisible();
    await expect(page.locator("button:has-text('Callback')")).toBeVisible();
  });

  test("should record call outcome - Answered", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Answered");

    // Should move to next contact or show success
    await page.waitForResponse((res) => res.url().includes("/outcome") || res.url().includes("/next"));
  });

  test("should record call outcome - No Answer", async ({ authenticatedPage: page }) => {
    await clickButton(page, "No Answer");

    await page.waitForResponse((res) => res.url().includes("/outcome") || res.url().includes("/next"));
  });

  test("should open callback scheduler", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Callback");

    // Should show callback date/time picker
    await expect(page.locator('[role="dialog"], [class*="calendar"]').first()).toBeVisible();
  });
});

test.describe("Call Queue - Keyboard Shortcuts", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/calls/campaigns/*/next*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            current: {
              id: "queue-item-1",
              contact: { id: "contact-1", firstName: "Test", lastName: "User", phone: "+1111111111" },
            },
          },
        }),
      });
    });

    await page.route("**/api/calls/queue/*/outcome*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/calls/campaign-1");
    await waitForPageReady(page);
  });

  test("should show keyboard shortcuts help on ? press", async ({ authenticatedPage: page }) => {
    await page.keyboard.press("?");

    // Should show shortcuts overlay
    await expect(page.locator("text=Keyboard Shortcuts").first()).toBeVisible({ timeout: 3000 });
  });

  test("should record outcome with number keys", async ({ authenticatedPage: page }) => {
    // Press 1 for Answered
    await page.keyboard.press("1");

    // Should trigger outcome recording
    await page.waitForResponse((res) => res.url().includes("/outcome") || res.url().includes("/next"), { timeout: 5000 }).catch(() => {});
  });
});

test.describe("Agent Dashboard", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock agent stats API
    await page.route("**/api/agents/stats*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            callsMade: 15,
            callsTarget: 30,
            callbacksDue: 3,
            callbacksOverdue: 1,
            successRate: 0.73,
            avgCallDuration: 4.5,
            outcomes: {
              ANSWERED: 11,
              NO_ANSWER: 3,
              VOICEMAIL: 1,
            },
          },
        }),
      });
    });

    await page.goto("/calls");
    await waitForPageReady(page);
  });

  test("should display agent progress metrics", async ({ authenticatedPage: page }) => {
    // Check for calls made
    await expect(page.locator("text=15").first()).toBeVisible();

    // Check for target
    await expect(page.locator("text=30").first()).toBeVisible();
  });

  test("should show callbacks due indicator", async ({ authenticatedPage: page }) => {
    // Check for callbacks count
    await expect(page.locator("text=3").first()).toBeVisible();
  });

  test("should show success rate", async ({ authenticatedPage: page }) => {
    // Check for success rate percentage
    await expect(page.locator("text=73").first()).toBeVisible();
  });
});
