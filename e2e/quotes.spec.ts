import { test, expect, waitForPageReady, waitForToast, clickButton } from "./fixtures/auth";

test.describe("Quotes Management", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock quotes API
    await page.route("**/api/quotes*", async (route, request) => {
      const method = request.method();
      const url = request.url();

      if (method === "GET" && !url.includes("/api/quotes/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "quote-1",
                quoteNumber: "QT-2026-001",
                title: "Enterprise Software License",
                status: "DRAFT",
                subtotal: 50000,
                taxAmount: 5000,
                discountAmount: 2500,
                total: 52500,
                validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
                contact: { id: "contact-1", firstName: "John", lastName: "Doe" },
                deal: { id: "deal-1", title: "Enterprise Deal" },
                createdAt: new Date().toISOString(),
              },
              {
                id: "quote-2",
                quoteNumber: "QT-2026-002",
                title: "Annual Support Contract",
                status: "SENT",
                subtotal: 12000,
                taxAmount: 1200,
                discountAmount: 0,
                total: 13200,
                validUntil: new Date(Date.now() + 14 * 86400000).toISOString(),
                contact: { id: "contact-2", firstName: "Jane", lastName: "Smith" },
                deal: { id: "deal-2", title: "Support Contract" },
                createdAt: new Date().toISOString(),
              },
              {
                id: "quote-3",
                quoteNumber: "QT-2026-003",
                title: "Consulting Services",
                status: "ACCEPTED",
                subtotal: 25000,
                taxAmount: 2500,
                discountAmount: 1250,
                total: 26250,
                validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
                contact: { id: "contact-3", firstName: "Bob", lastName: "Wilson" },
                createdAt: new Date().toISOString(),
              },
            ],
            pagination: { page: 1, pageSize: 20, totalCount: 3, totalPages: 1 },
          }),
        });
      } else if (method === "POST") {
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "new-quote-id",
              quoteNumber: "QT-2026-004",
              ...body,
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock products API for line items
    await page.route("**/api/products*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: "product-1", name: "Software License", price: 10000, sku: "SW-001" },
            { id: "product-2", name: "Support Package", price: 2000, sku: "SP-001" },
            { id: "product-3", name: "Training", price: 5000, sku: "TR-001" },
          ],
        }),
      });
    });

    await page.goto("/quotes");
    await waitForPageReady(page);
  });

  test("should display quotes list", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=QT-2026-001")).toBeVisible();
    await expect(page.locator("text=QT-2026-002")).toBeVisible();
    await expect(page.locator("text=QT-2026-003")).toBeVisible();
  });

  test("should show quote status badges", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=DRAFT").first()).toBeVisible();
    await expect(page.locator("text=SENT").first()).toBeVisible();
    await expect(page.locator("text=ACCEPTED").first()).toBeVisible();
  });

  test("should show quote totals", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=$52,500").first()).toBeVisible();
    await expect(page.locator("text=$13,200").first()).toBeVisible();
  });

  test("should open create quote form", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Create Quote");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=Title")).toBeVisible();
  });

  test("should filter quotes by status", async ({ authenticatedPage: page }) => {
    const statusFilter = page.locator('button:has-text("Status"), select[name="status"]').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.locator('[role="option"]:has-text("Sent")').click();
    }
  });
});

test.describe("Quote Detail and Actions", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock single quote API
    await page.route("**/api/quotes/quote-1*", async (route, request) => {
      const method = request.method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "quote-1",
              quoteNumber: "QT-2026-001",
              title: "Enterprise Software License",
              status: "DRAFT",
              subtotal: 50000,
              taxAmount: 5000,
              discountAmount: 2500,
              total: 52500,
              validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
              contact: { id: "contact-1", firstName: "John", lastName: "Doe", email: "john@example.com" },
              deal: { id: "deal-1", title: "Enterprise Deal" },
              lineItems: [
                { id: "item-1", productId: "product-1", productName: "Software License", quantity: 5, unitPrice: 10000, total: 50000 },
              ],
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else if (method === "PUT" || method === "PATCH") {
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "quote-1", ...body },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/quotes/quote-1");
    await waitForPageReady(page);
  });

  test("should display quote details", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=QT-2026-001")).toBeVisible();
    await expect(page.locator("text=Enterprise Software License")).toBeVisible();
    await expect(page.locator("text=John Doe")).toBeVisible();
  });

  test("should show line items", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=Software License")).toBeVisible();
    await expect(page.locator("text=$50,000").first()).toBeVisible();
  });

  test("should show totals breakdown", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=Subtotal")).toBeVisible();
    await expect(page.locator("text=Tax")).toBeVisible();
    await expect(page.locator("text=Discount")).toBeVisible();
    await expect(page.locator("text=Total")).toBeVisible();
  });

  test("should have send quote action", async ({ authenticatedPage: page }) => {
    const sendButton = page.locator('button:has-text("Send"), button:has-text("Email")').first();
    await expect(sendButton).toBeVisible();
  });

  test("should have download PDF action", async ({ authenticatedPage: page }) => {
    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("Download")').first();
    await expect(pdfButton).toBeVisible();
  });
});

test.describe("Quote Status Transitions", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/quotes/quote-1*", async (route, request) => {
      const method = request.method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "quote-1",
              quoteNumber: "QT-2026-001",
              status: "DRAFT",
              total: 52500,
            },
          }),
        });
      } else if (method === "PUT" || method === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/quotes/quote-1");
    await waitForPageReady(page);
  });

  test("should transition quote from draft to sent", async ({ authenticatedPage: page }) => {
    const sendButton = page.locator('button:has-text("Send")').first();

    if (await sendButton.isVisible()) {
      await sendButton.click();

      // Should show confirmation or update status
      await page.waitForResponse((res) => res.url().includes("/api/quotes"));
    }
  });
});
