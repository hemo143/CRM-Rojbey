// Browser + actual local .gs logic via simulated google.script.run. NOT a live Google test.
const { test, after, before } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const { mocks } = require("./google-mocks.cjs");
let browser, server, origin;
before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const html = fs.readFileSync(path.resolve(__dirname, "../Index.html"));
  server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server?.close(r));
});
function backend() {
  const fixture = mocks();
  vm.createContext(fixture.context);
  for (const f of ["Schema.gs", "Setup.gs", "Code.gs"])
    vm.runInContext(
      fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"),
      fixture.context,
    );
  fixture.context.RB_bindSpreadsheet();
  fixture.context.RB_setup();
  return fixture;
}
async function pageFor(fixture) {
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);
  await page.exposeFunction("callGas", async (fn, payload) => {
    if (!fn.startsWith("RB_") || typeof fixture.context[fn] !== "function")
      throw Error("Unknown API");
    return fixture.context[fn](payload);
  });
  await page.addInitScript(() => {
    function runner(success, failure) {
      return new Proxy(
        {},
        {
          get(_, name) {
            if (name === "withSuccessHandler")
              return (fn) => runner(fn, failure);
            if (name === "withFailureHandler")
              return (fn) => runner(success, fn);
            return (payload) =>
              window.callGas(name, payload).then(success, failure);
          },
        },
      );
    }
    window.google = {
      script: {
        run: runner(
          () => {},
          () => {},
        ),
      },
    };
  });
  await page.goto(origin);
  await page
    .getByRole("heading", { name: "يوم الأتيليه. من بيانات الشيت." })
    .waitFor();
  return page;
}
test("browser workflow uses .gs backend: customer, profile edit, appointment/cancel, follow-up, persistence after reload", async () => {
  const f = backend(),
    page = await pageFor(f),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.getByRole("button", { name: "العميلات", exact: true }).click();
    await page
      .getByRole("button", { name: "إضافة عميلة", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("اسم العميلة", { exact: true })
      .fill("Synthetic UI customer");
    await dialog.getByLabel("الموبايل", { exact: true }).fill("01012345678");
    await dialog.getByLabel("الموظفة", { exact: true }).fill("Synthetic staff");
    await dialog.getByRole("button", { name: "حفظ في Google Sheet" }).click();
    await dialog.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Synthetic UI customer", exact: true })
      .click();
    await page.getByRole("button", { name: "تعديل الملف" }).click();
    await dialog
      .getByLabel("الملاحظات", { exact: true })
      .fill("<b>safe literal note</b>");
    await dialog.getByRole("button", { name: "حفظ في Google Sheet" }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      await page.getByText("<b>safe literal note</b>", { exact: true }).count(),
      1,
    );
    assert.equal(await page.locator(".detail b").count(), 0);
    await page.getByRole("button", { name: "حجز موعد", exact: true }).click();
    await dialog.getByLabel("الوقت · القاهرة").fill("12:00");
    await dialog.getByLabel("الموظفة", { exact: true }).fill("Synthetic staff");
    await dialog.getByRole("button", { name: "حفظ في Google Sheet" }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "حجز موعد", exact: true }).click();
    await dialog.getByLabel("الوقت · القاهرة").fill("12:00");
    await dialog.getByLabel("الموظفة", { exact: true }).fill("Synthetic staff");
    await dialog.getByRole("button", { name: "حفظ في Google Sheet" }).click();
    await page
      .getByText("يوجد موعد لنفس الموظفة أو العميلة في نفس التوقيت", {
        exact: true,
      })
      .waitFor();
    await dialog.getByRole("button", { name: "إلغاء", exact: true }).click();
    await page.getByRole("button", { name: "تعديل", exact: true }).click();
    await dialog.getByLabel("الحالة", { exact: true }).selectOption("ملغي");
    await dialog.getByRole("button", { name: "حفظ في Google Sheet" }).click();
    await dialog.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "إضافة متابعة", exact: true })
      .click();
    await dialog
      .getByLabel("المهمة", { exact: true })
      .fill("Synthetic follow-up");
    await dialog.getByLabel("الموظفة", { exact: true }).fill("Synthetic staff");
    await dialog.getByRole("button", { name: "حفظ في Google Sheet" }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "المتابعات", exact: true }).click();
    await page.getByRole("button", { name: "إكمال", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "تم إكمال المتابعة" })
      .waitFor();
    await page.getByLabel("عرض المتابعات").selectOption("complete");
    await page
      .getByRole("cell", { name: "Synthetic follow-up", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "يوم الأتيليه. من بيانات الشيت." })
      .waitFor();
    assert.equal(f.context.RB_getData().customers.length, 1);
    assert.equal(f.context.RB_getData().tasks[0].status, "مكتملة");
    assert.deepEqual(errors, []);
  } catch (error) {
    console.log(
      "UI_DIAGNOSTIC",
      await page.evaluate(() => ({
        dialogOpen: document.querySelector("dialog").open,
        labels: [...document.querySelectorAll("dialog label")].map(
          (x) => x.textContent,
        ),
        buttons: [...document.querySelectorAll("dialog button")].map((x) => ({
          text: x.textContent,
          disabled: x.disabled,
        })),
        error: document.querySelector("#form-error").textContent,
      })),
    );
    throw error;
  } finally {
    await page.close();
  }
});
test("browser retries pending primary-write failure with same request ID and creates one record", async () => {
  const f = backend(),
    page = await pageFor(f);
  try {
    f.db.failure = (r, stage) =>
      r.sheet.name === "سجل العمليات" && stage === "before";
    await page.getByRole("button", { name: "العميلات", exact: true }).click();
    await page
      .getByRole("button", { name: "إضافة عميلة", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("اسم العميلة", { exact: true })
      .fill("Synthetic recovery customer");
    await dialog.getByRole("button", { name: "حفظ في Google Sheet" }).click();
    await dialog.getByText(/RB_PENDING/).waitFor();
    await dialog
      .getByRole("button", { name: "إعادة نفس الطلب المعلّق" })
      .click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(f.context.RB_getData().customers.length, 1);
    assert.equal(
      f.context.RB_getData().activity.filter((a) => a.action === "إضافة عميلة")
        .length,
      1,
    );
  } finally {
    await page.close();
  }
});
test("without Apps Script connection interface fails explicitly and does not show mock records", async () => {
  const page = await browser.newPage();
  try {
    await page.goto(origin);
    await page
      .getByRole("alert")
      .getByText(/Google Apps Script فقط/)
      .waitFor();
    assert.equal(await page.locator("#content").textContent(), "");
  } finally {
    await page.close();
  }
});
