// Only inspected headers and controlled configuration vocabulary. No real customer records.
const customerHeaders = [
  "Customer ID",
  "الاسم",
  "رقم الهاتف",
  "تاريخ الفرح (أصلي)",
  "مكان السكن",
  "مصدر العميلة",
  "كود الفستان",
  "الملاحظات",
  "الموظفة",
  "حالة العميلة",
  "نوع الخدمة",
  "موديل الفستان",
  "تاريخ الإضافة",
  "آخر تعديل",
  "قناة التواصل",
  "Meta Contact ID",
  "Username",
  "آخر رسالة",
  "تاريخ آخر رسالة",
];
const catalog = {
  "مصدر العميلة": [
    "Instagram",
    "Facebook",
    "WhatsApp",
    "Walk-in",
    "Referral",
    "غير معروف",
  ],
  "نوع الخدمة": ["بيع", "إيجار", "بيع وإيجار", "غير محدد"],
  "موديل الفستان": ["A-Line", "Mermaid", "Princess", "Satin", "غير محدد"],
  "حالة العميلة": [
    "جديدة",
    "تم التواصل",
    "مهتمة",
    "حجزت موعد",
    "تمت الزيارة",
    "تم التعاقد",
    "غير مهتمة",
  ],
  "نوع الموعد": ["زيارة أولى", "تجربة فستان", "بروفة", "استلام", "إرجاع"],
  "حالة الموعد": ["بانتظار التأكيد", "مؤكد", "تم الحضور", "لم تحضر", "ملغي"],
  "حالة المتابعة": ["جديدة", "قيد التنفيذ", "مكتملة", "مؤجلة", "ملغاة"],
  "حالة الفستان": ["متاح", "محجوز", "مؤجر", "مباع", "تحت التعديل", "تنظيف"],
  "حالة الدفع": ["لم يدفع", "عربون", "مدفوع جزئيًا", "مكتمل"],
  "قناة التواصل": [
    "Instagram DM",
    "Facebook Messenger",
    "WhatsApp",
    "مكالمة",
    "زيارة المحل",
    "أخرى",
  ],
};
function installObserved(db, context) {
  const s = db.active.insertSheet("العملاء");
  s.getRange(1, 1, 1, 19).setValues([customerHeaders]);
  s.getRange(2, 1, 1, 19).setValues([
    [
      "SYNTHETIC-LEGACY-ID",
      "Synthetic historical customer",
      "01000000000",
      "raw historical wedding text",
      "",
      "Historical source text",
      "",
      "Original notes",
      "Unreviewed historical staff",
      "مستورد",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  ]);
  const lists = db.active.insertSheet("القوائم والإعدادات");
  const heads = Object.keys(catalog);
  lists.getRange(1, 1, 1, heads.length).setValues([heads]);
  heads.forEach((h, col) =>
    lists
      .getRange(2, col + 1, catalog[h].length, 1)
      .setValues(catalog[h].map((v) => [v])),
  );
}
module.exports = { customerHeaders, catalog, installObserved };
