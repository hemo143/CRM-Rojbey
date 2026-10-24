import { connection } from "next/server";
import { notFound } from "next/navigation";
import { demoEnabled } from "@/lib/auth";
import AccountSetup from "./setup";
export const metadata = {
  title: "Rojbey | إعداد حساب الإدارة",
  robots: { index: false, follow: false },
};
export default async function Page() {
  await connection();
  // Public local-only utility during demo onboarding; no account registration API.
  if (!demoEnabled()) notFound();
  return <AccountSetup />;
}
