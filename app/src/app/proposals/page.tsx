'use client';

import { useState } from 'react';
import ProposalCard from '@/components/ProposalCard';
import CreateProposalModal from '@/components/CreateProposalModal';
import { DEMO_PROPOSALS, type Proposal, type ProposalStatus } from '@/lib/types';
import { useWallet } from '@solana/wallet-adapter-react';

type FilterTab = 'all' | ProposalStatus;

export default function ProposalsPage() {
  const { connected } = useWallet();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showModal, setShowModal] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>(DEMO_PROPOSALS);

  const filteredProposals = proposals.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const handleCreateProposal = (data: {
    title: string;
    description: string;
    durationSeconds: number;
  }) => {
    const newProposal: Proposal = {
      id: proposals.length + 1,
      title: data.title,
      description: data.description,
      authority: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      endTime: Math.floor(Date.now() / 1000) + data.durationSeconds,
      totalVotes: 0,
      status: 'active',
      voteState: [],
      nonce: '0',
      pda: '',
    };
    setProposals([newProposal, ...proposals]);
  };

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
              Browse, vote, and track proposals. All votes are encrypted using Arcium MPC.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            disabled={!connected}
            id="create-proposal-button"
          >
            ➕ New Proposal
          </button>
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

        {filteredProposals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗳️</div>
            <h3>No proposals found</h3>
            <p>
              {filter === 'all'
                ? 'No proposals have been created yet. Be the first!'
                : `No ${filter} proposals at the moment.`}
            </p>
            {connected && filter === 'all' && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                Create First Proposal
              </button>
            )}
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
        onSubmit={handleCreateProposal}
      />
    </div>
  );
}
