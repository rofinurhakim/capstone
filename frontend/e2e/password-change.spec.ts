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
  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByLabel("Current password").fill("current-password");
  await page.getByLabel("New password (at least 8 characters)").fill("new-secure-password");
  await page.getByLabel("Confirm new password").fill("new-secure-password");
  await page.getByRole("button", { name: "Save password" }).click();

  await expect(page).toHaveURL(/\/login\?password-changed=1$/);
  await expect(page.getByRole("status")).toContainText("Please sign in again with your new password.");
  expect(submittedPassword).toEqual({
    current_password: "current-password",
    password: "new-secure-password",
    password_confirmation: "new-secure-password",
  });
  expect(await page.evaluate(() => localStorage.getItem("session"))).toBeNull();
});
