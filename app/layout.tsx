import type { Metadata } from "next";
import { Suspense } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import NextTopLoader from 'nextjs-toploader';
import "./globals.css";
import { Providers } from "@/components/Providers";
import AuthGate from "@/components/AuthGate";
import { LanguageWrapper } from "@/components/LanguageWrapper";
import { Analytics } from "@/components/Analytics";
import { AnalyticsUserWrapper } from "@/components/AnalyticsUserWrapper";
import { GA_MEASUREMENT_ID } from "@/lib/gtag";

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
  title: "idir.ai — Courses Platform",
  description: "Learn automation, AI, and modern development practices. Access your enrolled courses, track your progress, and enhance your learning experience with idir.ai.",
  keywords: ["idir.ai", "courses", "learning", "automation", "AI", "education", "online courses", "programming"],
  authors: [{ name: "Idir Ouhab Meskine", url: "https://idir.ai" }],
  creator: "Idir Ouhab Meskine",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "idir.ai",
    title: "idir.ai — Courses Platform",
    description: "Learn automation, AI, and modern development practices. Access your courses and enhance your learning experience.",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "idir.ai Courses Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "idir.ai — Courses Platform",
    description: "Learn automation, AI, and modern development. Access your courses with idir.ai.",
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
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: [{ url: '/favicon.ico' }],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased bg-gray-50 text-gray-900" suppressHydrationWarning>
        <NextTopLoader
          color="#10b981"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #10b981,0 0 5px #10b981"
        />
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', {
                    send_page_view: false
                  });
                `,
              }}
            />
          </>
        )}
        <Providers>
          <LanguageWrapper>
            <AuthGate>{children}</AuthGate>
            {GA_MEASUREMENT_ID && (
              <>
                  <Suspense fallback={null}>
                      <Analytics />
                  </Suspense>
                <AnalyticsUserWrapper />
              </>
            )}
          </LanguageWrapper>
        </Providers>
      </body>
    </html>
  );
}
