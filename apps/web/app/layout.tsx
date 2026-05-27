import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "@/components/Navbar";
import SocketInitializer from "@/components/SocketInitializer";
import BackgroundMusic from "@/components/audio/BackgroundMusic";
import SupersededOverlay from "@/components/game/hud/SupersededOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "EduBoard PAI — Platform Board Game Edukasi Islam",
    template: "%s | EduBoard PAI",
  },
  description:
    "Platform pembelajaran Pendidikan Agama Islam berbasis Digital Board Game interaktif. Guru dapat mengelola soal, membuat ruang permainan, dan memantau siswa secara real-time.",
  keywords: [
    "EduBoard",
    "PAI",
    "Pendidikan Agama Islam",
    "board game edukasi",
    "game edukasi",
    "pembelajaran interaktif",
    "SMA",
  ],
  authors: [{ name: "EduBoard PAI Team" }],
  creator: "EduBoard PAI",
  openGraph: {
    type: "website",
    locale: "id_ID",
    title: "EduBoard PAI — Platform Board Game Edukasi Islam",
    description:
      "Platform pembelajaran PAI berbasis Digital Board Game interaktif untuk SMA. Belajar lebih seru dan modern.",
    siteName: "EduBoard PAI",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduBoard PAI — Platform Board Game Edukasi Islam",
    description:
      "Platform pembelajaran PAI berbasis Digital Board Game interaktif untuk SMA.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-grid-premium">
        <SocketInitializer />
        <BackgroundMusic />
        <SupersededOverlay />
        <Navbar />
        {children}
        <Toaster richColors position="top-center" duration={4000} closeButton />
      </body>
    </html>
  );
}
