import './globals.css';

export const metadata = {
  title: 'TSC Performance Report',
  description: 'Internal performance reporting tool for The Sleep Company',
};

import { Suspense } from 'react';
import NavBar from '@/components/NavBar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#0f1117', margin: 0 }}>
        <div style={{ padding: '24px 24px 0 24px', background: '#0f1117' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 16px 0', color: 'white', fontFamily: 'Inter, sans-serif' }}>🛏 TSC Performance Report</h1>
          <Suspense fallback={<div style={{ height: '40px' }} />}>
            <NavBar />
          </Suspense>
        </div>
        {children}
      </body>
    </html>
  );
}
