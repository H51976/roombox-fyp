import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoomBox - Find Your Perfect Room & Roommate in Nepal",
  description: "Digital room-finder and roommate-matching platform designed specifically for Nepal's urban rental market. Find verified rooms in Kathmandu and Pokhara.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        suppressHydrationWarning
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
