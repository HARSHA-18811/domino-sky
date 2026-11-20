import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Domino Sky — Flight Disruption Cascade Simulator',
  description: 'AI-Powered Flight Disruption Cascade & Recovery Simulator | Prompt Wars 2026',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="grid-bg">
        {children}
      </body>
    </html>
  );
}
