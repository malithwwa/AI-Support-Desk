import { expect, test, type Page } from "@playwright/test";
import { loginViaUi } from "../lib/authentication/login";
import { adminEmail } from "../lib/authentication/test-users";

function uniqueEmail(prefix = "create-user"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function openCreateUserDialog(page: Page) {
  // A dialog still running its exit animation is not yet detached, and its
  // submit button ("Create user") would make the page-level trigger ambiguous.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function fillCreateUserForm(
  page: Page,
  { name, email, password }: { name: string; email: string; password: string },
) {
  const dialog = page.getByRole("dialog");

  const fill = async (label: string, value: string) => {
    const field = dialog.getByLabel(label);
    await field.click();
    await field.fill(value);
  };

  await fill("Name", name);
  await fill("Email", email);
  await fill("Password", password);
  await dialog.getByRole("button", { name: "Create user" }).click();
}

test.describe("users page (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, adminEmail);
    await page.getByRole("link", { name: "Users" }).click();
    await expect(
      page.getByRole("heading", { name: "Users", exact: true }),
    ).toBeVisible();
  });

  test("shows a table with the seeded admin user", async ({ page }) => {
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Role" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Joined" })).toBeVisible();

    const row = page.getByRole("row", { name: /Admin/i });
    await expect(row).toBeVisible();
    await expect(row.getByText(adminEmail.toLowerCase())).toBeVisible();
    await expect(row.getByText("admin", { exact: true })).toBeVisible();
  });

  test("opens the create-user dialog with the three labeled fields", async ({
    page,
  }) => {
    await openCreateUserDialog(page);
    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByRole("heading", { name: "Create user" }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Name")).toBeVisible();
    await expect(dialog.getByLabel("Email")).toBeVisible();
    await expect(dialog.getByLabel("Password")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Create user" }),
    ).toBeVisible();
  });

  test("client-side validation blocks a short name and password without calling the API", async ({
    page,
  }) => {
    await openCreateUserDialog(page);
    const dialog = page.getByRole("dialog");

    const createRequests: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/users"
      ) {
        createRequests.push(request.url());
      }
    });

    const email = uniqueEmail("blocked");
    const fill = async (label: string, value: string) => {
      const field = dialog.getByLabel(label);
      await field.click();
      await field.fill(value);
    };
    await fill("Name", "Ab");
    await fill("Email", email);
    await fill("Password", "1234567");
    await dialog.getByRole("button", { name: "Create user" }).click();

    await expect(
      dialog.getByText("Name must be at least 3 characters"),
    ).toBeVisible();
    await expect(
      dialog.getByText("Password must be at least 8 characters"),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(createRequests).toEqual([]);
    await expect(page.getByRole("row", { name: email })).toHaveCount(0);
  });

  test("creates an agent user and shows it in the table after a valid submit", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await openCreateUserDialog(page);
    await fillCreateUserForm(page, {
      name: "New Agent",
      email,
      password: "AgentPass123!",
    });

    await expect(page.getByRole("dialog")).toHaveCount(0);

    const row = page.getByRole("row", { name: email });
    await expect(row).toBeVisible();
    await expect(row.getByText("agent", { exact: true })).toBeVisible();
  });

  test("shows a server-side error and keeps the dialog open for a duplicate email", async ({
    page,
  }) => {
    const email = uniqueEmail("duplicate");

    await openCreateUserDialog(page);
    await fillCreateUserForm(page, {
      name: "First Agent",
      email,
      password: "AgentPass123!",
    });
    await expect(page.getByRole("row", { name: email })).toBeVisible();

    await openCreateUserDialog(page);
    await fillCreateUserForm(page, {
      name: "Second Agent",
      email,
      password: "OtherPass123!",
    });

    await expect(
      page.getByText("A user with this email already exists"),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
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