import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ذكاء كاظمة | مساعد بحثي للتراث الكويتي والخليجي",
  description:
    "مساعد بحثي موثق يعتمد على محتوى منصة كاظمة كمصدر أولي — استرجاع ذكي من قاعدة البيانات، تحليل بالذكاء الاصطناعي، واستشهادات مرتبطة بالمصادر.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
