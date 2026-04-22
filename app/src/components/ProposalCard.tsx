'use client';

import Link from 'next/link';
import type { Proposal } from '@/lib/types';
import { shortenAddress } from '@/lib/program';
import CountdownTimer from './CountdownTimer';

interface ProposalCardProps {
  proposal: Proposal;
}

export default function ProposalCard({ proposal }: ProposalCardProps) {
  const statusMap: Record<string, string> = {
    active: 'badge-active',
    ended: 'badge-ended',
    revealed: 'badge-revealed',
  };

  return (
    <Link href={`/vote/${proposal.id}`} style={{ textDecoration: 'none' }}>
      <div className="glass-card proposal-card" id={`proposal-card-${proposal.id}`}>
        <div className="proposal-card-header">
          <h4>{proposal.title}</h4>
          <span className={`badge ${statusMap[proposal.status]}`}>
            {proposal.status}
          </span>
        </div>
        <p className="proposal-card-body">{proposal.description}</p>
        <div className="proposal-card-footer">
          <div className="proposal-meta">
            <span className="proposal-meta-item">
              🗳️ {proposal.totalVotes} votes
            </span>
            <span className="proposal-meta-item">
              👤 {shortenAddress(proposal.authority)}
            </span>
          </div>
          {proposal.status === 'active' ? (
            <CountdownTimer endTime={proposal.endTime} compact />
          ) : proposal.status === 'revealed' ? (
            <span
              style={{
                fontSize: '0.8rem',
                color: proposal.result ? 'var(--success)' : 'var(--error)',
                fontWeight: 600,
              }}
            >
              {proposal.result ? '✅ Passed' : '❌ Rejected'}
            </span>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Awaiting reveal
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
