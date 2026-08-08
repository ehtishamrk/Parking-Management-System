import type { Metadata } from 'next';
import { Barlow_Condensed, Inter, IBM_Plex_Mono, Noto_Nastaliq_Urdu } from 'next/font/google';
import './globals.css';
import { LangProvider } from '@/lib/i18n/context';
import { Toaster } from 'react-hot-toast';

const display = Barlow_Condensed({ variable: '--font-display', weight: ['600', '700'], subsets: ['latin'] });
const body = Inter({ variable: '--font-body', subsets: ['latin'] });
const mono = IBM_Plex_Mono({ variable: '--font-mono', weight: ['400', '500', '600'], subsets: ['latin'] });
const nastaliq = Noto_Nastaliq_Urdu({ variable: '--font-urdu', weight: ['400', '700'], subsets: ['arabic'] });

export const metadata: Metadata = {
  title: 'ParkStub — Parking Management System',
  description: 'Ticketing, passes, pricing and revenue for parking lots.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable} ${nastaliq.variable} antialiased`}>
        <LangProvider>
          <Toaster position="top-center" />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
