import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "academic@kursus.test";
const parentEmail = process.env.E2E_PARENT_EMAIL ?? "ortu@kursus.test";
const teacherEmail = process.env.E2E_TEACHER_EMAIL ?? "guru@kursus.test";
const password = process.env.E2E_PASSWORD ?? "password";

async function signIn(page: Page, email: string, passwordValue = password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(passwordValue);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (passwordValue === password) {
    await expect(page).toHaveURL(email === parentEmail ? /\/rapor$/ : /\/$/);
  }
}

test("rejects invalid credentials and then signs in successfully", async ({ page }) => {
  await page.goto("/login");
  const passwordInput = page.getByLabel("Password");
  await passwordInput.fill("sample-password");
  await page.getByRole("button", { name: "Show text" }).click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide text" }).click();
  await expect(passwordInput).toHaveAttribute("type", "password");

  await signIn(page, adminEmail, "invalid-password");
  await expect(page.locator("form [role='alert']")).toContainText("The email or password is incorrect.");

  await signIn(page, adminEmail);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Reports without manual spreadsheets." })).toBeVisible();
});

test("academic admin can reach all operational screens and open action modals", async ({ page }) => {
  await signIn(page, adminEmail);

  const routes = [
    ["/", "Reports without manual spreadsheets."],
    ["/nilai", "Grade entry"],
    ["/absensi", "Class attendance"],
    ["/kalender", "Academic calendar"],
    ["/rapor", "Bethesda English Course · Sidoarjo"],
    ["/daftar-ulang", "Enrollment"],
    ["/murid-baru", "Register a new student"],
    ["/murid", "Student records"],
    ["/kelas", "Classes and academic years"],
    ["/akun", "Account"],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(route);
    const pageTitle = route === "/rapor"
      ? page.getByText(heading, { exact: true })
      : page.getByRole("heading", { name: heading, exact: true }).first();
    await expect(pageTitle).toBeVisible();
  }

  await page.goto("/placement-test");
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();

  await page.goto("/murid-baru");
  await expect(page.getByRole("heading", { name: "Student information" })).toBeVisible();
  await expect(page.getByLabel("Student name")).toBeVisible();
  await expect(page.getByLabel("Parent/guardian email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Register student" })).toBeVisible();

  await page.goto("/kelas");
  await expect(page.getByRole("heading", { name: "Class sections" })).toBeVisible();
  await page.getByRole("button", { name: "Add section" }).click();
  await expect(page.getByRole("heading", { name: "Add class" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.goto("/kalender");
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByRole("heading", { name: "Add academic event" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("parent can access family features but is redirected from teacher grade entry", async ({ page }) => {
  await signIn(page, parentEmail);
  await expect(page).toHaveURL(/\/rapor$/);

  for (const [route, heading] of [
    ["/guru", "Your child's teachers"],
    ["/daftar-ulang", "Enrollment"],
    ["/kalender", "Academic calendar"],
    ["/akun", "Account"],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }

  await page.goto("/murid-baru");
  await expect(page).toHaveURL(/\/rapor$/);

  await page.goto("/nilai");
  await expect(page).toHaveURL(/\/rapor$/);
});

test("teacher can view the annual report card", async ({ page }) => {
  await signIn(page, teacherEmail);
  await page.goto("/absensi");
  const lockedAttendanceRow = page.locator("tr").filter({ hasText: "Report published — attendance locked" });
  await expect(lockedAttendanceRow).toBeVisible();
  await expect(lockedAttendanceRow.getByRole("combobox")).toBeDisabled();

  await page.goto("/rapor");

  await expect(page.getByRole("heading", { name: "Alya Putri" })).toBeVisible();
  await expect(page.getByText("Greetings and introductions")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Teacher's comment" })).toBeVisible();
  await expect(page.locator(".report-comment p")).not.toHaveText("No teacher comment has been added.");
  await expect(page.locator(".report-total-result strong")).toHaveText(/^\d+\.\d{2}$/);
});
