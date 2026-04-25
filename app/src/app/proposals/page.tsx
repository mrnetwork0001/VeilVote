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
    description: `onchain proposal #${poll.id}`,
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

  // Load proposals on mount -- no wallet required for reading
  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const filteredProposals = proposals.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const tabs: { label: string; value: FilterTab }[] = [
    { label: '--all', value: 'all' },
    { label: '--active', value: 'active' },
    { label: '--ended', value: 'ended' },
    { label: '--revealed', value: 'revealed' },
  ];

  return (
    <div className="page-content">
      <div className="container">
        <div className="proposals-header animate-fade-in">
          <div>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: 'var(--space-sm)' }}>
              $ LS /PROPOSALS
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {proposals.length > 0
                ? `// ${proposals.length} proposals found on solana devnet. all votes encrypted via arcium MPC.`
                : '// fetching proposals from solana devnet...'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={loadProposals} disabled={loading}>
              [ REFRESH ]
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              disabled={!connected}
              id="create-proposal-button"
            >
              [ NEW PROPOSAL ]
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
            <div className="empty-state-icon animate-blink" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem' }}>&#9608;</div>
            <h3>$ LOADING FROM DEVNET...</h3>
            <p>fetching proposals from solana devnet...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: 'var(--error)' }}>[ERR]</div>
            <h3>ERROR LOADING PROPOSALS</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{error}</p>
            <button className="btn btn-primary" onClick={loadProposals}>[ RETRY ]</button>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&gt;_</div>
            <h3>NO PROPOSALS FOUND</h3>
            <p>
              {filter === 'all'
                ? '// no proposals on devnet yet. connect wallet & create the first one.'
                : `// no ${filter} proposals at the moment.`}
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