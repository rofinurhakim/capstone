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
  await page.route("**/academic-years", (route) => route.fulfill({ json: [
    { term: "2026", start_date: "2026-08-01", end_date: "2027-05-31", registration_locked: true, registration_lock_date: "2026-09-01" },
    { term: "2027", start_date: "2027-08-01", end_date: "2028-05-31", registration_locked: false, registration_lock_date: "2027-09-01" },
  ] }));
  await page.route("**/students", async (route) => {
    const student = route.request().postDataJSON() as Record<string, string>;
    submittedStudent = student;
    await route.fulfill({ json: { student: { name: student.name, nis: "S-TEST" } } });
  });

  await page.goto("/murid-baru");
  const sector = page.getByLabel("Sector");
  await expect(sector.locator("option")).toHaveCount(sectors.length + 1);
  expect(await sector.locator("option").evaluateAll((options) => options.slice(1).map((option) => (option as HTMLOptionElement).value))).toEqual(sectors);
  const academicPeriod = page.getByLabel("Academic period");
  await expect(academicPeriod.locator("option").filter({ hasText: "Locked for new registrations" })).toHaveAttribute("disabled", "");
  await expect(academicPeriod).toHaveValue("2027");

  await page.getByLabel("Student name").fill("Sector Test Student");
  await sector.selectOption("Eden");
  await page.getByLabel("Parent/guardian name").fill("Test Guardian");
  await page.getByLabel("Relationship").fill("Parent");
  await page.getByLabel("Guardian phone").fill("08123456789");
  await page.getByLabel("Parent/guardian email").fill("guardian@example.test");
  await page.getByRole("button", { name: "Register student" }).click();

  await expect(page.locator("[role='status']").filter({ hasText: "Sector Test Student was registered" })).toBeVisible();
  expect(submittedStudent?.sector).toBe("Eden");
  expect(submittedStudent?.term).toBe("2027");
});
