import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lumina-scan.vercel.app"),
  title: "Lumina Scan — Autonomous Web3 Security Auditor",
  description: "AI-powered smart contract security analysis with Stellar-based machine payments.",
  icons: {
    icon: "/favicon.ico",
    apple: "/lumina-icon.png",
  },
  openGraph: {
    title: "Lumina Scan",
    description: "Autonomous Web3 Security Auditor — Powered by Stellar Agentic Payments",
    images: [{ url: "/lumina-logo.png", width: 800, height: 240 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* MCP manifest for AI agent discovery */}
        <link rel="mcp-manifest" href="/mcp.json" type="application/json" />
      </head>
      <body className="min-h-full flex flex-col bg-[#09090b] text-zinc-100">
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className:
                "!bg-zinc-900 !border-zinc-800 !text-zinc-100 !shadow-xl !shadow-black/30",
              descriptionClassName: "!text-zinc-400",
            }}
            theme="dark"
          />
      </body>
    </html>
  );
}
