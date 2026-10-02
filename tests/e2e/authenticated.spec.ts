import path from "node:path";
import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

const runAuthenticated = process.env.AKIHA_RUN_AUTH_E2E === "1";
const userEmail = process.env.AKIHA_TEST_USER_EMAIL ?? "thu@akiha.local";
const userPassword = process.env.AKIHA_TEST_USER_PASSWORD ?? "akiha-local-user";
const partnerEmail = process.env.AKIHA_TEST_PARTNER_EMAIL ?? "vinh@akiha.local";
const partnerPassword = process.env.AKIHA_TEST_PARTNER_PASSWORD ?? "akiha-local-admin";

function resetToday() {
  execFileSync("docker", ["exec", "supabase_db_akiha", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", "delete from public.protected_days where local_date=public.local_today(); delete from public.checkins where local_date=public.local_today();"], { stdio: "ignore" });
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: /Vào Akiha/ }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
}

async function uploadMoment(page: Page, caption: string) {
  await page.goto("/check-in");
  await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "couple_pic.jpg"));
  await page.getByLabel(/Ghi chú/).fill(caption);
  await page.getByRole("button", { name: "Gửi cho người thương" }).click();
  await expect(page.getByRole("heading", { name: /Một khoảnh khắc mới/ })).toBeVisible({ timeout: 20_000 });
}

test.describe("couple daily moments", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!runAuthenticated, "Set AKIHA_RUN_AUTH_E2E=1 with the local Supabase stack running");

  test("Thu can send multiple moments in the same day", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Run the stateful flow once");
    resetToday();
    await login(page, userEmail, userPassword);
    await uploadMoment(page, "Khoảnh khắc thứ nhất");
    await uploadMoment(page, "Khoảnh khắc thứ hai");
    await page.goto("/");
    await expect(page.getByRole("link", { name: "2 ảnh trong album hôm nay. Mở album." })).toBeVisible();
  });

  test("Vinh enters the same home, sees Thu's album, and admin is gone", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Run the stateful flow once");
    await login(page, partnerEmail, partnerPassword);
    await page.getByRole("link", { name: "2 ảnh trong album hôm nay. Mở album." }).click();
    await page.getByRole("button", { name: "Thả tim" }).first().click();
    await page.goto("/calendar");
    await expect(page.getByRole("grid", { name: "Lịch album của hai đứa" })).toBeVisible();
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    const removed = await page.goto("/admin");
    expect(removed?.status()).toBe(404);
  });
});
