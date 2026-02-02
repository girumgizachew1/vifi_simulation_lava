import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ViFi Protocol Simulator | Virtual Fiat Enclave",
  description: "Advanced simulation engine for the ViFi Variable-Peg AMM. Visualize liquidity dynamics, system solvency, and LP valuation for next-gen Virtual Fiat currencies.",
  keywords: ["ViFi", "DeFi", "AMM", "Simulation", "Crypto", "Stablecoin", "Liquidity Provider", "Forex"],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: "ViFi Protocol Simulator",
    description: "Model the future of on-chain forex. Test VP-AMM mechanics against historical market data.",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
