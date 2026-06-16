import { ThemeProvider } from "@/src/context/ThemeContext";
import { SidebarProvider } from '@/src/context/SidebarContext';
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-app-canvas dark:bg-gray-950" style={{ fontFamily: "'iransans', sans-serif" }}>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
