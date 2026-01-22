import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { BusinessProvider } from "@/contexts/BusinessContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sales CRM",
  description: "A modern CRM system for sales teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BusinessProvider>
          {children}
        </BusinessProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
