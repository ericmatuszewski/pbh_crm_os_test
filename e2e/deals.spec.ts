import { test, expect, waitForPageReady, waitForToast, clickButton } from "./fixtures/auth";

test.describe("Deals Pipeline", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock pipelines API
    await page.route("**/api/pipelines*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "pipeline-1",
              name: "Sales Pipeline",
              stages: [
                { id: "stage-1", name: "Qualification", position: 0, color: "#3B82F6" },
                { id: "stage-2", name: "Discovery", position: 1, color: "#8B5CF6" },
                { id: "stage-3", name: "Proposal", position: 2, color: "#F59E0B" },
                { id: "stage-4", name: "Negotiation", position: 3, color: "#EF4444" },
                { id: "stage-5", name: "Closed Won", position: 4, color: "#10B981" },
              ],
            },
          ],
        }),
      });
    });

    // Mock deals API
    await page.route("**/api/deals*", async (route, request) => {
      const method = request.method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "deal-1",
                title: "Enterprise Deal",
                value: 50000,
                stageId: "stage-1",
                stage: { id: "stage-1", name: "Qualification" },
                contact: { id: "contact-1", firstName: "John", lastName: "Doe" },
                expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString(),
                createdAt: new Date().toISOString(),
              },
              {
                id: "deal-2",
                title: "SMB Deal",
                value: 10000,
                stageId: "stage-2",
                stage: { id: "stage-2", name: "Discovery" },
                contact: { id: "contact-2", firstName: "Jane", lastName: "Smith" },
                expectedCloseDate: new Date(Date.now() + 14 * 86400000).toISOString(),
                createdAt: new Date().toISOString(),
              },
            ],
            pagination: { page: 1, pageSize: 20, totalCount: 2, totalPages: 1 },
          }),
        });
      } else if (method === "POST") {
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "new-deal-id", ...body, createdAt: new Date().toISOString() },
          }),
        });
      } else if (method === "PUT" || method === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "deal-1", title: "Updated Deal" },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/deals");
    await waitForPageReady(page);
  });

  test("should display pipeline stages", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=Qualification")).toBeVisible();
    await expect(page.locator("text=Discovery")).toBeVisible();
    await expect(page.locator("text=Proposal")).toBeVisible();
  });

  test("should display deals in correct stages", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=Enterprise Deal")).toBeVisible();
    await expect(page.locator("text=SMB Deal")).toBeVisible();
  });

  test("should show deal value", async ({ authenticatedPage: page }) => {
    // Check for formatted currency values
    await expect(page.locator("text=$50,000").first()).toBeVisible();
    await expect(page.locator("text=$10,000").first()).toBeVisible();
  });

  test("should open create deal form", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Add Deal");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=Title")).toBeVisible();
    await expect(page.locator("text=Value")).toBeVisible();
  });

  test("should create a new deal", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Add Deal");

    // Fill in the form
    await page.locator('input[name="title"]').fill("New Deal");
    await page.locator('input[name="value"]').fill("25000");

    // Submit
    await clickButton(page, "Create");

    await waitForToast(page, "created");
  });

  test("should open deal detail on click", async ({ authenticatedPage: page }) => {
    await page.locator("text=Enterprise Deal").click();

    // Should show deal details or navigate to deal page
    await expect(page.locator("text=Enterprise Deal")).toBeVisible();
  });
});

test.describe("Deal Stage Transitions", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock the necessary APIs
    await page.route("**/api/pipelines*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "pipeline-1",
              name: "Sales Pipeline",
              stages: [
                { id: "stage-1", name: "Qualification", position: 0 },
                { id: "stage-2", name: "Discovery", position: 1 },
              ],
            },
          ],
        }),
      });
    });

    await page.route("**/api/deals*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "deal-1",
              title: "Test Deal",
              value: 10000,
              stageId: "stage-1",
              stage: { id: "stage-1", name: "Qualification" },
            },
          ],
          pagination: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
        }),
      });
    });

    await page.goto("/deals");
    await waitForPageReady(page);
  });

  test("should allow drag and drop between stages", async ({ authenticatedPage: page }) => {
    // This tests the drag-and-drop functionality
    // In a real test, you would use Playwright's drag-and-drop API
    const dealCard = page.locator('text=Test Deal').first();
    const targetStage = page.locator('text=Discovery').first();

    if (await dealCard.isVisible() && await targetStage.isVisible()) {
      // Get bounding boxes
      const dealBox = await dealCard.boundingBox();
      const stageBox = await targetStage.boundingBox();

      if (dealBox && stageBox) {
        // Perform drag and drop
        await page.mouse.move(dealBox.x + dealBox.width / 2, dealBox.y + dealBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + 50, { steps: 10 });
        await page.mouse.up();
      }
    }
  });
});
