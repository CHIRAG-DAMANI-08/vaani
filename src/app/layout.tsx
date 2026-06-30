import type { Metadata } from "next";
import { Syne, DM_Sans, Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { VaaniToaster } from "./VaaniToaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vaani - Real-Time Multilingual Streaming",
  description:
    "Real-time multilingual translation for live streamers. Reach Hindi, Tamil, Telugu & Marathi audiences instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${syne.variable} ${dmSans.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans">
        <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
          {children}
        </ClerkProvider>
        <VaaniToaster />
      </body>
    </html>
  );
}