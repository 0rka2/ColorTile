import type { Metadata } from "next";
import localFont from "next/font/local";
import { CookieConsentBanner } from "./components/cookie-consent-banner";
import { GlobalButtonSounds } from "./game/components/global-button-sounds";
import { assertServerEnvironment } from "./lib/server-env";
import "./globals.css";

assertServerEnvironment();

const fredoka = localFont({
  src: "./fonts/FredokaLatin.woff2",
  variable: "--font-fredoka",
  weight: "400 600",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ColorTile",
  description: "A soft gradient tile puzzle game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={fredoka.variable}>
        <GlobalButtonSounds />
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
