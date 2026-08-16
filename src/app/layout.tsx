import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SGCT — Sistema de Gestão de Caravanas ao Templo",
  description: "Plataforma multi-tenant para gestão de caravanas ao Templo de Recife-PE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
