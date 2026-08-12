import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GovFlow AI",
  description: "AI-Powered Government Workflow & Resource Optimization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}