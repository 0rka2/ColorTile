import type { Metadata } from "next";
import localFont from "next/font/local";
import { GlobalButtonSounds } from "./global-button-sounds";
import "./globals.css";

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
      </body>
    </html>
  );
}
