import { expect, test } from "@playwright/test";

test("parent report prints on a single A4 page", async ({ page }) => {
  const year = String(new Date().getFullYear());

  await page.addInitScript(() => {
    localStorage.setItem("session", JSON.stringify({
      token: "browser-test-token",
      role: "parent",
      roles: ["parent"],
      name: "Test Parent",
    }));
  });
  await page.route("**/academic-years", (route) => route.fulfill({ json: [] }));
  await page.route("**/roster?term=*", (route) => route.fulfill({
    json: [{
      id: 1,
      student_id: 1,
      classroom_id: 1,
      name: "PDF Test Student",
      level: "MATTHEW A",
      class: "MATTHEW A",
      status: "confirmed",
      scores: { Participation: 90, Assignment: 85, "Mid Term Test": 80, "Final Test": 90 },
      note: "A positive learning comment.",
      teacher_name: "Test Teacher",
      coordinator_name: "Test Academic",
    }],
  }));
  await page.route("**/assessment-weights?term=*", (route) => route.fulfill({
    json: { weights: { Participation: 20, Assignment: 30, "Mid Term Test": 20, "Final Test": 30 } },
  }));
  await page.route("**/themes?classroom_id=*&term=*", (route) => route.fulfill({
    json: [{ id: 1, theme: "Greetings and introductions", position: 1 }],
  }));

  await page.goto("/rapor");
  await expect(page.getByRole("heading", { name: "PDF Test Student" })).toBeVisible();
  await expect(page.locator(".report-kicker")).toContainText(year);
  await expect(page.getByText("Greetings and introductions")).toBeVisible();

  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
  const pageCount = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  expect(pageCount).toBe(1);
});
