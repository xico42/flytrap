import { expect, test } from "@playwright/test";

test("binary serves the built React app from embedded FS", async ({ page, request }) => {
  await page.goto("/");

  // The React app mounts content into #root.
  const root = page.locator("#root");
  await expect(root).toBeVisible();
  await expect(root).not.toBeEmpty();

  // The hello-world heading is the easiest stable marker.
  await expect(page.getByRole("heading", { name: /hello/i })).toBeVisible();

  // Embedded JS asset is reachable (proves the FS contains assets, not just index.html).
  const html = await page.content();
  const jsAsset = html.match(/\/assets\/[^"']+\.js/)?.[0];
  expect(jsAsset, "built index.html must reference a hashed JS asset").toBeTruthy();

  const assetResponse = await request.get(jsAsset!);
  expect(assetResponse.status()).toBe(200);
});

test("unknown API routes are 404 JSON", async ({ request }) => {
  const response = await request.get("/api/does-not-exist");
  expect(response.status()).toBe(404);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ error: "not found" });
});

test("deep links fall back to index.html so the SPA can take over", async ({ request }) => {
  const response = await request.get("/messages/42");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('id="root"');
});
