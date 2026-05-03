import type { Metadata, Viewport } from "next";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ذكاء كاظمة | مساعد بحثي للتراث الكويتي والخليجي",
  description:
    "مساعد بحثي موثق يعتمد على محتوى منصة كاظمة كمصدر أولي — استرجاع ذكي من قاعدة البيانات، تحليل بالذكاء الاصطناعي، واستشهادات مرتبطة بالمصادر.",
  keywords: ["كاظمة", "التراث الكويتي", "المخطوطات", "العلماء", "البحث", "الذكاء الاصطناعي"],
  authors: [{ name: "منصة كاظمة" }],
  openGraph: {
    title: "ذكاء كاظمة | مساعد بحثي للتراث الكويتي والخليجي",
    description: "مساعد بحثي موثق يعتمد على محتوى منصة كاظمة كمصدر أولي",
    type: "website",
    locale: "ar_KW",
    siteName: "كاظمة",
  },
  twitter: {
    card: "summary_large_image",
    title: "ذكاء كاظمة",
    description: "مساعد بحثي للتراث الكويتي والخليجي",
  },
};

export const viewport: Viewport = {
  themeColor: "#2d6a4f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased bg-background">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
