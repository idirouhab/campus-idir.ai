import type { Metadata } from "next";
import { Inter, Space_Grotesk } from 'next/font/google';
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navigation from "@/components/Navigation";
import { LanguageWrapper } from "@/components/LanguageWrapper";

// Optimize font loading - Inter for body text
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

// Space Grotesk for headings and navigation
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: true,
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Courses Platform — Access Your Learning",
  description: "Student courses platform. Access your enrolled courses, track your progress, and enhance your learning experience.",
  keywords: ["courses", "learning", "education", "student platform", "online courses"],
  authors: [{ name: "Idir Ouhab Meskine", url: "https://idir.ai" }],
  creator: "Idir Ouhab Meskine",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Courses Platform",
    title: "Courses Platform — Access Your Learning",
    description: "Access your enrolled courses, track your progress, and enhance your learning experience.",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Courses Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Courses Platform — Access Your Learning",
    description: "Access your enrolled courses and enhance your learning experience.",
    images: [`${baseUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased bg-gray-50 text-gray-900">
        <Providers>
          <LanguageWrapper>
            <Navigation />
            {children}
          </LanguageWrapper>
        </Providers>
      </body>
    </html>
  );
}
