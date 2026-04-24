'use client';

import { useState, useEffect, useCallback } from 'react';
import ProposalCard from '@/components/ProposalCard';
import CreateProposalModal from '@/components/CreateProposalModal';
import { type Proposal, type ProposalStatus } from '@/lib/types';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { fetchAllPolls, type OnChainPoll } from '@/lib/veilvote-client';

type FilterTab = 'all' | ProposalStatus;

function pollToProposal(poll: OnChainPoll): Proposal {
  const createdAt = poll.createdAt || Math.floor(Date.now() / 1000);
  const status = poll.revealed ? 'revealed' : 'active';

  return {
    id: poll.id,
    title: poll.question,
    description: `On-chain proposal #${poll.id}`,
    authority: poll.authority,
    createdAt,
    status,
    result: poll.result,
    voteState: poll.voteState,
    nonce: poll.nonce,
    pda: poll.pda,
  };
}


export default function ProposalsPage() {
  const { connected } = useWallet();
  const { connection } = useConnection();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showModal, setShowModal] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[ProposalsPage] Fetching proposals from API...');
      const polls = await fetchAllPolls(connection);
      console.log('[ProposalsPage] Got polls:', polls.length, polls);
      const mappedProposals = polls.map(pollToProposal);
      setProposals(mappedProposals);
    } catch (err: any) {
      console.error('[ProposalsPage] Failed to fetch proposals:', err);
      setError(err?.message || 'Failed to fetch proposals from devnet');
    } finally {
      setLoading(false);
    }
  }, [connection]);

  // Load proposals on mount — no wallet required for reading
  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const filteredProposals = proposals.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const tabs: { label: string; value: FilterTab }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Ended', value: 'ended' },
    { label: 'Revealed', value: 'revealed' },
  ];

  return (
    <div className="page-content">
      <div className="container">
        <div className="proposals-header animate-fade-in">
          <div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: 'var(--space-sm)' }}>
              Governance Proposals
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {proposals.length > 0
                ? `${proposals.length} proposals on Solana devnet. All votes encrypted via Arcium MPC.`
                : 'Loading proposals from Solana devnet...'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={loadProposals} disabled={loading}>
              🔄 Refresh
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              disabled={!connected}
              id="create-proposal-button"
            >
              ➕ New Proposal
            </button>
          </div>
        </div>

        <div className="filter-tabs" style={{ marginBottom: 'var(--space-xl)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={`filter-tab ${filter === tab.value ? 'active' : ''}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
              {tab.value !== 'all' && (
                <span style={{ marginLeft: '6px', opacity: 0.7 }}>
                  ({proposals.filter((p) => p.status === tab.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ animation: 'pulse-dot 1.5s infinite' }}>⏳</div>
            <h3>Loading from Devnet...</h3>
            <p>Fetching proposals from Solana devnet...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h3>Error Loading Proposals</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{error}</p>
            <button className="btn btn-primary" onClick={loadProposals}>Retry</button>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗳️</div>
            <h3>No proposals found</h3>
            <p>
              {filter === 'all'
                ? 'No proposals on devnet yet. Connect wallet & create the first one!'
                : `No ${filter} proposals at the moment.`}
            </p>
          </div>
        ) : (
          <div className="proposals-grid stagger-children">
            {filteredProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </div>

      <CreateProposalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={loadProposals}
      />
    </div>
  );
}
