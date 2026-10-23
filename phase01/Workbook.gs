/** Explicit opt-in profile for the inspected XLSX structure. Contains no customer data. */
const RB_OBSERVED_CATALOG_HEADERS = [
  "مصدر العميلة",
  "نوع الخدمة",
  "موديل الفستان",
  "حالة العميلة",
  "نوع الموعد",
  "حالة الموعد",
  "حالة المتابعة",
  "حالة الفستان",
  "حالة الدفع",
  "قناة التواصل",
];
const RB_OBSERVED_HEADER_MAP = {
  المصادر: "مصدر العميلة",
  "حالات العميلات": "حالة العميلة",
  الخدمات: "نوع الخدمة",
  الموديلات: "موديل الفستان",
  "أنواع المواعيد": "نوع الموعد",
  "حالات المواعيد": "حالة الموعد",
  "حالات المتابعات": "حالة المتابعة",
  "قنوات التواصل": "قناة التواصل",
};
function RB_configureObservedWorkbook() {
  rbAdmin_();
  return rbLocked_(() => {
    const ss = rbSpreadsheet_();
    const catalog = ss.getSheetByName("القوائم والإعدادات");
    if (!catalog)
      throw Error("تبويب القوائم والإعدادات غير موجود؛ لا ينطبق ملف التعريف.");
    const heads = catalog
      .getRange(1, 1, 1, catalog.getLastColumn())
      .getDisplayValues()[0]
      .map((v) => rbString_(v));
    if (RB_OBSERVED_CATALOG_HEADERS.some((h) => heads.indexOf(h) < 0))
      throw Error(
        "عناوين القوائم مختلفة عن النسخة المفحوصة. راجعي المخطط قبل الربط.",
      );
    const customers = rbTable_("customers");
    const required = CHEAD.concat([
      "قناة التواصل",
      "Meta Contact ID",
      "Username",
      "آخر رسالة",
      "تاريخ آخر رسالة",
    ]);
    if (required.some((h) => customers.map[h] === undefined))
      throw Error("مخطط العميلات مختلف عن النسخة المفحوصة.");
    const properties = rbProps_();
    const raw = properties.getProperty("RB_SHEET_MAP");
    const map = raw ? JSON.parse(raw) : {};
    if (map.lists && map.lists !== "القوائم والإعدادات")
      throw Error("توجد خريطة قوائم أخرى؛ لم يتم استبدالها.");
    const previous = properties.getProperty("RB_LIST_HEADER_MAP");
    if (
      previous &&
      JSON.stringify(JSON.parse(previous)) !==
        JSON.stringify(RB_OBSERVED_HEADER_MAP)
    )
      throw Error("توجد خريطة أعمدة أخرى؛ راجعيها يدويًا.");
    map.lists = "القوائم والإعدادات";
    properties.setProperty("RB_SHEET_MAP", JSON.stringify(map));
    properties.setProperty(
      "RB_LIST_HEADER_MAP",
      JSON.stringify(RB_OBSERVED_HEADER_MAP),
    );
    properties.setProperty("RB_WORKBOOK_PROFILE", "rojbey-2026-export");
    return {
      ok: true,
      sheetValuesChanged: false,
      catalog: "القوائم والإعدادات",
      note: "ملف التعريف مضبوط فقط. يلزم تدقيق حي ونسخة احتياطية متحققة قبل RB_setup. أسماء الموظفات التاريخية لا تُعتمد تلقائيًا.",
    };
  });
}
function rbCheckPreflight_(key, table) {
  if (!rbProfile_() || key !== "lists") return rbCheckTable_(key, table, false);
  const missing = rbHeaders_(key).filter(
    (h) => h !== "الموظفات" && table.map[h] === undefined,
  );
  if (missing.length)
    throw Error("مخطط القوائم غير متوافق: " + missing.join("، "));
}
