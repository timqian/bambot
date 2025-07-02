import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BamBot",
  description: "Make it easy to play with robots 🤖",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white w-screen h-screen`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
        >
          <Header />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
