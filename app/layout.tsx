import type { Metadata } from "next";
import { Geist_Mono, Playfair_Display, Roboto } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { CurrentAdminProvider } from "@/contexts/current-admin-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";
import "next-cloudinary/dist/cld-video-player.css";

// The site's default body font — swap this (and the matching --font-roboto
// reference in globals.css) if the client wants a different one later.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-display-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Heim Dansekompani",
  description:
    "Heim Dansekompani er et nyetablert dansekompani ledet av Mathias Lind Engelstad, i skjæringspunktet mellom hip hop og samtidsdans.",
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="no"
      className={`dark ${roboto.variable} ${geistMono.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-black text-white">
        <CurrentAdminProvider>
          <Navbar />
          <main className="flex-1 min-h-dvh pt-20">{children}</main>
          <Footer />
        </CurrentAdminProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
