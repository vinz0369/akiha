import { expect, test } from "@playwright/test";

test("renders the private login shell without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "akiha" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Vào Akiha/ })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("publishes installable PNG and maskable icons", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json() as {
    id?: string;
    display?: string;
    icons?: Array<{ src: string; sizes: string; purpose?: string }>;
    shortcuts?: Array<{ name: string; url: string }>;
  };
  expect(manifest.id).toBe("/");
  expect(manifest.display).toBe("standalone");
  expect(manifest.shortcuts).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "Gửi khoảnh khắc", url: "/#camera" }),
    expect.objectContaining({ name: "Mở lịch ảnh", url: "/calendar" }),
  ]));
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }),
    expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" }),
    expect.objectContaining({ src: "/icons/maskable-512.png", sizes: "512x512", purpose: "maskable" }),
  ]));

  const workerResponse = await request.get("/sw.js", { maxRedirects: 0 });
  expect(workerResponse.status()).toBe(200);
  expect(workerResponse.headers()["content-type"]).toContain("javascript");
  expect(await workerResponse.text()).toContain("addEventListener");
});

test("returns JSON auth errors from the chat API instead of redirecting POST requests", async ({ request }) => {
  const response = await request.post("/api/chat", {
    data: { messages: [{ role: "user", content: "test" }] },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({
    error: "Bạn cần đăng nhập lại để trò chuyện.",
  });
});
