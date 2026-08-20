import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Contract & Invoice Intelligence Engine",
  description: "AI-powered contract analysis, milestone tracking, automated invoice payments, and chat client for freelancers.",
  keywords: "smart contract, invoice engine, freelancer dashboard, AI contract analyzer, resend email, risk score",
  authors: [{ name: "Antigravity Dev Engine" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
      style={{ colorScheme: 'dark' }}
    >
      <body className="min-h-full flex flex-col font-sans bg-zinc-950 text-zinc-50 antialiased selection:bg-violet-500/30 selection:text-violet-200">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
