import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "LeadPilot AI — Find better prospects", description: "Research your market, organize prospects, and prepare relevant outreach with LeadPilot AI." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
