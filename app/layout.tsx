import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'BL4CKOUT CTF | Elite Cyber Security Competition Platform',
  description: 'Next-Generation Capture The Flag Platform featuring Web, Forensics, Reverse Engineering, Pwn, Crypto & Steganography challenges.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#06070a] text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950 flex flex-col justify-between cyber-grid">
        <div>
          <Navbar />
          <main>{children}</main>
        </div>

        {/* Global Footer */}
        <footer className="border-t border-slate-900 bg-[#040508] py-8 text-center font-mono text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-400 font-bold">BL4CKOUT CTF PLATFORM</span>
              <span>— SECURE INFRASTRUCTURE</span>
            </div>
            <p className="text-slate-600">
              ENGINEERED FOR CYBERSECURITY PROFESSIONALS & CTF AUTHOR COMPETITIONS
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
