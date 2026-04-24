'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { shortenAddress } from '@/lib/program';
import { hasUserVoted, fetchAllPolls, getExplorerLink, type OnChainPoll } from '@/lib/veilvote-client';
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

  // Reveal state
  const [revealing, setRevealing] = useState(false);
  const [revealSig, setRevealSig] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);

  useEffect(() => {
    const loadPoll = async () => {
      try {
        const polls = await fetchAllPolls(connection);
        const found = polls.find((p) => p.id === proposalId);
        if (found) {
          setPoll(found);
          if (wallet.publicKey) {
            const alreadyVoted = await hasUserVoted(
              connection,
              new PublicKey(found.pda),
              wallet.publicKey
            );
            setVoted(alreadyVoted);
          }
        }
      } catch (err: any) {
        console.error('Failed to load poll:', err);
        setError(err?.message || 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    loadPoll();
  }, [proposalId, wallet.publicKey, connection]);

  const isAuthority =
    wallet.publicKey && poll && wallet.publicKey.toBase58() === poll.authority;

  const handleReveal = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !poll) return;
    setRevealing(true);
    setRevealError(null);

    try {
      // 1. Server builds the reveal transaction
      const res = await fetch('/api/build-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revealResult',
          payer: wallet.publicKey.toBase58(),
          rpcUrl: connection.rpcEndpoint,
          pollId: poll.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to build reveal transaction');
      }
      const { transaction: txBase64 } = await res.json();

      // 2. Wallet signs
      const { Transaction } = await import('@solana/web3.js');
      const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
      const signedTx = await wallet.signTransaction(tx);

      // 3. Send to chain
      const sig = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
      });
      await connection.confirmTransaction(sig, 'confirmed');
      setRevealSig(sig);
    } catch (err: any) {
      setRevealError(err?.message || 'Reveal failed');
    } finally {
      setRevealing(false);
    }
  };

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
            <p>{error || "This proposal doesn't exist on devnet."}</p>
            <Link href="/proposals" className="btn btn-primary">← Back to Proposals</Link>
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
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: 'var(--text-secondary)', fontSize: '0.9rem',
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
              {isAuthority && (
                <span style={{
                  fontSize: '0.75rem', padding: '2px 10px',
                  background: 'rgba(139,92,246,0.15)', color: 'var(--text-accent)',
                  borderRadius: '999px', border: '1px solid rgba(139,92,246,0.3)',
                }}>
                  👑 Your Proposal
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 'var(--space-lg)' }}>
              {poll.question}
            </h1>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-lg)', padding: 'var(--space-xl)',
              background: 'rgba(15, 15, 35, 0.4)', borderRadius: 'var(--radius-md)',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authority</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{shortenAddress(poll.authority, 6)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PDA</div>
                <a href={`https://explorer.solana.com/address/${poll.pda}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-accent)' }}>
                  {shortenAddress(poll.pda, 6)} ↗
                </a>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network</div>
                <div style={{ fontSize: '0.85rem' }}>Solana Devnet</div>
              </div>
            </div>

            <div style={{
              marginTop: 'var(--space-xl)', padding: 'var(--space-lg)',
              background: 'var(--accent-gradient-subtle)', borderRadius: 'var(--radius-md)',
              display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🔐</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '4px' }}>Your vote is encrypted on-chain</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Votes are encrypted with x25519 + RescueCipher via Arcium MPC. Individual votes are never visible — only the final tally after reveal.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Vote panel OR Reveal panel for authority */}
          <div className="vote-sidebar animate-fade-in" style={{ animationDelay: '0.15s', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Always show vote panel */}
            <VotePanel
              proposalId={poll.id}
              proposalAuthority={poll.authority}
              disabled={false}
              hasVoted={voted}
            />

            {/* Reveal panel: only for proposal authority */}
            {isAuthority && (
              <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
                <h4 style={{ marginBottom: 'var(--space-sm)' }}>👑 Authority Controls</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
                  As the proposal creator, you can request the Arcium MPC cluster to decrypt and reveal the final vote tally.
                </p>

                {revealSig ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>✅</div>
                    <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 'var(--space-sm)', fontSize: '0.9rem' }}>
                      Reveal requested! MPC nodes are decrypting the tally.
                    </p>
                    <a
                      href={getExplorerLink(revealSig)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      View on Explorer ↗
                    </a>
                  </div>
                ) : (
                  <>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleReveal}
                      disabled={revealing}
                      id="reveal-result-button"
                    >
                      {revealing ? '⏳ Sending reveal request...' : '🔓 Reveal Vote Results'}
                    </button>
                    {revealError && (
                      <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: 'var(--space-sm)', textAlign: 'center' }}>
                        ⚠️ {revealError}
                      </p>
                    )}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-md)', textAlign: 'center' }}>
                      This submits a transaction to trigger the Arcium MPC reveal computation.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
