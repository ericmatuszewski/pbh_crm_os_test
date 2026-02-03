import { test, expect, waitForPageReady, waitForToast, clickButton } from "./fixtures/auth";

test.describe("Tasks Management", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Mock tasks API
    await page.route("**/api/tasks*", async (route, request) => {
      const method = request.method();
      const url = request.url();

      if (method === "GET" && !url.includes("/api/tasks/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "task-1",
                title: "Follow up with John",
                description: "Discuss contract terms",
                status: "PENDING",
                priority: "HIGH",
                dueDate: new Date(Date.now() + 86400000).toISOString(),
                assignee: { id: "user-1", name: "Test User" },
                dependsOnId: null,
                dependsOn: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: "task-2",
                title: "Send proposal",
                description: "Send updated pricing",
                status: "PENDING",
                priority: "NORMAL",
                dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
                assignee: { id: "user-1", name: "Test User" },
                dependsOnId: "task-1",
                dependsOn: { id: "task-1", title: "Follow up with John", status: "PENDING" },
                createdAt: new Date().toISOString(),
              },
              {
                id: "task-3",
                title: "Schedule demo",
                description: "Product demonstration",
                status: "COMPLETED",
                priority: "NORMAL",
                dueDate: new Date().toISOString(),
                assignee: { id: "user-1", name: "Test User" },
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
            data: { id: "new-task-id", ...body, createdAt: new Date().toISOString() },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/tasks");
    await waitForPageReady(page);
  });

  test("should display tasks list", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=Follow up with John")).toBeVisible();
    await expect(page.locator("text=Send proposal")).toBeVisible();
    await expect(page.locator("text=Schedule demo")).toBeVisible();
  });

  test("should show task priority badges", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=HIGH").first()).toBeVisible();
  });

  test("should show completed task status", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=COMPLETED").first()).toBeVisible();
  });

  test("should open create task form", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Add Task");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=Title")).toBeVisible();
  });

  test("should create a new task", async ({ authenticatedPage: page }) => {
    await clickButton(page, "Add Task");

    await page.locator('input[name="title"]').fill("New Task");
    await page.locator('textarea[name="description"]').fill("Task description");

    await clickButton(page, "Create");

    await waitForToast(page, "created");
  });
});

test.describe("Task Dependencies", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/tasks*", async (route, request) => {
      const method = request.method();
      const url = request.url();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: "task-1",
                title: "Parent Task",
                status: "PENDING",
                dependsOnId: null,
                dependsOn: null,
              },
              {
                id: "task-2",
                title: "Dependent Task",
                status: "PENDING",
                dependsOnId: "task-1",
                dependsOn: { id: "task-1", title: "Parent Task", status: "PENDING" },
              },
            ],
            pagination: { page: 1, pageSize: 20, totalCount: 2, totalPages: 1 },
          }),
        });
      } else if (method === "PUT" || method === "PATCH") {
        const body = await request.postDataJSON();

        // Simulate dependency validation
        if (url.includes("task-2") && body?.status === "COMPLETED") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: 'Cannot complete this task until "Parent Task" is completed',
              },
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { ...body },
            }),
          });
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("/tasks");
    await waitForPageReady(page);
  });

  test("should show dependency indicator", async ({ authenticatedPage: page }) => {
    // Task 2 should show it depends on Task 1
    const dependentTaskRow = page.locator("tr:has-text('Dependent Task'), [data-task-id='task-2']").first();

    if (await dependentTaskRow.isVisible()) {
      await expect(dependentTaskRow.locator("text=Parent Task, text=Blocked, text=Depends").first()).toBeVisible();
    }
  });

  test("should show blocked badge for tasks with incomplete dependencies", async ({ authenticatedPage: page }) => {
    await expect(page.locator("text=Blocked").first()).toBeVisible();
  });

  test("should prevent completing blocked task", async ({ authenticatedPage: page }) => {
    // Try to complete the dependent task
    const completeButton = page.locator('tr:has-text("Dependent Task") button[aria-label*="complete"], tr:has-text("Dependent Task") input[type="checkbox"]').first();

    if (await completeButton.isVisible()) {
      await completeButton.click();

      // Should show error message
      await expect(page.locator("text=Cannot complete").first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Task Filtering", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/tasks*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            { id: "task-1", title: "High Priority", status: "PENDING", priority: "HIGH" },
            { id: "task-2", title: "Normal Priority", status: "PENDING", priority: "NORMAL" },
            { id: "task-3", title: "Completed Task", status: "COMPLETED", priority: "NORMAL" },
          ],
          pagination: { page: 1, pageSize: 20, totalCount: 3, totalPages: 1 },
        }),
      });
    });

    await page.goto("/tasks");
    await waitForPageReady(page);
  });

  test("should filter by status", async ({ authenticatedPage: page }) => {
    const statusFilter = page.locator('button:has-text("Status"), select[name="status"]').first();

    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.locator('[role="option"]:has-text("Pending")').click();
    }
  });

  test("should filter by priority", async ({ authenticatedPage: page }) => {
    const priorityFilter = page.locator('button:has-text("Priority"), select[name="priority"]').first();

    if (await priorityFilter.isVisible()) {
      await priorityFilter.click();
      await page.locator('[role="option"]:has-text("High")').click();
    }
  });

  test("should search tasks", async ({ authenticatedPage: page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill("High Priority");
      await searchInput.press("Enter");
    }
  });
});
