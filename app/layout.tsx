import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LATTIFORM — Computational Engineering Platform",
  description: "AI-native generative design for additive manufacturing. From requirement to manufacturable part.",
  keywords: ["TPMS", "lattice", "generative design", "additive manufacturing", "computational engineering"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-cad-bg text-cad-text antialiased">
        {children}
      </body>
    </html>
  );
}
