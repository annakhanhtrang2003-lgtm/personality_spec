import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Khám phá bản thân",
  description: "Bài test tính cách MBTI 40 câu cho sinh viên — kèm cung hoàng đạo và thần số học.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
