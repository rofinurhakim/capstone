import { expect, test } from "@playwright/test";

test("changing password signs the user out and requires a fresh login", async ({ page }) => {
  let submittedPassword: Record<string, string> | undefined;

  await page.addInitScript(() => {
    if (window.location.pathname === "/akun") {
      localStorage.setItem("session", JSON.stringify({
        token: "browser-test-token",
        role: "admin",
        roles: ["admin"],
        name: "Test Admin",
      }));
    }
  });
  await page.route("**/password", async (route) => {
    submittedPassword = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto("/akun");
  await expect(page.getByRole("heading", { name: "Account security" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Account" })).toHaveCount(0);
  const sidebarToggle = page.getByRole("button", { name: "Collapse sidebar" });
  await sidebarToggle.click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await page.getByRole("button", { name: "Open account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Account settings" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator("#primary-sidebar")).toHaveAttribute("aria-modal", "true");
  await page.getByRole("dialog", { name: "Main navigation" }).getByRole("button", { name: "Close menu" }).click();
  await page.getByRole("button", { name: "Open account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "Account settings" })).toBeVisible();
  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByLabel("Current password").fill("current-password");
  await page.getByLabel("New password (at least 8 characters)").fill("new-secure-password");
  await page.getByLabel("Confirm new password").fill("new-secure-password");
  await page.getByRole("button", { name: "Change password" }).click();

  await expect(page).toHaveURL(/\/login\?password-changed=1$/);
  await expect(page.getByRole("status")).toContainText("Please sign in again with your new password.");
  expect(submittedPassword).toEqual({
    current_password: "current-password",
    password: "new-secure-password",
    password_confirmation: "new-secure-password",
  });
  expect(await page.evaluate(() => localStorage.getItem("session"))).toBeNull();
});
