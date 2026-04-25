'use client';

import type { VoteStatus } from '@/lib/types';

interface Props {
  currentStatus: VoteStatus;
}

const steps: { key: VoteStatus; label: string }[] = [
  { key: 'encrypting', label: '> encrypting vote via x25519...' },
  { key: 'submitting', label: '> submitting to solana devnet...' },
  { key: 'computing', label: '> arcium MPC processing...' },
  { key: 'finalized', label: '> [OK] vote finalized.' },
];

export default function VoteStatusTracker({ currentStatus }: Props) {
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);

  return (
    <div className="status-tracker">
      {steps.map((step, i) => (
        <div
          key={step.key}
          className={`status-step ${i <= currentIndex ? (i < currentIndex ? 'completed' : 'active') : ''}`}
        >
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            minWidth: '20px',
          }}>
            {i < currentIndex ? '[x]' : i === currentIndex ? (
              <span className="animate-blink">&#9608;</span>
            ) : '[ ]'}
          </span>
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}
