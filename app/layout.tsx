import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LATTIFORM Designer",
  description: "Generative design for additive manufacturing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cad-primary text-cad-text antialiased">
        {children}
      </body>
    </html>
  );
}
