'use client';

import { useState } from 'react';
import { VOTING_PERIODS } from '@/lib/types';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; durationSeconds: number }) => void;
}

export default function CreateProposalModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateProposalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(VOTING_PERIODS[2].seconds); // Default: 7 days

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onSubmit({ title: title.trim(), description: description.trim(), durationSeconds: selectedPeriod });
    setTitle('');
    setDescription('');
    setSelectedPeriod(VOTING_PERIODS[2].seconds);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} id="create-proposal-modal">
        <div className="modal-header">
          <h3>Create Proposal</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label htmlFor="proposal-title">Title</label>
              <input
                id="proposal-title"
                className="input"
                type="text"
                placeholder="e.g., Enable Private Treasury Votes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                {title.length}/80
              </span>
            </div>

            <div className="input-group">
              <label htmlFor="proposal-description">Description</label>
              <textarea
                id="proposal-description"
                className="textarea"
                placeholder="Describe the proposal and why voters should care..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                {description.length}/280
              </span>
            </div>

            <div className="input-group">
              <label>Voting Period</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 'var(--space-sm)',
              }}>
                {VOTING_PERIODS.map((period) => (
                  <button
                    key={period.seconds}
                    type="button"
                    onClick={() => setSelectedPeriod(period.seconds)}
                    style={{
                      padding: 'var(--space-md)',
                      background:
                        selectedPeriod === period.seconds
                          ? 'rgba(124, 58, 237, 0.15)'
                          : 'rgba(15, 15, 35, 0.6)',
                      border:
                        selectedPeriod === period.seconds
                          ? '2px solid var(--accent-primary)'
                          : '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-body)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '2px' }}>
                      {period.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      {period.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim() || !description.trim()}
              id="submit-proposal-button"
            >
              🗳️ Create Proposal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
