import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Attendance System",
  description: "Track and manage student attendance efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
