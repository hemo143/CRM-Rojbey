import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  validateAppointment,
  validateCustomer,
  validDate,
} from "./domain.ts";
test("rejects overlapping appointments, permits adjacent and canceled appointments", () => {
  const d = seed();
  const a = d.appointments[0];
  assert.throws(
    () => validateAppointment(d, { ...a, time: "14:30" }),
    /يتعارض/,
  );
  assert.equal(validateAppointment(d, { ...a, time: "15:00" }).time, "15:00");
  assert.equal(
    validateAppointment(d, { ...a, time: "14:30", status: "ملغي" }).status,
    "ملغي",
  );
});
test("customer conflict is checked even with another staff member", () => {
  const d = seed();
  assert.throws(
    () => validateAppointment(d, { ...d.appointments[0], staff: "موظفة أخرى" }),
    /يتعارض/,
  );
});
test("normalizes Arabic phone numbers and rejects duplicate numbers", () => {
  const d = seed();
  const c = validateCustomer(d, { name: "اختبار", phone: "٠١٠ ١٢٣٤ ٥٦٧٨" });
  assert.equal(c.phone, "01012345678");
  d.customers[0].phone = c.phone;
  assert.throws(
    () => validateCustomer(d, { name: "اختبار", phone: "010-1234-5678" }),
    /مسجل/,
  );
});
test("rejects invalid calendar dates and unknown status", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.throws(() =>
    validateCustomer(seed(), { name: "اختبار", status: "invalid" }),
  );
});
