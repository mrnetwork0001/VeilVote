'use client';

import { useState, useEffect, useCallback } from 'react';
import ProposalCard from '@/components/ProposalCard';
import CreateProposalModal from '@/components/CreateProposalModal';
import { type Proposal, type ProposalStatus, PROGRAM_ID } from '@/lib/types';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { fetchAllPolls, type OnChainPoll } from '@/lib/veilvote-client';

type FilterTab = 'all' | ProposalStatus;

function pollToProposal(poll: OnChainPoll): Proposal {
  return {
    id: poll.id,
    title: poll.question,
    description: `On-chain proposal #${poll.id} | Authority: ${poll.authority.toBase58().slice(0, 8)}...`,
    authority: poll.authority.toBase58(),
    endTime: Math.floor(Date.now() / 1000) + 86400, // Display as active (no endtime in contract)
    totalVotes: 0,
    status: 'active',
    voteState: poll.voteState,
    nonce: poll.nonce.toString(),
    pda: poll.pda.toBase58(),
  };
}

export default function ProposalsPage() {
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showModal, setShowModal] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProposals = useCallback(async () => {
    if (!publicKey || !signTransaction) return;

    setLoading(true);
    setError(null);

    try {
      const anchorWallet = {
        publicKey,
        signTransaction: signTransaction.bind(null),
        signAllTransactions: signAllTransactions?.bind(null),
      } as anchor.Wallet;

      const polls = await fetchAllPolls(connection, anchorWallet);
      const mappedProposals = polls.map(pollToProposal);
      setProposals(mappedProposals);
    } catch (err: any) {
      console.error('Failed to fetch proposals:', err);
      setError(err?.message || 'Failed to fetch proposals from devnet');
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction, signAllTransactions, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      loadProposals();
    }
  }, [connected, publicKey, loadProposals]);

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
              {connected
                ? `${proposals.length} proposals found on devnet. All votes are encrypted using Arcium MPC.`
                : 'Connect your wallet to browse and create proposals on Solana devnet.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            {connected && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={loadProposals}
                disabled={loading}
              >
                🔄 Refresh
              </button>
            )}
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

        {!connected ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔗</div>
            <h3>Connect Your Wallet</h3>
            <p>Connect a Solana wallet (Phantom, Solflare) to view on-chain proposals and vote.</p>
          </div>
        ) : loading ? (
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
            <button className="btn btn-primary" onClick={loadProposals}>
              Retry
            </button>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗳️</div>
            <h3>No proposals found</h3>
            <p>
              {filter === 'all'
                ? 'No proposals on devnet yet. Be the first to create one!'
                : `No ${filter} proposals at the moment.`}
            </p>
            {filter === 'all' && (
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
        onCreated={loadProposals}
      />
    </div>
  );
}
