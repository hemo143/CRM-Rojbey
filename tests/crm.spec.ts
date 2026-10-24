import { test, expect } from "@playwright/test";
async function login(page: import("@playwright/test").Page, role = "admin") {
  await page.goto("/");
  await page.locator('select[name="role"]').selectOption(role);
  await page.getByRole("button", { name: "دخول النسخة التجريبية" }).click();
  await expect(
    page.getByRole("heading", { name: "يوم جديد في الأتيليه." }),
  ).toBeVisible();
}
test("admin can create, search, edit, book, detect conflict, complete follow-up, and retain data", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (e) => runtimeErrors.push(e.message));
  await login(page);
  await page.getByRole("button", { name: "+ إضافة عميلة" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("اسم العميلة", { exact: true })
    .fill("عروس اختبار المتصفح");
  await dialog.getByLabel("الموبايل", { exact: true }).fill("01012345678");
  await dialog.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "العميلات", exact: false })
    .click();
  await page
    .getByPlaceholder("ابحثي بالاسم، الموبايل أو اسم المستخدم…")
    .fill("01012345678");
  await expect(
    page.getByRole("table").getByText("عروس اختبار المتصفح"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "عروس اختبار المتصفح", exact: true })
    .click();
  await page.getByRole("button", { name: "تعديل الملف" }).click();
  await dialog
    .getByLabel("الملاحظات", { exact: true })
    .fill("ملاحظة اختبار آمنة");
  await dialog.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(page.getByText("ملاحظة اختبار آمنة")).toBeVisible();
  await page.getByRole("button", { name: "+ موعد", exact: true }).click();
  await dialog.getByLabel("الوقت · القاهرة").fill("11:00");
  await dialog.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.locator(".list-row").filter({ hasText: "11:00" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ موعد", exact: true }).click();
  await dialog.getByLabel("الوقت · القاهرة").fill("11:30");
  await dialog.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(dialog.getByRole("alert")).toContainText("يتعارض");
  await dialog.getByRole("button", { name: "إلغاء", exact: true }).click();
  await page.getByRole("button", { name: "إضافة متابعة", exact: true }).click();
  await dialog
    .getByLabel("المهمة", { exact: true })
    .fill("متابعة اختبار المتصفح");
  await dialog.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "المتابعات", exact: false })
    .click();
  await page
    .getByRole("button", { name: "إكمال متابعة اختبار المتصفح", exact: true })
    .click();
  await expect(
    page.locator(".followup-row").filter({ hasText: "متابعة اختبار المتصفح" }),
  ).toContainText("مكتملة");
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "العميلات", exact: false })
    .click();
  await page
    .getByRole("button", { name: "عروس اختبار المتصفح", exact: true })
    .click();
  await expect(page.getByText("ملاحظة اختبار آمنة")).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
test("staff cannot update customer profiles through API; wrong origin is rejected", async ({
  page,
}) => {
  await login(page, "staff");
  const responses = await page.evaluate(async () => {
    const data = await (await fetch("/api/crm")).json();
    const denied = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data.customers[0],
        action: "customer.update",
        name: "unauthorized",
      }),
    });
    return { status: denied.status };
  });
  expect(responses.status).toBe(403);
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "الفريق والصلاحيات", exact: false }),
  ).toHaveCount(0);
  const csrf = await page.request.post("/api/crm", {
    headers: { Origin: "https://untrusted.example" },
    data: { action: "customer.add", name: "must fail" },
  });
  expect(csrf.status()).toBe(403);
});
test("unauthenticated API requests are rejected and mobile navigation fits", async ({
  page,
}) => {
  const response = await page.request.get("/api/crm");
  expect(response.status()).toBe(401);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "المواعيد", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "دفتر المواعيد" }),
  ).toBeVisible();
});

test("Sheets UI preserves imported vocabulary and retries an uncertain save with the same request ID", async ({
  page,
}) => {
  const data = {
    customers: [
      {
        id: "synthetic-sheet-1",
        name: "عميلة اختبار الشيت",
        phone: "",
        channel: "",
        username: "",
        metaContactId: "",
        lastMessage: "",
        lastMessageAt: "",
        notes: "",
        status: "مستورد",
        staff: "اسم تاريخي محفوظ",
        service: "",
        model: "",
        createdAt: "",
      },
    ],
    appointments: [],
    followups: [],
    activity: [],
    sheet: {
      lists: {
        staff: [],
        status: ["جديدة", "تم التواصل"],
        channel: ["WhatsApp"],
        service: ["بيع", "إيجار"],
        model: ["A-Line"],
        appointmentType: ["زيارة أولى"],
        appointmentStatus: ["مؤكد", "ملغي"],
      },
      values: {
        customerNew: "جديدة",
        appointmentDefaultType: "زيارة أولى",
        appointmentConfirmed: "مؤكد",
      },
      warnings: {},
    },
  };
  const writes: Record<string, unknown>[] = [];
  await page.route("**/api/auth", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "synthetic-admin",
          role: "admin",
          name: "اختبار",
          demo: false,
          exp: Date.now() + 100000,
        },
        demo: false,
      },
    }),
  );
  await page.route("**/api/crm", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: data });
    const p = route.request().postDataJSON();
    writes.push(p);
    if (writes.length === 1)
      return route.fulfill({
        status: 400,
        json: { error: "تعذّر تأكيد الحفظ", pending: true },
      });
    data.customers[0].notes = p.notes;
    return route.fulfill({ json: { ok: true, id: data.customers[0].id } });
  });
  await page.goto("/");
  await expect(
    page.getByText("اعتماد قائمة الموظفات مؤجّل.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "العميلات", exact: false })
    .click();
  await page
    .getByRole("button", { name: "عميلة اختبار الشيت", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "+ موعد", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "إضافة متابعة", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "تعديل الملف" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('select[name="status"]')).toHaveValue("مستورد");
  await expect(dialog.locator('select[name="staff"]')).toHaveValue(
    "اسم تاريخي محفوظ",
  );
  await expect(dialog.locator('select[name="channel"]')).toHaveValue("");
  await dialog
    .getByLabel("الملاحظات", { exact: true })
    .fill("ملاحظة اختبار الربط");
  await dialog.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(dialog.getByRole("alert")).toContainText("تعذّر تأكيد");
  await dialog
    .getByRole("button", {
      name: "إعادة محاولة الطلب السابق دون تغيير التفاصيل",
    })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
  expect(writes[0].status).toBe("مستورد");
  await expect(
    page.getByText("ملاحظة اختبار الربط", { exact: true }),
  ).toBeVisible();
});

test("account setup derives configuration in-browser without sending the password or registering an account", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") writes.push(r.url());
  });
  await page.goto("/setup-account");
  await page
    .getByLabel("كلمة المرور", { exact: true })
    .fill("synthetic-browser-password");
  await page
    .getByLabel("تأكيد كلمة المرور", { exact: true })
    .fill("synthetic-browser-password");
  await page.getByRole("button", { name: "تجهيز إعداد الحساب" }).click();
  const output = page.getByLabel("إعداد CRM_USERS_JSON");
  await expect(output).toBeVisible();
  const account = JSON.parse(await output.inputValue())[0];
  expect(account.role).toBe("admin");
  expect(account.passwordHash).toMatch(
    /^pbkdf2-sha256:600000:[a-f0-9]{32}:[a-f0-9]{64}$/,
  );
  expect(await output.inputValue()).not.toContain("synthetic-browser-password");
  await expect(page.getByLabel("كلمة المرور", { exact: true })).toHaveValue("");
  expect(writes).toEqual([]);
});

test("account setup cannot submit a password when JavaScript is disabled", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  try {
    const page = await context.newPage();
    await page.goto("/setup-account");
    await expect(
      page.getByLabel("كلمة المرور", { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "تجهيز إعداد الحساب" }),
    ).toBeDisabled();
    await expect(
      page.getByText("يلزم تفعيل JavaScript لتجهيز الحساب داخل المتصفح."),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

test("customer directory keeps all 1465 synthetic records searchable without truncation", async ({
  page,
}) => {
  const customers = Array.from({ length: 1465 }, (_, i) => ({
    id: `synthetic-scale-${i + 1}`,
    name: `عميلة اختبار ${i + 1}`,
    phone: `010${String(i + 1).padStart(8, "0")}`,
    channel: "",
    source: "",
    username: "",
    metaContactId: "",
    lastMessage: "",
    lastMessageAt: "",
    notes: "",
    status: "مستورد",
    staff: "",
    service: "",
    model: "",
    createdAt: "",
  }));
  await page.route("**/api/auth", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "scale-admin",
          role: "admin",
          name: "Synthetic scale admin",
          demo: false,
          exp: Date.now() + 100000,
        },
        demo: false,
        namedAccounts: true,
      },
    }),
  );
  await page.route("**/api/crm", (route) =>
    route.fulfill({
      json: {
        customers,
        appointments: [],
        followups: [],
        activity: [],
        sheet: {
          lists: { status: ["جديدة"], channel: [], staff: [], source: [] },
          values: { customerNew: "جديدة" },
          warnings: {},
        },
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "العميلات", exact: false })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1465);
  await page
    .getByPlaceholder("ابحثي بالاسم، الموبايل أو اسم المستخدم…")
    .fill("synthetic-scale-1465");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("table").getByText("عميلة اختبار 1465", { exact: true }),
  ).toBeVisible();
});
