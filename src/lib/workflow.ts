import { validDate, type Customer } from "./domain.ts";
export function dateLabel(date: string) {
  if (!date) return "—";
  if (!validDate(date)) return date;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeZone: "Africa/Cairo",
  }).format(new Date(date + "T12:00:00+02:00"));
}
export function timestampLabel(value: string) {
  const at = Date.parse(value);
  return Number.isFinite(at)
    ? new Date(at).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })
    : value || "—";
}
const searchable = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "");
const phoneDigits = (value: string) =>
  value
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/\D/g, "");
export function customerMatchesSearch(c: Customer, query: string) {
  const q = searchable(query.trim());
  if (!q) return true;
  if (
    [c.name, c.phone, c.username, c.id].some((v) =>
      searchable(v || "").includes(q),
    )
  )
    return true;
  return (
    /^[\d٠-٩۰-۹+\s().-]+$/.test(query) &&
    !!phoneDigits(query) &&
    phoneDigits(c.phone).includes(phoneDigits(query))
  );
}
export function recentCustomers(customers: Customer[], count = 5) {
  const timestamp = (c: Customer) =>
    Number.isFinite(Date.parse(c.createdAt)) ? Date.parse(c.createdAt) : 0;
  return [...customers]
    .reverse()
    .sort((a, b) => timestamp(b) - timestamp(a))
    .slice(0, count);
}
