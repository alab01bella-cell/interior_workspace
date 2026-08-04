import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interior Workspace",
  description: "인테리어 상담 관리 워크스페이스",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
