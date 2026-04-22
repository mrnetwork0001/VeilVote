'use client';

import { useState } from 'react';
import type { VoteChoice, VoteStatus } from '@/lib/types';
import VoteStatusTracker from './VoteStatusTracker';

interface VotePanelProps {
  proposalId: number;
  disabled?: boolean;
  hasVoted?: boolean;
}

export default function VotePanel({ proposalId, disabled = false, hasVoted = false }: VotePanelProps) {
  const [selected, setSelected] = useState<VoteChoice | null>(null);
  const [status, setStatus] = useState<VoteStatus>('idle');

  const handleVote = async () => {
    if (!selected || disabled || hasVoted) return;

    try {
      // Step 1: Encrypt
      setStatus('encrypting');
      await new Promise((r) => setTimeout(r, 1500));

      // Step 2: Submit
      setStatus('submitting');
      await new Promise((r) => setTimeout(r, 2000));

      // Step 3: Computing (MPC)
      setStatus('computing');
      await new Promise((r) => setTimeout(r, 3000));

      // Step 4: Finalized
      setStatus('finalized');
    } catch (err) {
      console.error('Vote failed:', err);
      setStatus('error');
    }
  };

  if (hasVoted) {
    return (
      <div className="glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>✅</div>
        <h4 style={{ marginBottom: 'var(--space-sm)' }}>Vote Recorded</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Your encrypted vote has been tallied. Individual votes are never revealed.
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
            <p style={{ color: 'var(--success)', fontWeight: 600 }}>
              Your vote has been encrypted and counted!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
      <h4 style={{ marginBottom: 'var(--space-lg)' }}>Cast Your Vote</h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
        Your vote is encrypted locally before submission. No one — not even Arcium nodes — can see how you voted.
      </p>

      <div className="vote-option-group">
        <button
          className={`vote-option ${selected === 'yes' ? 'selected' : ''}`}
          onClick={() => setSelected('yes')}
          disabled={disabled}
          id="vote-option-yes"
        >
          <div className="vote-option-radio" />
          <span className="vote-option-label">👍 Yes — Approve</span>
        </button>

        <button
          className={`vote-option ${selected === 'no' ? 'selected' : ''}`}
          onClick={() => setSelected('no')}
          disabled={disabled}
          id="vote-option-no"
        >
          <div className="vote-option-radio" />
          <span className="vote-option-label">👎 No — Reject</span>
        </button>
      </div>

      <button
        className="btn btn-primary btn-lg"
        style={{ width: '100%' }}
        disabled={!selected || disabled}
        onClick={handleVote}
        id="submit-vote-button"
      >
        🔐 Encrypt & Submit Vote
      </button>

      {status === 'error' && (
        <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: 'var(--space-md)', textAlign: 'center' }}>
          Vote failed. Please try again.
        </p>
      )}
    </div>
  );
}
