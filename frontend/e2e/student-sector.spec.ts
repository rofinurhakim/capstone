import { expect, test } from "@playwright/test";

test("academic admin registers a student with a sector selected from the approved list", async ({ page }) => {
  let submittedStudent: Record<string, string> | undefined;
  const sectors = [
    "Eden", "Efrata", "Galilea", "Gloria", "Haleluya", "Hosiana", "Imanuel",
    "Makedonia", "Maranatha", "Nafiri", "Nazareth", "Sion", "Syalom", "Yerusalem",
  ];

  await page.addInitScript(() => {
    localStorage.setItem("session", JSON.stringify({
      token: "browser-test-token",
      role: "academic_admin",
      roles: ["academic_admin"],
      name: "Academic Admin",
    }));
  });
  await page.route("**/academic-years", (route) => route.fulfill({ json: [] }));
  await page.route("**/students", async (route) => {
    const student = route.request().postDataJSON() as Record<string, string>;
    submittedStudent = student;
    await route.fulfill({ json: { student: { name: student.name, nis: "S-TEST" } } });
  });

  await page.goto("/murid-baru");
  await page.getByRole("button", { name: "Open student registration form" }).click();
  const sector = page.getByLabel("Sector");
  await expect(sector.locator("option")).toHaveCount(sectors.length + 1);
  expect(await sector.locator("option").evaluateAll((options) => options.slice(1).map((option) => (option as HTMLOptionElement).value))).toEqual(sectors);

  await page.getByLabel("Student name").fill("Sector Test Student");
  await sector.selectOption("Eden");
  await page.getByLabel("Parent/guardian name").fill("Test Guardian");
  await page.getByLabel("Relationship").fill("Parent");
  await page.getByLabel("Guardian phone").fill("08123456789");
  await page.getByLabel("Parent/guardian email").fill("guardian@example.test");
  await page.getByRole("button", { name: "Register student" }).click();

  await expect(page.locator("[role='status']").filter({ hasText: "Sector Test Student was registered" })).toBeVisible();
  expect(submittedStudent?.sector).toBe("Eden");
});
