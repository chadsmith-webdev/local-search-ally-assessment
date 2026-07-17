import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local Search Ally Assessment",
  description: "A local visibility assessment interface for home service contractors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
