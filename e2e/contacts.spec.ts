import { test, expect, waitForPageReady, waitForToast, clickButton } from "./fixtures/auth";

test.describe("Contacts CRUD Operations", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock contacts API
    await page.route("**/api/contacts*", async (route, request) => {
      const method = request.method();
      const url = request.url();

      if (method === "GET" && !url.includes("/api/contacts/")) {
        // List contacts
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "contact-1",
                firstName: "John",
                lastName: "Doe",
                email: "john.doe@example.com",
                phone: "+1234567890",
                status: "LEAD",
                leadScore: 75,
                createdAt: new Date().toISOString(),
              },
              {
                id: "contact-2",
                firstName: "Jane",
                lastName: "Smith",
                email: "jane.smith@example.com",
                phone: "+0987654321",
                status: "CUSTOMER",
                leadScore: 90,
                createdAt: new Date().toISOString(),
              },
            ],
            pagination: { page: 1, pageSize: 20, totalCount: 2, totalPages: 1 },
          }),
        });
      } else if (method === "POST") {
        // Create contact
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "new-contact-id",
              ...body,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/contacts");
    await waitForPageReady(page);
  });

  test("should display contacts list with data", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=John Doe")).toBeVisible();
    await expect(page.locator("text=jane.smith@example.com")).toBeVisible();
  });

  test("should open contact creation form", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Add Contact");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=First Name")).toBeVisible();
    await expect(page.locator("text=Last Name")).toBeVisible();
    await expect(page.locator("text=Email")).toBeVisible();
  });

  test("should create a new contact", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Add Contact");

    // Fill in the form
    await page.locator('input[name="firstName"]').fill("New");
    await page.locator('input[name="lastName"]').fill("Contact");
    await page.locator('input[name="email"]').fill("new.contact@example.com");
    await page.locator('input[name="phone"]').fill("+1112223333");

    // Submit the form
    await clickButton(page, "Create");

    // Wait for success
    await waitForToast(page, "created");
  });

  test("should show validation errors for required fields", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Add Contact");

    // Try to submit empty form
    await clickButton(page, "Create");

    // Should show validation errors
    await expect(page.locator("text=required").first()).toBeVisible({ timeout: 5000 });
  });

  test("should filter contacts by search", async ({ authenticatedPage: page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    await searchInput.fill("John");
    await searchInput.press("Enter");

    // Wait for filtered results
    await page.waitForResponse((res) => res.url().includes("/api/contacts"));
  });

  test("should filter contacts by status", async ({ authenticatedPage: page }) => {
    // Find and click status filter
    const statusFilter = page.locator('button:has-text("Status"), [aria-label*="Status"]').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.locator('[role="option"]:has-text("Customer")').click();
    }
  });
});

test.describe("Contact Detail View", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock single contact API
    await page.route("**/api/contacts/contact-1*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "contact-1",
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "+1234567890",
            status: "LEAD",
            leadScore: 75,
            company: { id: "company-1", name: "Acme Corp" },
            deals: [],
            activities: [],
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/contacts/contact-1");
    await waitForPageReady(page);
  });

  test("should display contact details", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=John Doe")).toBeVisible();
    await expect(page.locator("text=john.doe@example.com")).toBeVisible();
  });

  test("should show lead score", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=75").first()).toBeVisible();
  });
});
