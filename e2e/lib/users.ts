import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { adminEmail, adminPassword } from "./authentication/test-users";

/** Email unique to a single test; parallel tests never collide on user data. */
export function uniqueEmail(prefix = "create-user"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Click the page-level "Create user" button and wait for the dialog.
 * The dialog's submit button is also named "Create user", so we wait for any
 * previous dialog to fully detach before clicking the page-level trigger.
 */
export async function openCreateUserDialog(page: Page): Promise<void> {
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

/** Click the pencil (edit) button of the row whose user name matches. */
export async function openEditUserDialog(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: `Edit ${name}` }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

/** Replace the value of a labeled field inside the open dialog. */
export async function fillDialogField(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const field = page.getByRole("dialog").getByLabel(label);
  // Inputs start read-only to defeat browser autofill and unlock on pointer
  // down; a real click is what removes the readonly attribute.
  await field.click();
  await field.fill(value);
}

/** Fill the create-user dialog (Name / Email / Password) and submit it. */
export async function fillCreateUserForm(
  page: Page,
  { name, email, password }: { name: string; email: string; password: string },
): Promise<void> {
  await fillDialogField(page, "Name", name);
  await fillDialogField(page, "Email", email);
  await fillDialogField(page, "Password", password);
  await page.getByRole("dialog").getByRole("button", { name: "Create user" }).click();
}

/**
 * Apply a partial edit in the edit dialog and submit. Fields that are not
 * present in `changes` are left untouched (a blank password keeps the current
 * one, matching the update schema).
 */
export async function fillEditUserFormAndSave(
  page: Page,
  changes: { name?: string; email?: string; password?: string },
): Promise<void> {
  const steps: Array<[string, string]> = [];
  if (changes.name !== undefined) steps.push(["Name", changes.name]);
  if (changes.email !== undefined) steps.push(["Email", changes.email]);
  if (changes.password !== undefined) {
    steps.push(["New password (optional)", changes.password]);
  }
  for (const [label, value] of steps) {
    await fillDialogField(page, label, value);
  }
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
}

/** Sign in as the seeded admin on the given API context (sets a session cookie). */
export async function signInAsAdmin(ctx: APIRequestContext): Promise<void> {
  const res = await ctx.post("/api/auth/sign-in/email", {
    data: { email: adminEmail, password: adminPassword },
  });
  expect(res.status()).toBe(200);
}

/** Create an AGENT user through the API while signed in as admin. */
export async function createAgentViaApi(
  ctx: APIRequestContext,
  { name, email, password }: { name: string; email: string; password: string },
): Promise<{ id: string; name: string; email: string; role: string }> {
  await signInAsAdmin(ctx);
  const res = await ctx.post("/api/users", { data: { name, email, password } });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as {
    user: { id: string; name: string; email: string; role: string };
  };
  return body.user;
}

/** Id of the seeded admin user, looked up from the current users list. */
export async function getAdminUserId(ctx: APIRequestContext): Promise<string> {
  await signInAsAdmin(ctx);
  const res = await ctx.get("/api/users");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as {
    users: Array<{ id: string; email: string; role: string }>;
  };
  const admin = body.users.find(
    (user) => user.role === "ADMIN" && user.email === adminEmail.toLowerCase(),
  );
  expect(admin, "the seeded admin must appear in the user list").toBeTruthy();
  return admin!.id;
}

/** HTTP status of an email/password sign-in attempt on the given context. */
export async function signInStatus(
  ctx: APIRequestContext,
  email: string,
  password: string,
): Promise<number> {
  const res = await ctx.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  return res.status();
}