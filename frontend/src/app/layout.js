import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Class Task Tracker",
  description: "Aplikasi manajemen tugas kelas",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.className}>
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
