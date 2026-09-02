import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FormFlow',
  description: "Upload your university forms, PDFs, or applications — we'll help you fill them out automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <head>
        {/*
          Material Symbols is a variable icon font (FILL/wght/GRAD/opsz axes) that
          next/font/google's simple weight API can't express, so it's loaded as a
          stylesheet here instead. `no-page-custom-font` is a Pages Router-era rule
          that doesn't recognize the App Router root layout as the `_document`
          equivalent it's guarding against — safe to disable for this single link.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
