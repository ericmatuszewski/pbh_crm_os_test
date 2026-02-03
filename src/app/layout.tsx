import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { CommandPalette } from "@/components/shared/CommandPalette";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PBH Sales CRM",
  description: "Enterprise CRM system for PBH Holdings",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AppearanceProvider>
            <BusinessProvider>
              {children}
              <CommandPalette />
            </BusinessProvider>
          </AppearanceProvider>
        </QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
