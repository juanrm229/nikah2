import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost, JetBrains_Mono, Amiri } from "next/font/google";
import { wedding } from "@/config/wedding";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const body = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const arabic = Amiri({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(wedding.site.url),
  title: `${wedding.title} — Undangan Pernikahan`,
  description: `Dengan memohon rahmat Allah SWT, kami mengundang Anda untuk hadir di pernikahan ${wedding.title}.`,
  openGraph: {
    title: `${wedding.title} — Undangan Pernikahan`,
    description: "Merupakan suatu kehormatan bagi kami apabila Anda berkenan hadir.",
    type: "website",
    locale: "id_ID",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#12100e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${display.variable} ${body.variable} ${mono.variable} ${arabic.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
