import { expect, test, type Page } from "@playwright/test";
import { loginViaUi } from "../lib/authentication/login";
import { adminEmail, adminPassword } from "../lib/authentication/test-users";

function welcomeHeading(page: Page) {
  return page.getByRole("heading", { name: /^Welcome/ });
}

test.describe("login form", () => {
  test("renders email, password and submit controls", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in" }),
    ).toBeEnabled();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });

  test("empty submit shows required-field errors and stays on /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("invalid email format is caught client-side without signing in", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("whitespace-only values are not accepted as a sign-in", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("   ");
    await page.getByLabel("Password").fill("   ");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form p.text-destructive")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("failed sign-ins", () => {
  const serverErrorCases: [string, string, string][] = [
    ["wrong password", adminEmail, "definitely-not-the-password"],
    ["unknown email", "nobody-nowhere@example.com", adminPassword],
    ["injection payload in email", "' OR 1=1 --", adminPassword],
  ];

  for (const [name, email, password] of serverErrorCases) {
    test(`shows an error for ${name} and stays on /login`, async ({
      page,
    }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.locator("form p.text-destructive")).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      await expect(welcomeHeading(page)).toBeHidden();
    });
  }

  test("password is case-sensitive in the UI flow", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill(adminPassword.toUpperCase());
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form p.text-destructive")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("successful session", () => {
  test("admin signs in, lands on home with name and email shown", async ({
    page,
  }) => {
    await loginViaUi(page, adminEmail, adminPassword);
    await expect(page.getByRole("heading", { name: /^Welcome/ })).toBeVisible();
    await expect(
      page.getByText(`You are signed in as ${adminEmail.toLowerCase()}`),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("session survives a page reload", async ({ page }) => {
    await loginViaUi(page, adminEmail, adminPassword);
    await page.reload();
    await expect(page.getByRole("heading", { name: /^Welcome/ })).toBeVisible();
  });

  test("visiting /login while signed in redirects to home", async ({
    page,
  }) => {
    await loginViaUi(page, adminEmail, adminPassword);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /^Welcome/ })).toBeVisible();
  });

  test("admin can open the users page", async ({ page }) => {
    await loginViaUi(page, adminEmail, adminPassword);
    await page.getByRole("link", { name: "Users" }).click();
    await expect(
      page.getByRole("heading", { name: "Users", exact: true }),
    ).toBeVisible();
  });

  test("signing out clears the session and re-locks protected pages", async ({
    page,
  }) => {
    await loginViaUi(page, adminEmail, adminPassword);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/users");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("route guards for anonymous visitors", () => {
  test("deep link to protected home redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("deep link to /users redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login$/);
  });
});
