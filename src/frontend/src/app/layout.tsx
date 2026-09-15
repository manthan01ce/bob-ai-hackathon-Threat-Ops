import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "700"] });

export const metadata: Metadata = {
  title: "PowerGrid AI",
  description: "Predictive Outage & Equipment Failure Advisor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
