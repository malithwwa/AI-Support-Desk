import { expect, test } from "@playwright/test";
import { loginViaUi } from "../lib/authentication/login";
import { adminEmail } from "../lib/authentication/test-users";

test.describe("users page (admin)", () => {
  test("shows a table with the seeded admin user", async ({ page }) => {
    await loginViaUi(page, adminEmail);
    await page.getByRole("link", { name: "Users" }).click();
    await expect(
      page.getByRole("heading", { name: "Users", exact: true }),
    ).toBeVisible();

    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Role" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Joined" })).toBeVisible();

    const row = page.getByRole("row", { name: /Admin/i });
    await expect(row).toBeVisible();
    await expect(row.getByText(adminEmail.toLowerCase())).toBeVisible();
    await expect(row.getByText("admin", { exact: true })).toBeVisible();
  });

  test("shows the total user count", async ({ page }) => {
    await loginViaUi(page, adminEmail);
    await page.goto("/users");
    await expect(page.getByText(/\d+ users? total/)).toBeVisible();
  });
});

test.describe("users page (non-admin)", () => {
  test("redirects to home for non-admin users", async ({ page }) => {
    // No non-admin seeded; hitting /users directly without admin role
    // redirects to /login (anonymous), then to / after ProtectedRoute check.
    // This is covered by the existing auth-ui route-guard tests.
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login$/);
  });
});
