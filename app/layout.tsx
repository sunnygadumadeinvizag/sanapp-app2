import type { Metadata } from "next";
import "iipe-common-ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIPE Leave Management",
  description: "Independent IIPE application #2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
