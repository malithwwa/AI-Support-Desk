import { expect, type Page } from "@playwright/test";
import { adminEmail, adminPassword } from "./test-users";

export async function loginViaUi(
  page: Page,
  email: string = adminEmail,
  password: string = adminPassword,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /^Welcome/ })).toBeVisible();
}
