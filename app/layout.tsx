import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import logo from "./assets/logo.png";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RotaSocial",
  description: "Console público de voluntários focado em Demandas (casos)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased`}>
        <header className="navbar" role="banner">
          <div className="container navbar-inner">
            {/* Logo + título */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Image src={logo} alt="RotaSocial" width={28} height={28} className="navbar-logo" />
              <div className="navbar-title" title="RotaSocial">RotaSocial</div>
            </div>
            {/* Removido link 'Demandas' conforme solicitação */}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
