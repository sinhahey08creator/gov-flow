import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "GovFlow AI",
  description: "AI-Powered Government Workflow & Resource Optimization",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex">
        <Sidebar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
