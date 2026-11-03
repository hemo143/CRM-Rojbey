import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { mapSheetData, sheetOperation } from "../src/lib/sheets";
const require = createRequire(import.meta.url);
const { createSheetWorkflow } = require("./helpers/sheets.cjs");
async function setup(page: Page) {
  const fixture = createSheetWorkflow();
  fixture.approveSyntheticStaff();
  const control = {
    lost: false,
    statusUnavailable: false,
    refreshFailed: false,
    reject: false,
    delay: false,
    writes: 0,
  };
  await page.route("**/api/auth", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "workflow-admin",
          role: "admin",
          name: "Synthetic workflow admin",
          demo: false,
          exp: Date.now() + 100000,
        },
        demo: false,
        namedAccounts: true,
      },
    }),
  );
  await page.route("**/api/crm**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (req.method() === "GET") {
      const requestId = url.searchParams.get("requestId");
      if (requestId && control.statusUnavailable) return route.abort("failed");
      if (requestId)
        return route.fulfill({
          json: fixture.call("request.status", { requestId }).data,
        });
      if (control.refreshFailed && control.writes > 0)
        return route.fulfill({
          status: 503,
          json: { error: "synthetic refresh failure" },
        });
      return route.fulfill({ json: mapSheetData(fixture.call("read").data) });
    }
    control.writes++;
    if (control.delay) await new Promise((r) => setTimeout(r, 500));
    if (control.reject)
      return route.fulfill({
        status: 400,
        json: { error: "synthetic validation rejection", pending: false },
      });
    const operation = sheetOperation(req.postDataJSON()),
      result = fixture.call(operation.method, operation.payload);
    if (control.lost) {
      control.lost = false;
      return route.abort("failed");
    }
    return route.fulfill(
      result.ok
        ? { json: result.data }
        : {
            status: 400,
            json: {
              error: result.error,
              pending: result.error.startsWith("RB_PENDING:"),
              existing: result.existing,
            },
          },
    );
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "يوم جديد في الأتيليه." }),
  ).toBeVisible();
  return { fixture, control };
}
async function add(
  page: Page,
  name = "QA browser contact",
  phone = "01098765432",
) {
  await page.getByRole("button", { name: "+ إضافة عميلة" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("اسم العميلة", { exact: true }).fill(name);
  await dialog.getByLabel("الموبايل", { exact: true }).fill(phone);
  return dialog;
}
const nav = (page: Page, name: string) =>
  page
    .getByRole("navigation")
    .getByRole("button", { name, exact: false })
    .click();
test("A–F browser: one save, canonical duplicate profile, appointment/follow-up in both views, same-ID conversion, rapid double submit", async ({
  page,
}) => {
  const { fixture, control } = await setup(page);
  control.delay = true;
  const d = await add(page);
  await d.getByLabel("اسم المستخدم", { exact: true }).fill("qa.browser");
  // Dispatch two synchronous form submits before React can render the disabled button.
  await d.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(d.getByRole("button", { name: "جارٍ الحفظ…" })).toBeDisabled();
  await expect(d).not.toBeVisible();
  expect(control.writes).toBe(1);
  const saved = fixture
    .call("read")
    .data.customers.find((c: any) => c.name === "QA browser contact");
  await nav(page, "الاستفسارات الجديدة");
  const search = page.getByPlaceholder(
    "ابحثي بالاسم، الموبايل أو اسم المستخدم…",
  );
  for (const q of [
    "QA browser",
    "+201098765432",
    "00201098765432",
    "qa.browser",
    saved.id,
  ]) {
    await search.fill(q);
    await expect(page.locator("tbody tr")).toHaveCount(1);
  }
  await page
    .getByRole("button", { name: "QA browser contact", exact: true })
    .click();
  await page.getByRole("button", { name: "+ موعد", exact: true }).click();
  await d.getByLabel("الموظفة", { exact: true }).selectOption("فريق اختبار");
  await d.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(d).not.toBeVisible();
  await expect(page.locator(".list-row")).toHaveCount(1);
  await nav(page, "المواعيد");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "QA browser contact", exact: true })
    .click();
  await page.getByRole("button", { name: "إضافة متابعة", exact: true }).click();
  await d.getByLabel("المهمة", { exact: true }).fill("QA browser follow-up");
  await d.getByLabel("تاريخ المتابعة").fill("2026-12-14T15:30");
  await d.getByLabel("ملاحظات المتابعة").fill("Follow-up notes");
  await d.getByLabel("الموظفة", { exact: true }).selectOption("فريق اختبار");
  await d.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(d).not.toBeVisible();
  await expect(page.locator(".list-row")).toHaveCount(2);
  await nav(page, "المتابعات");
  await expect(
    page.locator(".followup-row").filter({ hasText: "QA browser follow-up" }),
  ).toBeVisible();
  await nav(page, "الاستفسارات الجديدة");
  await search.fill("QA browser");
  await page
    .getByRole("button", { name: "QA browser contact", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تحويل إلى عميلة", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "تحويل إلى عميلة", exact: true }),
  ).not.toBeVisible();
  expect(
    fixture.call("read").data.customers.find((c: any) => c.id === saved.id)
      .status,
  ).toBe("تم التعاقد");
  await nav(page, "العميلات");
  await search.fill("");
  await expect(
    page.getByRole("button", { name: "QA browser contact", exact: true }),
  ).toBeVisible();
  const dup = await add(page, "Duplicate browser", "00201098765432");
  await dup.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(dup.getByText(/QA browser contact/)).toBeVisible();
  await dup.getByRole("button", { name: "فتح ملف العميلة الموجودة" }).click();
  await expect(
    page.getByRole("heading", { name: "QA browser contact", exact: true }),
  ).toBeVisible();
  expect(fixture.call("read").data.customers).toHaveLength(2);
});
for (const scenario of ["lost response", "refresh failure", "rejected request"])
  test(`G browser: ${scenario}`, async ({ page }) => {
    const { fixture, control } = await setup(page);
    control.lost = scenario === "lost response";
    control.refreshFailed = scenario === "refresh failure";
    control.reject = scenario === "rejected request";
    const d = await add(page, "QA failure case", "01598765432");
    await d.getByRole("button", { name: "حفظ التفاصيل" }).click();
    if (control.reject) {
      await expect(d.getByRole("alert")).toContainText(
        "لم يتم إنشاء أو تعديل أي سجل",
      );
      expect(fixture.call("read").data.customers).toHaveLength(1);
    } else {
      await expect(d).not.toBeVisible();
      await expect(page.getByRole("status")).toContainText("تم الحفظ بنجاح");
      expect(fixture.call("read").data.customers).toHaveLength(2);
    }
    expect(control.writes).toBe(1);
  });
test("API serializes concurrent replay, reports duplicate identity, and persists the request receipt", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('select[name="role"]').selectOption("admin");
  await page.getByRole("button", { name: "دخول النسخة التجريبية" }).click();
  await expect(
    page.getByRole("heading", { name: "يوم جديد في الأتيليه." }),
  ).toBeVisible();
  const p = {
    action: "customer.add",
    requestId: crypto.randomUUID(),
    name: "QA API concurrent contact",
    phone: "01198765432",
  };
  const [a, b] = await Promise.all([
    page.request.post("/api/crm", {
      data: p,
      headers: { Origin: "http://127.0.0.1:3100" },
    }),
    page.request.post("/api/crm", {
      data: p,
      headers: { Origin: "http://127.0.0.1:3100" },
    }),
  ]);
  expect(a.status()).toBe(200);
  expect(b.status()).toBe(200);
  const first = await a.json();
  expect((await b.json()).id).toBe(first.id);
  const status = await page.request.get(`/api/crm?requestId=${p.requestId}`);
  expect((await status.json()).state).toBe("saved");
  const duplicate = await page.request.post("/api/crm", {
    data: { ...p, requestId: crypto.randomUUID(), phone: "00201198765432" },
    headers: { Origin: "http://127.0.0.1:3100" },
  });
  expect(duplicate.status()).toBe(409);
  expect((await duplicate.json()).existing.id).toBe(first.id);
  const data = await (await page.request.get("/api/crm")).json();
  expect(data.customers.filter((c: any) => c.id === first.id)).toHaveLength(1);
  expect(data.requests).toBeUndefined();
});

test("uncertain request survives reload and retries the original request ID exactly once", async ({
  page,
}) => {
  const { fixture, control } = await setup(page);
  control.lost = true;
  control.statusUnavailable = true;
  const d = await add(page, "QA reload recovery", "01298765432");
  await d.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(d.getByRole("alert")).toContainText("تعذّر تأكيد");
  await page.reload();
  control.statusUnavailable = false;
  await page.getByRole("button", { name: "إعادة محاولة الطلب السابق" }).click();
  await expect(page.getByRole("status")).toContainText("تم الحفظ بنجاح");
  expect(
    fixture
      .call("read")
      .data.customers.filter((c: any) => c.name === "QA reload recovery"),
  ).toHaveLength(1);
  expect(control.writes).toBe(2); // second HTTP delivery replays the receipt, never creates another row.
});

test("intermediate lifecycle contacts remain accessible through the existing status filter", async ({
  page,
}) => {
  const { fixture } = await setup(page);
  const result = fixture.call("customer.add", {
    requestId: crypto.randomUUID(),
    name: "QA qualified contact",
    phone: "01087654321",
    status: "مهتمة",
  });
  expect(result.ok).toBe(true);
  await nav(page, "العميلات");
  await page
    .getByRole("combobox", { name: "فلترة الحالة" })
    .selectOption("مهتمة");
  await page
    .getByRole("button", { name: "QA qualified contact", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "QA qualified contact", exact: true }),
  ).toBeVisible();
});
