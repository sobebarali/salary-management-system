import { expect, test } from "@playwright/test";

const HOME_URL = /localhost:3001\/$/;

test("sign up, add an employee, and see it reflected in insights", async ({
  page,
}) => {
  const email = `e2e+${Date.now()}@example.com`;

  // The /login route shows the sign-in form by default; switch to sign-up.
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.getByLabel("Name").fill("HR Manager");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL(HOME_URL);

  // Add an employee through the form dialog.
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Lovelace");
  await page.getByLabel("Job title").fill("Engineer");
  await page.getByLabel("Country (ISO)").fill("GB");
  await page.getByLabel("Salary (major units)").fill("90000");
  await page.getByRole("button", { name: "Save" }).click();

  // The new employee appears in the server-side list. Exact match avoids the
  // row's action buttons, whose aria-labels also contain the name.
  await expect(
    page.getByRole("cell", { name: "Ada Lovelace", exact: true })
  ).toBeVisible();

  // Insights reflect the new roster — the DB is clean, so exactly one employee
  // in one country.
  await page.goto("/insights");
  await expect(page.getByTestId("overview-total-employees")).toHaveText("1");
  await expect(page.getByTestId("overview-countries")).toHaveText("1");
});
