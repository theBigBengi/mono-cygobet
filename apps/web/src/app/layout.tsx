import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { NavProgress } from "@/components/nav-progress";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CygoBet",
  description: "Predict, compete, and win with your friends",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Suspense>
            <NavProgress />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
