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
      setError(err?.message || 'failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>$ NEW --PROPOSAL</h3>
          <button className="modal-close" onClick={onClose}>[X]</button>
        </div>

        <div className="modal-body">
          {txSig ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)', color: 'var(--accent-primary)' }}>[OK]</div>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>PROPOSAL CREATED ON SOLANA</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 'var(--space-md)' }}>
                // submitted to devnet. MPC initializing encrypted tallies.
              </p>
              <a
                href={getExplorerLink(txSig)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                [ VIEW ON EXPLORER ]
              </a>
            </div>
          ) : (
            <>
              <div className="input-group">
                <label>$ title (max 50 chars)</label>
                <input
                  className="input"
                  type="text"
                  placeholder="what should the dao decide?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={50}
                  disabled={isSubmitting}
                  id="proposal-title-input"
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'right', display: 'block', marginTop: '4px' }}>
                  {title.length}/50
                </span>
              </div>

              <div className="input-group">
                <label>$ description (display only)</label>
                <textarea
                  className="textarea"
                  placeholder="provide context for voters..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  id="proposal-description-input"
                />
              </div>

              <div className="input-group">
                <label>$ duration --period</label>
                <select
                  className="select"
                  value={durationIndex}
                  onChange={(e) => setDurationIndex(Number(e.target.value))}
                  disabled={isSubmitting}
                  id="proposal-duration-select"
                >
                  {VOTING_PERIODS.map((p, i) => (
                    <option key={i} value={i}>
                      {p.label} // {p.description}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p style={{ color: 'var(--error)', fontSize: '0.8rem' }}>
                  [ERR] {error}
                </p>
              )}

              <div style={{
                padding: 'var(--space-md)',
                border: '1px dashed var(--glass-border)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
              }}>
                // this creates a real onchain proposal on solana devnet. your wallet will sign the transaction.
              </div>
            </>
          )}
        </div>

        {!txSig && (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
              [ CANCEL ]
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting || !wallet.connected}
              id="submit-proposal-button"
            >
              {isSubmitting ? '> submitting...' : '[ CREATE PROPOSAL ]'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}