import { expect, test } from "@playwright/test";
import {
  adminEmail,
  adminPassword,
  clientOrigin,
} from "../lib/authentication/test-users";

test.use({ extraHTTPHeaders: { origin: clientOrigin } });

test.describe("GET /api/me", () => {
  test("returns 401 without a session", async ({ request }) => {
    const res = await request.get("/api/me");
    expect(res.status()).toBe(401);
  });

  test("returns the admin user for a valid session", async ({ request }) => {
    const signIn = await request.post("/api/auth/sign-in/email", {
      data: { email: adminEmail, password: adminPassword },
    });
    expect(signIn.status()).toBe(200);

    const me = await request.get("/api/me");
    expect(me.status()).toBe(200);

    const body = await me.json();
    expect(body.user.email).toBe(adminEmail.toLowerCase());
    expect(body.user.name).toBe("Admin");
    expect(body.user.role).toBe("ADMIN");
    expect(body.user.id).toBeTruthy();
  });
});

test.describe("POST /api/auth/sign-up/email", () => {
  test("is rejected because sign-up is disabled", async ({ request }) => {
    const res = await request.post("/api/auth/sign-up/email", {
      data: {
        email: `signup-${Date.now()}@example.com`,
        password: "SuperSecret123!",
        name: "Should Not Exist",
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
    expect(await res.text()).not.toBe("");
  });
});

test.describe("POST /api/auth/sign-in/email", () => {
  test("rejects a wrong password without creating a session", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/sign-in/email", {
      data: { email: adminEmail, password: "definitely-not-the-password" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);

    const cookies = (await request.storageState()).cookies;
    expect(
      cookies.filter((cookie) => /session/i.test(cookie.name)),
    ).toEqual([]);
  });

  test("rejects an unknown email", async ({ request }) => {
    const res = await request.post("/api/auth/sign-in/email", {
      data: { email: "nobody-nowhere@example.com", password: "whatever-pass" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("accepts an upper-cased email for the seeded admin", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/sign-in/email", {
      data: { email: adminEmail.toUpperCase(), password: adminPassword },
    });
    expect(res.status()).toBe(200);
  });

  test("is case-sensitive on the password", async ({ request }) => {
    const res = await request.post("/api/auth/sign-in/email", {
      data: { email: adminEmail, password: adminPassword.toUpperCase() },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("rejects injection-style payloads cleanly", async ({ request }) => {
    const sqli = await request.post("/api/auth/sign-in/email", {
      data: { email: "' OR 1=1 --", password: "' OR '1'='1" },
    });
    expect(sqli.status()).toBeGreaterThanOrEqual(400);
    expect(sqli.status()).toBeLessThan(500);

    const xss = await request.post("/api/auth/sign-in/email", {
      data: { email: "<script>alert(1)</script>@x.com", password: "<img>" },
    });
    expect(xss.status()).toBeGreaterThanOrEqual(400);
    expect(xss.status()).toBeLessThan(500);
  });
});

test.describe("POST /api/auth/sign-out", () => {
  test("clears the session cookie", async ({ request }) => {
    const signIn = await request.post("/api/auth/sign-in/email", {
      data: { email: adminEmail, password: adminPassword },
    });
    expect(signIn.status()).toBe(200);

    const meBefore = await request.get("/api/me");
    expect(meBefore.status()).toBe(200);

    const signOut = await request.post("/api/auth/sign-out");
    expect(signOut.status()).toBe(200);
    expect(await signOut.json()).toHaveProperty("success", true);

    const meAfter = await request.get("/api/me");
    expect(meAfter.status()).toBe(401);
  });
});

test.describe("GET /api/users", () => {
  test("returns 401 without a session", async ({ request }) => {
    const res = await request.get("/api/users");
    expect(res.status()).toBe(401);
  });

  test("returns the user list for an admin", async ({ request }) => {
    const signIn = await request.post("/api/auth/sign-in/email", {
      data: { email: adminEmail, password: adminPassword },
    });
    expect(signIn.status()).toBe(200);

    const res = await request.get("/api/users");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.users)).toBe(true);
    expect(body.users.length).toBeGreaterThanOrEqual(1);

    const admin = body.users.find(
      (u: { email: string }) => u.email === adminEmail.toLowerCase(),
    );
    expect(admin).toBeTruthy();
    expect(admin.name).toBe("Admin");
    expect(admin.role).toBe("ADMIN");
  });
});
