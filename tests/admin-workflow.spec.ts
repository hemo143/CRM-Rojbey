import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { mapSheetData, sheetOperation } from "../src/lib/sheets";
const require = createRequire(import.meta.url);
const { createSheetWorkflow } = require("./helpers/sheets.cjs");
test("admin completes native-sheet customer, lead, appointment, follow-up and activity workflow", async ({
  page,
}) => {
  const fixture = createSheetWorkflow();
  fixture.approveSyntheticStaff();
  const runtimeErrors: string[] = [];
  page.on("pageerror", (e) => runtimeErrors.push(e.message));
  page.on("console", (message) => {
    if (message.text().includes("Encountered two children with the same key"))
      runtimeErrors.push(message.text());
  });
  let loggedIn = true;
  await page.route("**/api/auth", (route) => {
    if (route.request().method() === "DELETE") {
      loggedIn = false;
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({
      json: {
        user: loggedIn
          ? {
              id: "workflow-admin",
              role: "admin",
              name: "Synthetic workflow admin",
              demo: false,
              exp: Date.now() + 100000,
            }
          : null,
        demo: false,
        namedAccounts: true,
      },
    });
  });
  await page.route("**/api/crm", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: mapSheetData(fixture.call("read").data) });
    const operation = sheetOperation(route.request().postDataJSON());
    const result = fixture.call(operation.method, operation.payload);
    return route.fulfill(
      result.ok
        ? { json: result.data }
        : {
            status: 400,
            json: {
              error: result.error,
              pending: result.error.startsWith("RB_PENDING:"),
            },
          },
    );
  });
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "ROJBEY — Wedding Dress" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ إضافة عميلة" }).click();
  const modal = page.getByRole("dialog");
  await modal
    .getByLabel("اسم العميلة", { exact: true })
    .fill("عميلة رحلة الأدمن");
  await modal.getByLabel("الموبايل", { exact: true }).fill("٠١٠ ٥٥٥ ١٢٣٤٥");
  await modal
    .getByLabel("مصدر العميلة", { exact: true })
    .selectOption("Instagram");
  await modal
    .getByLabel("قناة التواصل", { exact: true })
    .selectOption("WhatsApp");
  await modal
    .getByLabel("الموظفة", { exact: true })
    .selectOption("فريق اختبار");
  await modal
    .getByLabel("تاريخ الفرح (أصلي)", { exact: true })
    .fill("أكتوبر بدون سنة");
  await modal.getByLabel("مكان السكن", { exact: true }).fill("مكان اختبار");
  await modal.getByLabel("كود الفستان", { exact: true }).fill("TEST-DRESS-01");
  await modal.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(modal).not.toBeVisible();
  // Newly appended sheet rows must actually appear in the recent dashboard.
  await expect(
    page.getByRole("table").getByText("عميلة رحلة الأدمن", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ إضافة عميلة" }).click();
  await modal
    .getByLabel("اسم العميلة", { exact: true })
    .fill("عميلة مكررة اختبار");
  await modal.getByLabel("الموبايل", { exact: true }).fill("01055512345");
  await modal.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(modal.getByRole("alert")).toContainText("RB_DUPLICATE");
  expect(fixture.call("read").data.customers).toHaveLength(2);
  await modal.getByRole("button", { name: "إلغاء", exact: true }).click();
  const saved = fixture
    .call("read")
    .data.customers.find(
      (c: { name: string }) => c.name === "عميلة رحلة الأدمن",
    );
  expect(saved.wedding).toBe("أكتوبر بدون سنة");
  expect(saved.city).toBe("مكان اختبار");
  expect(saved.dress).toBe("TEST-DRESS-01");
  const nav = (name: string) =>
    page
      .getByRole("navigation")
      .getByRole("button", { name, exact: false })
      .click();
  await nav("العميلات");
  await page
    .getByPlaceholder("ابحثي بالاسم، الموبايل أو اسم المستخدم…")
    .fill("01055512345");
  await page
    .getByRole("combobox", { name: "فلترة المصدر" })
    .selectOption("Instagram");
  await page
    .getByRole("combobox", { name: "فلترة الموظفة" })
    .selectOption("فريق اختبار");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "عميلة رحلة الأدمن", exact: true })
    .click();
  await expect(
    page.getByText("أكتوبر بدون سنة", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "تعديل الملف" }).click();
  await modal
    .getByLabel("حالة الاستفسار", { exact: true })
    .selectOption("مهتمة");
  await modal
    .getByLabel("الملاحظات", { exact: true })
    .fill("ملاحظة رحلة الأدمن");
  await modal.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(modal).not.toBeVisible();
  expect(
    fixture
      .call("read")
      .data.customers.find((c: { id: string }) => c.id === saved.id).createdAt,
  ).toBe(saved.createdAt);
  await page.getByRole("button", { name: "+ موعد", exact: true }).click();
  await modal.getByLabel("التاريخ", { exact: true }).fill("2030-12-01");
  await modal.getByLabel("الوقت · القاهرة").fill("11:00");
  await modal
    .getByLabel("الموظفة", { exact: true })
    .selectOption("فريق اختبار");
  await modal.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(modal).not.toBeVisible();
  await expect(page.getByText("حجز موعد", { exact: true })).toBeVisible();
  // Same start time conflict must be rejected through the real Apps Script planner.
  await page.getByRole("button", { name: "+ موعد", exact: true }).click();
  await modal.getByLabel("التاريخ", { exact: true }).fill("2030-12-01");
  await modal.getByLabel("الوقت · القاهرة").fill("11:00");
  await modal
    .getByLabel("الموظفة", { exact: true })
    .selectOption("فريق اختبار");
  await modal.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(modal.getByRole("alert")).toContainText("نفس التوقيت");
  await modal.getByRole("button", { name: "إلغاء", exact: true }).click();
  await nav("المواعيد");
  await page.getByRole("button", { name: "تعديل", exact: true }).click();
  await modal.getByLabel("الحالة", { exact: true }).selectOption("ملغي");
  await modal.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(modal).not.toBeVisible();
  expect(fixture.call("read").data.appointments[0].status).toBe("ملغي");
  await nav("العميلات");
  await page
    .getByRole("button", { name: "عميلة رحلة الأدمن", exact: true })
    .click();
  await page.getByRole("button", { name: "إضافة متابعة", exact: true }).click();
  await modal.getByLabel("المهمة", { exact: true }).fill("متابعة رحلة الأدمن");
  await modal.getByLabel("تاريخ المتابعة", { exact: true }).fill("2000-01-01");
  await modal
    .getByLabel("الموظفة", { exact: true })
    .selectOption("فريق اختبار");
  await modal.getByRole("button", { name: "حفظ التفاصيل" }).click();
  await expect(modal).not.toBeVisible();
  await nav("المتابعات");
  await page
    .getByRole("button", { name: "إكمال متابعة رحلة الأدمن", exact: true })
    .click();
  await expect(
    page.locator(".followup-row").filter({ hasText: "متابعة رحلة الأدمن" }),
  ).toContainText("مكتملة");
  await page.reload();
  await nav("العميلات");
  await page
    .getByRole("button", { name: "عميلة رحلة الأدمن", exact: true })
    .click();
  await expect(
    page.getByText("ملاحظة رحلة الأدمن", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("إكمال متابعة", { exact: true })).toBeVisible();
  await expect(page.getByText("تعديل موعد", { exact: true })).toBeVisible();
  await nav("الاستفسارات"); // customer changed from new to interested, so no longer a new lead
  await expect(
    page.getByRole("table").getByText("عميلة رحلة الأدمن", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "/tmp/rojbey-admin-review.png",
    fullPage: true,
  });
  await nav("المحادثات");
  await expect(
    page.getByText("Instagram · غير متصل", { exact: true }),
  ).toBeVisible();
  await nav("الفريق والصلاحيات");
  await expect(
    page.getByRole("heading", { name: "أدوار الفريق" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "تسجيل الخروج ←", exact: true })
    .click();
  await expect(page.getByLabel("كلمة المرور", { exact: true })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
