import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { VaaniToaster } from "./VaaniToaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
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
  console.log("RootLayout: Clerk Key:", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <html
      lang="en"
      className={`${inter.variable} ${serif.variable} antialiased`}
    >
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
        <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
          {children}
        </ClerkProvider>
        <VaaniToaster />
      </body>
    </html>
  );
}