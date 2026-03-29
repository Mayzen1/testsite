import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FakeMyRun - Générateur de GPX réaliste",
  description: "Dessinez un parcours sur la carte et exportez un fichier GPX 100% réaliste.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
