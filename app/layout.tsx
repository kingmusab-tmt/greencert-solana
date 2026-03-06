import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers";
import { ThemeProvider } from "./components/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GreenCert Nigeria — Tokenize Solar Energy on Solana",
  description:
    "Enterprise DePIN platform using Solana state compression to tokenize verified solar energy into carbon offset cNFTs across West Africa.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <Providers>
        <ThemeProvider>
          <body
            suppressHydrationWarning
            className={`${inter.variable} ${geistMono.variable} antialiased`}
          >
            {children}
          </body>
        </ThemeProvider>
      </Providers>
    </html>
  );
}
