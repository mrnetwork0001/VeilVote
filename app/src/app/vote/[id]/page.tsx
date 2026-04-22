'use client';

import { use } from 'react';
import Link from 'next/link';
import { DEMO_PROPOSALS } from '@/lib/types';
import { shortenAddress, formatDate } from '@/lib/program';
import VotePanel from '@/components/VotePanel';
import ResultsChart from '@/components/ResultsChart';
import CountdownTimer from '@/components/CountdownTimer';

export default function VotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const proposalId = parseInt(id, 10);
  const proposal = DEMO_PROPOSALS.find((p) => p.id === proposalId);

  if (!proposal) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>Proposal Not Found</h3>
            <p>This proposal doesn&apos;t exist or has been removed.</p>
            <Link href="/proposals" className="btn btn-primary">
              ← Back to Proposals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    active: 'badge-active',
    ended: 'badge-ended',
    revealed: 'badge-revealed',
  };

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
              <span className={`badge ${statusLabels[proposal.status]}`}>
                {proposal.status}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Proposal #{proposal.id}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: 'var(--space-lg)' }}>
              {proposal.title}
            </h1>

            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 'var(--space-xl)', fontSize: '1rem' }}>
              {proposal.description}
            </p>

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
                  Created by
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {shortenAddress(proposal.authority, 6)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Deadline
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  {formatDate(proposal.endTime)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Votes
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {proposal.totalVotes}
                </div>
              </div>
            </div>

            {/* Time remaining */}
            {proposal.status === 'active' && (
              <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Time Remaining
                </div>
                <CountdownTimer endTime={proposal.endTime} />
              </div>
            )}

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
                  Your vote is encrypted
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Votes are encrypted with x25519 + RescueCipher before submission. Arcium&apos;s MPC network processes votes on secret-shared data — no single node sees your choice.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Vote Panel or Results */}
          <div className="vote-sidebar animate-fade-in" style={{ animationDelay: '0.15s' }}>
            {proposal.status === 'revealed' ? (
              <ResultsChart result={proposal.result!} totalVotes={proposal.totalVotes} />
            ) : (
              <VotePanel
                proposalId={proposal.id}
                disabled={proposal.status !== 'active'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
