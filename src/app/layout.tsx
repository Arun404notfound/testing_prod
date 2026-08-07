import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { BackToTop } from "@/components/ui/back-to-top";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Self-hosted (bundled at build time, no runtime Google Fonts request) so the
 * report pages render with the exact same font file in a real browser and in
 * the headless Chromium that prints the PDF export — see report-theme.ts.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechGrah Innovations | Assessment Portal",
  description: "Modern SaaS assessment platform demo",
  icons: { icon: "/favicon.webp" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full" suppressHydrationWarning>
        {children}
        <BackToTop />
      </body>
    </html>
  );
}
