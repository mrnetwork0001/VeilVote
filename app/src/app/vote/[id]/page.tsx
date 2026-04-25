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

  // Result from Arcium MPC callback
  const [revealResult, setRevealResult] = useState<{ found: boolean; result?: boolean; signature?: string } | null>(null);
  const [checkingResult, setCheckingResult] = useState(false);

  const checkRevealResult = async (pollPda: string) => {
    setCheckingResult(true);
    try {
      const res = await fetch('/api/build-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetchRevealResult',
          payer: PublicKey.default.toBase58(),
          rpcUrl: connection.rpcEndpoint,
          pollPda,
        }),
      });
      const data = await res.json();
      if (data.found) setRevealResult(data);
    } catch {}
    setCheckingResult(false);
  };

  useEffect(() => {
    const loadPoll = async () => {
      try {
        const polls = await fetchAllPolls(connection);
        const found = polls.find((p) => p.id === proposalId);
        if (found) {
          setPoll(found);
          await checkRevealResult(found.pda);
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

      const { Transaction } = await import('@solana/web3.js');
      const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
      const signedTx = await wallet.signTransaction(tx);

      const sig = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
      });
      await connection.confirmTransaction(sig, 'confirmed');
      setRevealSig(sig);

      const pollInterval = setInterval(async () => {
        const res2 = await fetch('/api/build-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'fetchRevealResult',
            payer: PublicKey.default.toBase58(),
            rpcUrl: connection.rpcEndpoint,
            pollPda: poll.pda,
          }),
        });
        const data = await res2.json();
        if (data.found) {
          setRevealResult(data);
          clearInterval(pollInterval);
        }
      }, 5000);
      setTimeout(() => clearInterval(pollInterval), 120000);
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
            <div className="empty-state-icon animate-blink" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem' }}>&#9608;</div>
            <h3>$ LOADING PROPOSAL #{proposalId}...</h3>
            <p>// fetching from solana devnet...</p>
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
            <div className="empty-state-icon" style={{ color: 'var(--error)' }}>[404]</div>
            <h3>PROPOSAL #{proposalId} NOT FOUND</h3>
            <p>{error || "// this proposal doesn't exist on devnet."}</p>
            <Link href="/proposals" className="btn btn-primary">[ BACK TO PROPOSALS ]</Link>
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
            color: 'var(--text-secondary)', fontSize: '0.8rem',
            marginBottom: 'var(--space-xl)',
          }}
        >
          &lt; cd /proposals
        </Link>

        <div className="vote-layout">
          {/* Left: Proposal Details */}
          <div className="glass-card vote-details animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
              {revealResult?.found ? (
                <span className={`badge ${revealResult.result ? 'badge-revealed' : 'badge-ended'}`}>
                  {revealResult.result ? '[OK] PASSED' : '[ERR] REJECTED'}
                </span>
              ) : (
                <span className="badge badge-active">[ACTIVE]</span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                // proposal #{poll.id}
              </span>
              {isAuthority && (
                <span style={{
                  fontSize: '0.7rem', padding: '2px 10px',
                  border: '1px solid var(--accent-secondary)',
                  color: 'var(--accent-secondary)',
                }}>
                  AUTHORITY
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', marginBottom: 'var(--space-lg)' }}>
              &gt; {poll.question}
            </h1>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-md)', padding: 'var(--space-lg)',
              border: '1px dashed var(--glass-border)',
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>AUTHORITY</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>{shortenAddress(poll.authority, 6)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>PDA</div>
                <a href={`https://explorer.solana.com/address/${poll.pda}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-secondary)' }}>
                  {shortenAddress(poll.pda, 6)} &gt;
                </a>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>NETWORK</div>
                <div style={{ fontSize: '0.8rem' }}>solana://devnet</div>
              </div>
            </div>

            <div style={{
              marginTop: 'var(--space-xl)', padding: 'var(--space-md)',
              border: '1px dashed var(--glass-border)',
              display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start',
              fontSize: '0.8rem',
            }}>
              <span style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>&gt;</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--accent-primary)' }}>ENCRYPTED ONCHAIN</div>
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.75rem' }}>
                  votes are encrypted with x25519 + RescueCipher via arcium MPC.
                  individual votes are never visible -- only the final tally after reveal.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Vote panel + Reveal */}
          <div className="vote-sidebar animate-fade-in" style={{ animationDelay: '0.15s', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <VotePanel
              proposalId={poll.id}
              proposalAuthority={poll.authority}
              disabled={false}
              hasVoted={voted}
            />

            {/* Reveal panel: only for proposal authority */}
            {isAuthority && (
              <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
                <h4 style={{ marginBottom: 'var(--space-sm)' }}>$ SUDO --REVEAL</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 'var(--space-lg)' }}>
                  // as authority, request arcium MPC cluster to decrypt and reveal the final vote tally.
                </p>

                {revealSig ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--accent-primary)', marginBottom: 'var(--space-sm)', textShadow: '0 0 8px rgba(51, 255, 0, 0.5)' }}>[OK]</div>
                    <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 'var(--space-sm)', fontSize: '0.8rem' }}>
                      reveal requested. MPC nodes decrypting tally...
                    </p>
                    <a
                      href={getExplorerLink(revealSig)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      [ VIEW TX ]
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
                      {revealing ? '> sending reveal request...' : '[ REVEAL RESULTS ]'}
                    </button>
                    {revealError && (
                      <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 'var(--space-sm)', textAlign: 'center' }}>
                        [ERR] {revealError}
                      </p>
                    )}
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-md)', textAlign: 'center' }}>
                      // triggers arcium MPC reveal computation
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Result display */}
            {revealResult?.found && (
              <div className="glass-card" style={{
                padding: 'var(--space-xl)', textAlign: 'center',
                borderColor: revealResult.result ? 'var(--success)' : 'var(--error)',
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  marginBottom: 'var(--space-sm)',
                  color: revealResult.result ? 'var(--success)' : 'var(--error)',
                  textShadow: revealResult.result
                    ? '0 0 15px rgba(51, 255, 0, 0.6)'
                    : '0 0 15px rgba(255, 51, 51, 0.6)',
                  fontWeight: 800,
                }}>
                  {revealResult.result ? '[OK]' : '[ERR]'}
                </div>
                <h3 style={{
                  color: revealResult.result ? 'var(--success)' : 'var(--error)',
                  marginBottom: 'var(--space-sm)',
                }}>
                  PROPOSAL {revealResult.result ? 'PASSED' : 'REJECTED'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                  // result decrypted by arcium MPC cluster. tally revealed onchain.
                </p>
                {revealResult.signature && (
                  <a
                    href={getExplorerLink(revealResult.signature)}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    [ VIEW REVEAL TX ]
                  </a>
                )}
              </div>
            )}

            {/* Polling indicator */}
            {revealSig && !revealResult?.found && (
              <div className="glass-card" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
                <div className="animate-blink" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', marginBottom: 'var(--space-sm)', color: 'var(--accent-primary)' }}>&#9608;</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  // waiting for arcium MPC nodes to decrypt the tally...
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 'var(--space-md)' }}
                  onClick={() => poll && checkRevealResult(poll.pda)}
                  disabled={checkingResult}
                >
                  {checkingResult ? '> checking...' : '[ CHECK NOW ]'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
