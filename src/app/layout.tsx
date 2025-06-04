
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// AuthProvider is now in Providers.tsx
import { Toaster } from "@/components/ui/toaster";
import { Providers } from './providers';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Delaware Fence Pro',
  description: 'Manage your fencing business with Delaware Fence Pro.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The 'dark' class will be managed by ThemeProvider on document.documentElement
    // We remove it from here to avoid conflicts.
    // suppressHydrationWarning is important for theme switching to avoid client/server mismatch.
    <html lang="en" className={cn(inter.variable)} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-body bg-background text-foreground">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
