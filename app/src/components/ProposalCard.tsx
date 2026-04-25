'use client';

import Link from 'next/link';
import type { Proposal } from '@/lib/types';
import { shortenAddress } from '@/lib/program';

interface ProposalCardProps {
  proposal: Proposal;
}

function timeAgo(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ProposalCard({ proposal }: ProposalCardProps) {
  const statusMap: Record<string, string> = {
    active: 'badge-active',
    ended: 'badge-ended',
    revealed: proposal.result ? 'badge-revealed' : 'badge-ended',
  };

  const statusLabel: Record<string, string> = {
    active: '[ACTIVE]',
    ended: '[ENDED]',
    revealed: proposal.result ? '[OK] PASSED' : '[ERR] REJECTED',
  };

  return (
    <Link href={`/vote/${proposal.id}`} style={{ textDecoration: 'none' }}>
      <div className="glass-card proposal-card" id={`proposal-card-${proposal.id}`}>
        <div className="proposal-card-header">
          <h4>&gt; {proposal.title}</h4>
          <span className={`badge ${statusMap[proposal.status]}`}>
            {statusLabel[proposal.status]}
          </span>
        </div>
        <p className="proposal-card-body">// onchain proposal #{proposal.id}</p>
        <div className="proposal-card-footer">
          <div className="proposal-meta">
            <span className="proposal-meta-item">
              --encrypted
            </span>
            <span className="proposal-meta-item">
              @{shortenAddress(proposal.authority)}
            </span>
          </div>
          {proposal.status === 'revealed' ? (
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: proposal.result ? 'var(--success)' : 'var(--error)',
              textShadow: proposal.result
                ? '0 0 8px rgba(51, 255, 0, 0.5)'
                : '0 0 8px rgba(255, 51, 51, 0.5)',
            }}>
              {proposal.result ? 'exit(0)' : 'exit(1)'}
            </span>
          ) : (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
              {proposal.createdAt > 0 ? timeAgo(proposal.createdAt) : '> active'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
