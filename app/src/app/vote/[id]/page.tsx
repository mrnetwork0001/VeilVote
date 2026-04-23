'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { shortenAddress } from '@/lib/program';
import { hasUserVoted, fetchAllPolls, type OnChainPoll } from '@/lib/veilvote-client';
import VotePanel from '@/components/VotePanel';

export default function VotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const proposalId = parseInt(id, 10);
  const { connection } = useConnection();
  const wallet = useWallet();

  const [poll, setPoll] = useState<OnChainPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPoll = async () => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        setLoading(false);
        return;
      }

      try {
        const anchorWallet = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction.bind(wallet),
          signAllTransactions: wallet.signAllTransactions?.bind(wallet),
        } as anchor.Wallet;

        const polls = await fetchAllPolls(connection, anchorWallet);
        const found = polls.find((p) => p.id === proposalId);
        if (found) {
          setPoll(found);
          // Check if user already voted
          const alreadyVoted = await hasUserVoted(connection, found.pda, wallet.publicKey!);
          setVoted(alreadyVoted);
        }
      } catch (err: any) {
        console.error('Failed to load poll:', err);
        setError(err?.message || 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    loadPoll();
  }, [proposalId, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions, connection]);

  if (!wallet.connected) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">🔗</div>
            <h3>Connect Your Wallet</h3>
            <p>Connect a Solana wallet to view and vote on proposals.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ animation: 'pulse-dot 1.5s infinite' }}>⏳</div>
            <h3>Loading Proposal #{proposalId}...</h3>
            <p>Fetching from Solana devnet...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>Proposal #{proposalId} Not Found</h3>
            <p>{error || 'This proposal doesn\'t exist on devnet. It may not have been created yet.'}</p>
            <Link href="/proposals" className="btn btn-primary">
              ← Back to Proposals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container">
        <Link
          href="/proposals"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            marginBottom: 'var(--space-xl)',
          }}
        >
          ← Back to Proposals
        </Link>

        <div className="vote-layout">
          {/* Left: Proposal Details */}
          <div className="glass-card vote-details animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <span className="badge badge-active">active</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Proposal #{poll.id}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 'var(--space-lg)' }}>
              {poll.question}
            </h1>

            {/* Metadata */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-lg)',
                padding: 'var(--space-xl)',
                background: 'rgba(15, 15, 35, 0.4)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Authority
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {shortenAddress(poll.authority.toBase58(), 6)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PDA
                </div>
                <a
                  href={`https://explorer.solana.com/address/${poll.pda.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-accent)' }}
                >
                  {shortenAddress(poll.pda.toBase58(), 6)} ↗
                </a>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Network
                </div>
                <div style={{ fontSize: '0.85rem' }}>Solana Devnet</div>
              </div>
            </div>

            {/* Privacy notice */}
            <div
              style={{
                marginTop: 'var(--space-xl)',
                padding: 'var(--space-lg)',
                background: 'var(--accent-gradient-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                gap: 'var(--space-md)',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🔐</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>
                  Your vote is encrypted on-chain
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Votes are encrypted with x25519 + RescueCipher before submission. Arcium&apos;s MPC network processes votes on secret-shared data — no single node sees your choice. This is a real transaction on Solana devnet.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Vote Panel */}
          <div className="vote-sidebar animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <VotePanel
              proposalId={poll.id}
              disabled={false}
              hasVoted={voted}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
