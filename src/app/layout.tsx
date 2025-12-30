import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { SiteHeader } from "@/components/layout/site-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrueFrame",
  description:
    "Check whether media is likely AI-generated with confidence and explainable signals."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
            Built for the TrueFrame demo experience.
          </footer>
        </div>
      </body>
    </html>
  );
}
