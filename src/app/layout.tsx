import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://ai.kazima.org";
const SITE_NAME = "ذكاء كاظمة";
const SITE_TITLE = "ذكاء كاظمة | مساعد بحثي للتراث الكويتي والخليجي";
const SITE_DESC =
  "مساعد بحثي موثق يعتمد على محتوى منصة كاظمة كمصدر أولي — استرجاع ذكي من قاعدة البيانات، تحليل بالذكاء الاصطناعي، واستشهادات مرتبطة بالمصادر.";
const OG_IMAGE = "https://www.kazima.org/media/logo/kazima-og.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s | ذكاء كاظمة" },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: ["كاظمة", "تراث الكويت", "تاريخ الكويت", "المخطوطات الإسلامية", "أعلام الكويت", "Kuwait heritage", "Kazima"],
  authors: [{ name: "Kazima", url: "https://www.kazima.org" }],
  alternates: { canonical: SITE_URL, languages: { ar: SITE_URL } },
  openGraph: {
    type: "website",
    locale: "ar_KW",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESC,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESC, images: [OG_IMAGE] },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <head>
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ar_KW" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESC} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={SITE_NAME} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESC} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <link rel="canonical" href={SITE_URL} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
