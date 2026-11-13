import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Poppins, Montserrat } from "next/font/google";
import "./globals.css";
import AuthCookieSync from "@/components/AuthCookieSync";

const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

const montserrat = Montserrat({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SMARTval - Property Valuation System",
  description: "Modern property valuation report generation system with comprehensive form-based data collection and professional reporting capabilities.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthCookieSync />
        {children}
      </body>
    </html>
  );
}
