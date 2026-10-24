import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "./domain.ts";
import {
  customerMatchesSearch,
  recentCustomers,
  dateLabel,
  timestampLabel,
} from "./workflow.ts";
test("customer search accepts Arabic/Persian digits, phone formatting, diacritics and IDs", () => {
  const c = {
    ...seed().customers[0],
    id: "LEGACY-UNIQUE-101",
    name: "مَرْيَم",
    phone: "٠١٠ ١٢٣٤ ٥٦٧٨",
  };
  assert.equal(customerMatchesSearch(c, "01012345678"), true);
  assert.equal(customerMatchesSearch(c, "۰۱۰۱۲۳۴۵۶۷۸"), true);
  assert.equal(customerMatchesSearch(c, "مريم"), true);
  assert.equal(customerMatchesSearch(c, "unique-101"), true);
  assert.equal(customerMatchesSearch(c, "nobody"), false);
});
test("recent dashboard prioritizes actual creation times without inventing historical dates", () => {
  const c = seed().customers[0];
  const rows = [
    { ...c, id: "legacy", createdAt: "" },
    { ...c, id: "new", createdAt: "2026-10-24T10:00:00Z" },
    { ...c, id: "manual", createdAt: "" },
  ];
  assert.deepEqual(
    recentCustomers(rows).map((c) => c.id),
    ["new", "manual", "legacy"],
  );
  assert.equal(rows[0].createdAt, "");
});
test("malformed historical dates remain visible without crashing the interface", () => {
  assert.equal(dateLabel("أكتوبر بدون سنة"), "أكتوبر بدون سنة");
  assert.equal(dateLabel("2026-02-31"), "2026-02-31");
  assert.equal(dateLabel(""), "—");
  assert.equal(timestampLabel("تاريخ غير محدد"), "تاريخ غير محدد");
});
