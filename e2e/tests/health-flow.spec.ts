import { expect, test } from "@playwright/test";

test("frontend renders 'healthy' after calling /api/health", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("health-status")).toHaveText("healthy");
});

test("theme switcher changes data-theme on the document root", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("combobox", { name: "theme" }).selectOption("dracula");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dracula");
});
