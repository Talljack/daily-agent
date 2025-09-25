import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Daily Agent",
  description: "自动化日报 Agent (Next.js + LangChain.js)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
