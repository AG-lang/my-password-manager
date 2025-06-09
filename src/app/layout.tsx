// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';
import { CryptoProvider } from '../context/CryptoContext';

// 关键修复：在这里导入全局 CSS 文件
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'My Secure Vault',
  description: 'A zero-knowledge password manager.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CryptoProvider>
            {children}
          </CryptoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}