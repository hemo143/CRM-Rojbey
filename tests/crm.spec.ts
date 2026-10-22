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
