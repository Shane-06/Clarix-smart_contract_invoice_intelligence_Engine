import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: { default: 'Contract Intelligence', template: '%s | Contract Intelligence' },
  description: 'Review contracts, track milestones, and manage invoices and payments in one workspace.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans selection:bg-brand-light selection:text-brand-dark">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
