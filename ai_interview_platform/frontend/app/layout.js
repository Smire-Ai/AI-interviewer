import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import { AuthProvider } from "../context/AuthContext"; // Note the path: '../context/AuthContext'

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AI Interview Platform",
  description: "Hone your skills...",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}