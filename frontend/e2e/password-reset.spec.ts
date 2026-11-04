import { expect, test } from "@playwright/test";

test("password help explains the authenticated change flow without email", async ({ page }) => {
  await page.goto("/lupa-sandi");

  await expect(page.getByRole("heading", { name: "Change your password" })).toBeVisible();
  await expect(page.getByText(/Password changes do not use email/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
});
