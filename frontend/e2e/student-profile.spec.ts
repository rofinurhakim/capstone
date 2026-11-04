import { expect, test } from "@playwright/test";

const student = {
  id: 501,
  student_id: 900,
  nis: "BEC-00900",
  name: "Alya Putri",
  level: "MATTHEW A",
  class: "Matthew A",
  term: "2026",
  status: "confirmed",
  scores: {
    Participation: 77.78,
    Assignment: 90.5,
    "Mid Term Test": 84,
    "Final Test": 91,
  },
  note: "Alya participates with curiosity and is growing in confidence.",
  gender: "female",
  birth_date: "2018-03-12",
  school_name: "SDN Pucang",
  school_class: "1SD",
  sector: "Imanuel",
  phone: "08123456789",
  guardian_name: "Orang Tua Contoh",
  guardian_relation: "Parent",
  guardian_phone: "08129876543",
  guardian_email: "ortu@kursus.test",
};

test("student profile presents personal, guardian, and performance details", async ({ page }) => {
  await page.addInitScript(() => {
    if (window.location.pathname.startsWith("/murid/")) {
      localStorage.setItem("session", JSON.stringify({
        token: "browser-test-token",
        role: "admin",
        roles: ["admin"],
        name: "Test Admin",
      }));
    }
  });
  await page.route("**/roster**", async (route) => {
    await route.fulfill({ json: [student] });
  });

  await page.goto("/murid/501?term=2026");

  await expect(page.getByRole("heading", { name: "Alya Putri" })).toBeVisible();
  await expect(page.getByText("Student ID BEC-00900")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Personal information" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parent / guardian" })).toBeVisible();
  await expect(page.getByText("Orang Tua Contoh")).toBeVisible();
  await expect(page.getByText("86.81")).toBeVisible();
  await expect(page.getByText("Alya participates with curiosity and is growing in confidence.")).toBeVisible();
});

test("parent can update the student profile from account settings", async ({ page }) => {
  let savedProfile: Record<string, unknown> | undefined;

  await page.addInitScript(() => {
    if (window.location.pathname === "/akun") {
      localStorage.setItem("session", JSON.stringify({
        token: "browser-test-token",
        role: "parent",
        roles: ["parent"],
        name: "Orang Tua Contoh",
      }));
    }
  });
  await page.route("**/my-students", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: [{ ...student, id: 900 }] });
      return;
    }
    await route.continue();
  });
  await page.route("**/my-students/900", async (route) => {
    savedProfile = route.request().postDataJSON();
    await route.fulfill({ json: { ...student, ...savedProfile } });
  });

  await page.goto("/akun");
  await expect(page.getByRole("heading", { name: "Child information" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alya Putri" })).toBeVisible();
  await expect(page.getByText("School information")).toBeVisible();
  await page.getByLabel("School class").fill("2SD");
  await page.getByRole("button", { name: "Save student information" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Student information updated successfully." })).toBeVisible();
  expect(savedProfile).toMatchObject({ name: "Alya Putri", school_class: "2SD" });
});
