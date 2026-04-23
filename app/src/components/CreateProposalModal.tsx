'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { VOTING_PERIODS } from '@/lib/types';
import { createProposal, getExplorerLink } from '@/lib/veilvote-client';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateProposalModal({ isOpen, onClose, onCreated }: CreateProposalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationIndex, setDurationIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { connection } = useConnection();
  const wallet = useWallet();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!title.trim() || !wallet.publicKey || !wallet.signTransaction) return;

    setIsSubmitting(true);
    setError(null);
    setTxSig(null);

    try {
      const pollId = Math.floor(Math.random() * 100000);
      const question = title.trim().substring(0, 50);

      const sig = await createProposal(
        connection,
        { publicKey: wallet.publicKey, signTransaction: wallet.signTransaction.bind(wallet) },
        pollId,
        question
      );
      setTxSig(sig);

      setTimeout(() => {
        setTitle('');
        setDescription('');
        setDurationIndex(0);
        setTxSig(null);
        onClose();
        onCreated?.();
      }, 4000);
    } catch (err: any) {
      console.error('Create proposal failed:', err);
      setError(err?.message || 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Proposal</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {txSig ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>✅</div>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>Proposal Created on Solana!</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                Your proposal has been submitted to devnet. MPC is initializing encrypted tallies.
              </p>
              <a
                href={getExplorerLink(txSig)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                View on Explorer ↗
              </a>
            </div>
          ) : (
            <>
              <div className="input-group">
                <label>Proposal Title (max 50 chars)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="What should the DAO decide?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={50}
                  disabled={isSubmitting}
                  id="proposal-title-input"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                  {title.length}/50
                </span>
              </div>

              <div className="input-group">
                <label>Description (for display only)</label>
                <textarea
                  className="textarea"
                  placeholder="Provide context for voters..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  id="proposal-description-input"
                />
              </div>

              <div className="input-group">
                <label>Voting Period</label>
                <select
                  className="select"
                  value={durationIndex}
                  onChange={(e) => setDurationIndex(Number(e.target.value))}
                  disabled={isSubmitting}
                  id="proposal-duration-select"
                >
                  {VOTING_PERIODS.map((p, i) => (
                    <option key={i} value={i}>
                      {p.label} — {p.description}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p style={{ color: 'var(--error)', fontSize: '0.85rem' }}>
                  ⚠️ {error}
                </p>
              )}

              <div style={{
                padding: 'var(--space-md)',
                background: 'var(--accent-gradient-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
              }}>
                🔐 This creates a real on-chain proposal on Solana devnet. Your wallet will sign the transaction.
              </div>
            </>
          )}
        </div>

        {!txSig && (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting || !wallet.connected}
              id="submit-proposal-button"
            >
              {isSubmitting ? '⏳ Submitting...' : '🗳️ Create Proposal'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
