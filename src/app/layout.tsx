import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, JetBrains_Mono } from "next/font/google";
import { Copyright } from "@/components/copyright";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  variable: "--font-plex",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-num",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "checklistER · Alhadithah General Hospital", template: "%s · checklistER" },
  description: "Digital daily checklists for the Emergency Room, Alhadithah General Hospital.",
};

export const viewport: Viewport = {
  themeColor: "#0a2b35",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }} className={`${plex.variable} ${mono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <div className="backdrop" aria-hidden>
          <div className="backdrop-photo" />
          <div className="backdrop-tint" />
        </div>
        <div className="grain" aria-hidden />
        <div className="flex flex-1 flex-col">{children}</div>
        <Copyright />
      </body>
    </html>
  );
}
