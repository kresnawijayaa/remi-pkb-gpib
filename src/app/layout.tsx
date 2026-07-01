import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Persekutuan Kaum Bapak",
  description: "Sistem turnamen Remi 13 untuk PKB",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
