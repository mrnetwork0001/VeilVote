'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import type { VoteChoice, VoteStatus } from '@/lib/types';
import { castVote, getExplorerLink } from '@/lib/veilvote-client';
import VoteStatusTracker from './VoteStatusTracker';

interface VotePanelProps {
  proposalId: number;
  disabled?: boolean;
  hasVoted?: boolean;
}

export default function VotePanel({ proposalId, disabled = false, hasVoted = false }: VotePanelProps) {
  const [selected, setSelected] = useState<VoteChoice | null>(null);
  const [status, setStatus] = useState<VoteStatus>('idle');
  const [txSig, setTxSig] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { connection } = useConnection();
  const wallet = useWallet();

  const handleVote = async () => {
    if (!selected || disabled || hasVoted) return;
    if (!wallet.publicKey || !wallet.signTransaction) return;

    setErrorMsg(null);

    try {
      // Step 1: Encrypting
      setStatus('encrypting');

      const anchorWallet = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet),
        signAllTransactions: wallet.signAllTransactions!.bind(wallet),
      } as anchor.Wallet;

      // Step 2: Submitting (encryption happens in API route, then tx is sent)
      setStatus('submitting');
      const sig = await castVote(
        connection,
        anchorWallet,
        proposalId,
        selected === 'yes'
      );
      setTxSig(sig);

      // Step 3: Computing (MPC processing)
      setStatus('computing');
      await new Promise((r) => setTimeout(r, 3000));

      // Step 4: Done
      setStatus('finalized');
    } catch (err: any) {
      console.error('Vote failed:', err);
      setErrorMsg(err?.message?.substring(0, 200) || 'Vote transaction failed');
      setStatus('error');
    }
  };

  if (hasVoted) {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>✅</div>
        <h4 style={{ marginBottom: 'var(--space-sm)' }}>Vote Recorded</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Your encrypted vote has been tallied on-chain. Individual votes are never revealed.
        </p>
      </div>
    );
  }

  if (status !== 'idle' && status !== 'error') {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
        <h4 style={{ marginBottom: 'var(--space-lg)' }}>Vote Progress</h4>
        <VoteStatusTracker currentStatus={status} />
        {status === 'finalized' && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
            <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
              ✅ Vote encrypted & submitted on Solana devnet!
            </p>
            {txSig && (
              <a
                href={getExplorerLink(txSig)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.8rem', color: 'var(--text-accent)' }}
              >
                View transaction on Solana Explorer ↗
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  const walletConnected = wallet.connected && wallet.publicKey;

  return (
    <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
      <h4 style={{ marginBottom: 'var(--space-lg)' }}>Cast Your Vote</h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
        Your vote is encrypted via Arcium MPC before submission. No one can see how you voted.
      </p>

      {!walletConnected && (
        <div style={{
          padding: 'var(--space-lg)',
          background: 'var(--accent-gradient-subtle)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          marginBottom: 'var(--space-lg)',
        }}>
          <p style={{ color: 'var(--text-accent)', fontSize: '0.85rem', fontWeight: 600 }}>
            🔗 Connect your wallet to vote
          </p>
        </div>
      )}

      <div className="vote-option-group">
        <button
          className={`vote-option ${selected === 'yes' ? 'selected' : ''}`}
          onClick={() => setSelected('yes')}
          disabled={disabled || !walletConnected}
          id="vote-option-yes"
        >
          <div className="vote-option-radio" />
          <span className="vote-option-label">👍 Yes — Approve</span>
        </button>

        <button
          className={`vote-option ${selected === 'no' ? 'selected' : ''}`}
          onClick={() => setSelected('no')}
          disabled={disabled || !walletConnected}
          id="vote-option-no"
        >
          <div className="vote-option-radio" />
          <span className="vote-option-label">👎 No — Reject</span>
        </button>
      </div>

      <button
        className="btn btn-primary btn-lg"
        style={{ width: '100%' }}
        disabled={!selected || disabled || !walletConnected}
        onClick={handleVote}
        id="submit-vote-button"
      >
        🔐 Encrypt & Submit Vote
      </button>

      {status === 'error' && (
        <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
          <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>
            {errorMsg || 'Vote failed. Please try again.'}
          </p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setStatus('idle'); setErrorMsg(null); }}
            style={{ marginTop: 'var(--space-sm)' }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
