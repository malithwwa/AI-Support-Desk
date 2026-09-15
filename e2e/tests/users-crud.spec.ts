import { expect, test } from "@playwright/test";
import { loginViaUi } from "../lib/authentication/login";
import { adminEmail, clientOrigin } from "../lib/authentication/test-users";
import {
  createAgentViaApi,
  fillCreateUserForm,
  fillEditUserFormAndSave,
  getAdminUserId,
  openCreateUserDialog,
  openEditUserDialog,
  signInStatus,
  uniqueEmail,
} from "../lib/users";

// Better Auth validates the Origin header against its trusted origins; the
// `request` fixture does not send one on its own. Same-origin page requests
// are unaffected (the value below matches the client origin).
test.use({ extraHTTPHeaders: { origin: clientOrigin } });

const agentPassword = "AgentPass123!";

test.describe("user management CRUD (admin happy paths)", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, adminEmail);
    await page.getByRole("link", { name: "Users" }).click();
    await expect(
      page.getByRole("heading", { name: "Users", exact: true }),
    ).toBeVisible();
  });

  test("lists seeded users with name, email and role badge", async ({ page }) => {
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Role" })).toBeVisible();

    const adminRow = page.getByRole("row", { name: adminEmail.toLowerCase() });
    await expect(adminRow).toBeVisible();
    await expect(adminRow.getByText("Admin", { exact: true })).toBeVisible();
    await expect(adminRow.getByText("admin", { exact: true })).toBeVisible();
  });

  test("creates an agent via the dialog and shows it in the table", async ({
    page,
  }) => {
    const email = uniqueEmail("create");
    await openCreateUserDialog(page);
    const dialog = page.getByRole("dialog");

    // Create-mode affordances: title, password label and submit button.
    await expect(dialog.getByRole("heading", { name: "Create user" })).toBeVisible();
    await expect(dialog.getByLabel("Password")).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Create user" }),
    ).toBeVisible();

    await fillCreateUserForm(page, {
      name: "New Agent",
      email,
      password: agentPassword,
    });

    await expect(page.getByRole("dialog")).toHaveCount(0);
    const row = page.getByRole("row", { name: email });
    await expect(row).toBeVisible();
    await expect(row.getByText("agent", { exact: true })).toBeVisible();
  });

  test("opens the edit dialog prefilled with the user's data", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("prefill");
    await createAgentViaApi(request, {
      name: "Prefill Agent",
      email,
      password: agentPassword,
    });
    await page.reload();
    await expect(page.getByRole("row", { name: email })).toBeVisible();

    await openEditUserDialog(page, "Prefill Agent");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Edit user" })).toBeVisible();
    await expect(dialog.getByLabel("Name")).toHaveValue("Prefill Agent");
    await expect(dialog.getByLabel("Email")).toHaveValue(email);
    await expect(dialog.getByLabel("New password (optional)")).toHaveValue("");
    await expect(
      dialog.getByRole("button", { name: "Save changes" }),
    ).toBeVisible();
  });

  test("updates an agent's name and new password and reflects the change in the list", async ({
    page,
    request,
    playwright,
  }) => {
    const email = uniqueEmail("update");
    await createAgentViaApi(request, {
      name: "Original Name",
      email,
      password: "OriginalPass123!",
    });
    await page.reload();
    await expect(page.getByRole("row", { name: email })).toBeVisible();

    await openEditUserDialog(page, "Original Name");
    const newPassword = "RenamedPass456!";
    await fillEditUserFormAndSave(page, {
      name: "Renamed Agent",
      password: newPassword,
    });

    await expect(page.getByRole("dialog")).toHaveCount(0);
    const row = page.getByRole("row", { name: email });
    await expect(row).toBeVisible();
    await expect(row.getByText("Renamed Agent", { exact: true })).toBeVisible();
    await expect(page.getByText("Original Name", { exact: true })).toHaveCount(0);

    // The newly set password must be usable for sign-in.
    const userCtx = await playwright.request.newContext({
      baseURL: clientOrigin,
      extraHTTPHeaders: { origin: clientOrigin },
    });
    try {
      expect(await signInStatus(userCtx, email, newPassword)).toBe(200);
    } finally {
      await userCtx.dispose();
    }
  });

  test("editing with a blank password keeps the old password working", async ({
    page,
    request,
    playwright,
  }) => {
    const email = uniqueEmail("keep-password");
    const password = "KeepMeSame123!";
    await createAgentViaApi(request, {
      name: "Password Kept User",
      email,
      password,
    });
    await page.reload();
    await expect(page.getByRole("row", { name: email })).toBeVisible();

    await openEditUserDialog(page, "Password Kept User");
    // Only the name changes; the password field stays blank.
    await fillEditUserFormAndSave(page, { name: "Password Kept Renamed" });

    await expect(page.getByRole("dialog")).toHaveCount(0);
    const row = page.getByRole("row", { name: email });
    await expect(row.getByText("Password Kept Renamed", { exact: true })).toBeVisible();

    // The old password must still authenticate the user.
    const userCtx = await playwright.request.newContext({
      baseURL: clientOrigin,
      extraHTTPHeaders: { origin: clientOrigin },
    });
    try {
      expect(await signInStatus(userCtx, email, password)).toBe(200);
    } finally {
      await userCtx.dispose();
    }
  });

  test("shows a delete confirmation naming the user and keeps it on cancel", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("confirm-delete");
    await createAgentViaApi(request, {
      name: "Doomed Agent",
      email,
      password: agentPassword,
    });
    await page.reload();
    await expect(page.getByRole("row", { name: email })).toBeVisible();

    await page.getByRole("button", { name: "Delete Doomed Agent" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Delete user" })).toBeVisible();
    await expect(dialog.getByText("Doomed Agent", { exact: true })).toBeVisible();
    await expect(dialog.getByText(email)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Delete user" }),
    ).toBeVisible();

    // Cancelling closes the modal and leaves the user untouched.
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("row", { name: email })).toBeVisible();
  });

  test("deleting an agent removes it from the list and blocks sign-in", async ({
    page,
    request,
    playwright,
  }) => {
    const email = uniqueEmail("delete");
    const password = "DeleteMeNow123!";
    await createAgentViaApi(request, {
      name: "Target Agent",
      email,
      password,
    });
    await page.reload();
    await expect(page.getByRole("row", { name: email })).toBeVisible();

    await page.getByRole("button", { name: "Delete Target Agent" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Delete user" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("row", { name: email })).toHaveCount(0);

    // The deleted user must not be able to start a new session.
    const userCtx = await playwright.request.newContext({
      baseURL: clientOrigin,
      extraHTTPHeaders: { origin: clientOrigin },
    });
    try {
      expect(await signInStatus(userCtx, email, password)).toBeGreaterThanOrEqual(
        400,
      );
    } finally {
      await userCtx.dispose();
    }
  });

  test("the admin row has no delete button", async ({ page }) => {
    const adminRow = page.getByRole("row", { name: adminEmail.toLowerCase() });
    await expect(adminRow).toBeVisible();
    await expect(
      adminRow.getByRole("button", { name: /^Delete / }),
    ).toHaveCount(0);
    await expect(adminRow.getByRole("button", { name: /^Edit / })).toBeVisible();
  });
});

test.describe("deleting the admin via API", () => {
  test("returns 400 and leaves the admin intact", async ({ request }) => {
    const adminId = await getAdminUserId(request);

    const res = await request.delete(`/api/users/${adminId}`);
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Admin users cannot be deleted");

    // The admin must still be listed afterwards.
    const list = await request.get("/api/users");
    expect(list.status()).toBe(200);
    const { users } = (await list.json()) as {
      users: Array<{ id: string; role: string }>;
    };
    const admin = users.find((user) => user.id === adminId);
    expect(admin).toBeTruthy();
    expect(admin!.role).toBe("ADMIN");
  });
});