import type { Metadata } from 'next';
import './globals.css';
import ClientProviders from './providers';

export const metadata: Metadata = {
  title: 'VeilVote — Private Verifiable Governance on Solana',
  description:
    'Cast encrypted votes using Arcium Multi-Party Computation. Your vote stays private — only final results are revealed on Solana.',
  keywords: ['DAO', 'governance', 'voting', 'privacy', 'Solana', 'Arcium', 'MPC', 'encrypted'],
  openGraph: {
    title: 'VeilVote — Private. Verifiable. Governance.',
    description: 'Encrypted DAO voting powered by Arcium MPC on Solana.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
