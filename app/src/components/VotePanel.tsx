'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { VoteChoice, VoteStatus } from '@/lib/types';
import { castVote, getExplorerLink } from '@/lib/veilvote-client';
import VoteStatusTracker from './VoteStatusTracker';

interface VotePanelProps {
  proposalId: number;
  proposalAuthority: string;
  disabled?: boolean;
  hasVoted?: boolean;
}

export default function VotePanel({ proposalId, proposalAuthority, disabled = false, hasVoted = false }: VotePanelProps) {
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
      setStatus('encrypting');
      setStatus('submitting');
      const sig = await castVote(
        connection,
        { publicKey: wallet.publicKey, signTransaction: wallet.signTransaction.bind(wallet) },
        proposalId,
        selected === 'yes',
        proposalAuthority
      );
      setTxSig(sig);

      setStatus('computing');
      await new Promise((r) => setTimeout(r, 3000));
      setStatus('finalized');
    } catch (err: any) {
      console.error('Vote failed:', err);
      setErrorMsg(err?.message?.substring(0, 200) || 'vote transaction failed');
      setStatus('error');
    }
  };

  if (hasVoted) {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-sm)', color: 'var(--accent-primary)' }}>[OK]</div>
        <h4>VOTE RECORDED</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          // your encrypted vote has been tallied onchain.
        </p>
      </div>
    );
  }

  if (status !== 'idle' && status !== 'error') {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
        <h4 style={{ marginBottom: 'var(--space-lg)' }}>$ VOTE --STATUS</h4>
        <VoteStatusTracker currentStatus={status} />
        {status === 'finalized' && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
            <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: 'var(--space-sm)', textShadow: '0 0 8px rgba(51, 255, 0, 0.5)' }}>
              [OK] vote encrypted & submitted on solana devnet
            </p>
            {txSig && (
              <a
                href={getExplorerLink(txSig)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)' }}
              >
                $ view tx on explorer &gt;
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
      <h4 style={{ marginBottom: 'var(--space-lg)' }}>$ CAST --VOTE</h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 'var(--space-lg)' }}>
        // your vote is encrypted via arcium MPC before submission. no one can see how you voted.
      </p>

      {!walletConnected && (
        <div style={{
          padding: 'var(--space-md)',
          border: '1px dashed var(--accent-secondary)',
          textAlign: 'center',
          marginBottom: 'var(--space-lg)',
          color: 'var(--accent-secondary)',
          fontSize: '0.8rem',
        }}>
          $ connect --wallet required
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
          <span className="vote-option-label">&gt; YES // approve</span>
        </button>

        <button
          className={`vote-option ${selected === 'no' ? 'selected' : ''}`}
          onClick={() => setSelected('no')}
          disabled={disabled || !walletConnected}
          id="vote-option-no"
        >
          <div className="vote-option-radio" />
          <span className="vote-option-label">&gt; NO // reject</span>
        </button>
      </div>

      <button
        className="btn btn-primary btn-lg"
        style={{ width: '100%' }}
        disabled={!selected || disabled || !walletConnected}
        onClick={handleVote}
        id="submit-vote-button"
      >
        [ ENCRYPT & SUBMIT ]
      </button>

      {status === 'error' && (
        <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
          <p style={{ color: 'var(--error)', fontSize: '0.8rem' }}>
            [ERR] {errorMsg || 'vote failed. retry.'}
          </p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setStatus('idle'); setErrorMsg(null); }}
            style={{ marginTop: 'var(--space-sm)' }}
          >
            [ RETRY ]
          </button>
        </div>
      )}
    </div>
  );
}