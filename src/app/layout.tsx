import { ThemeProvider } from "@/src/context/ThemeContext";
import { SidebarProvider } from '@/src/context/SidebarContext';
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "میز کار",
};

const themeScript = `
  try {
    const saved = localStorage.getItem('theme');
    const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (_) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ fontFamily: "'iransans', sans-serif" }}>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
