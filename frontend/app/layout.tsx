import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import Shell from "@/components/Shell";
import Providers from "@/components/Providers";
import "./globals.css";

const head = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-head" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });
export const metadata: Metadata = {
  title: "BEC Academic Portal",
  description: "Student reports and enrollment in one place",
  icons: { icon: "/bec-logo.png", apple: "/bec-logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${head.variable} ${body.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning><Providers><Shell>{children}</Shell></Providers></body>
    </html>
  );
}
