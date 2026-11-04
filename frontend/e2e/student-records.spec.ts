import { expect, test } from "@playwright/test";

test("student records show success alerts after save, guardian reset, and delete", async ({ page }) => {
  await page.addInitScript(() => {
    if (window.location.pathname === "/murid") {
      localStorage.setItem("session", JSON.stringify({
        token: "browser-test-token",
        role: "admin",
        roles: ["admin"],
        name: "Test Admin",
      }));
    }
  });
  await page.route("**/academic-years", async (route) => {
    await route.fulfill({ json: [{ term: "2026", start_date: "2026-08-01", end_date: "2027-05-31" }] });
  });
  await page.route("**/roster**", async (route) => {
    await route.fulfill({ json: [{
      id: 501,
      student_id: 900,
      nis: "BEC-00900",
      name: "Alya Putri",
      level: "MATTHEW A",
      class: "Matthew A",
      term: "2026",
      status: "confirmed",
      scores: {},
      school_name: "SDN Pucang",
      school_class: "1SD",
      sector: "Imanuel",
    }] });
  });
  await page.route("**/students/900", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({ json: { id: 900 } });
      return;
    }
    if (route.request().method() === "DELETE") {
      await route.fulfill({ json: { ok: true } });
      return;
    }
    await route.continue();
  });
  await page.route("**/students/900/reset-guardian", async (route) => {
    await route.fulfill({ json: { password: "temporary-parent-password" } });
  });

  await page.goto("/murid");
  await expect(page.getByRole("heading", { name: "Student records" })).toBeVisible();
  const studentCard = page.locator("li").filter({ hasText: "Alya Putri" });
  await expect(studentCard).toBeVisible();

  await studentCard.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Student details saved." })).toBeVisible();

  await studentCard.getByRole("button", { name: "Reset password" }).click();
  const resetDialog = page.getByRole("dialog");
  await expect(resetDialog).toContainText("Reset guardian password?");
  await resetDialog.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guardian password reset successfully." })).toBeVisible();
  await expect(studentCard.getByRole("status")).toContainText("temporary-parent-password");

  await studentCard.getByRole("button", { name: "Delete Alya Putri" }).click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toContainText("Delete student?");
  await deleteDialog.getByRole("button", { name: "Delete student" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Student deleted successfully." })).toBeVisible();
  await expect(studentCard).toHaveCount(0);
});
