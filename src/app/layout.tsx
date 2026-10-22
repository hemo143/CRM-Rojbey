import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/cormorant-garamond/400.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Rojbey | الأتيليه",
  description: "مساحة فريق روجبي لإدارة العميلات والمواعيد والمتابعات",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
