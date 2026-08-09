import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "QazTender Radar",
  description: "Рейтинг и объяснение строительных тендеров Казахстана.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "QazTender Radar",
    description: "Тендеры, которые стоят вашего времени.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "QazTender Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "QazTender Radar",
    description: "Тендеры, которые стоят вашего времени.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
