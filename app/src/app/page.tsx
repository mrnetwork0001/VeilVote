import Link from 'next/link';

export default function Home() {
  return (
    <div className="page-content">
      {/* Hero Section */}
      <section className="hero container">
        <div className="hero-badge">
          <span>🛡️</span>
          Powered by Arcium Multi-Party Computation
        </div>

        <h1>
          <span className="text-gradient">Private. Verifiable.</span>
          <br />
          Governance.
        </h1>

        <p className="hero-subtitle">
          Cast encrypted votes on Solana. No one sees how you voted — not even the
          nodes processing your vote. Only final results are revealed on-chain.
        </p>

        <div className="hero-actions">
          <Link href="/proposals" className="btn btn-primary btn-lg" id="cta-proposals">
            🗳️ Browse Proposals
          </Link>
          <Link href="/how-it-works" className="btn btn-secondary btn-lg" id="cta-how-it-works">
            Learn How It Works →
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container" style={{ paddingTop: 'var(--space-3xl)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-xl)',
            textAlign: 'center',
          }}
        >
          {[
            { value: '100%', label: 'Vote Privacy', icon: '🔐' },
            { value: 'Zero', label: 'Knowledge Leakage', icon: '🛡️' },
            { value: 'On-Chain', label: 'Verifiable Results', icon: '✅' },
            { value: 'Solana', label: 'Speed & Scale', icon: '⚡' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card"
              style={{ padding: 'var(--space-xl)', cursor: 'default' }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-sm)' }}>
                {stat.icon}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  background: 'var(--accent-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section container">
        <div className="section-title">
          <h2>
            Why <span className="text-gradient">VeilVote</span>?
          </h2>
          <p>
            Traditional DAO voting is public — enabling vote-buying, coercion, and
            frontrunning. VeilVote fixes this.
          </p>
        </div>

        <div className="features-grid stagger-children">
          <div className="glass-card feature-card">
            <div className="feature-icon">🔐</div>
            <h4>Privacy by Default</h4>
            <p>
              Your vote is encrypted on your device before submission. Arcium&apos;s MPC
              network processes it without any node seeing the plaintext. Vote-buying
              becomes impossible when votes can&apos;t be proven.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">✅</div>
            <h4>Verifiable Results</h4>
            <p>
              Despite full privacy, results are cryptographically verifiable on-chain.
              The MPC computation produces correctness proofs — you can trust the
              tally without trusting any single party.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">🛡️</div>
            <h4>Coercion Resistant</h4>
            <p>
              Since individual votes are never revealed — not even the yes/no counts —
              no one can coerce voters or prove how someone voted. True secret ballot
              democracy for DAOs.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">⚡</div>
            <h4>Built on Solana</h4>
            <p>
              Sub-second finality, negligible fees, and the most active developer
              ecosystem. VeilVote leverages Solana&apos;s speed with Arcium&apos;s privacy
              layer for best-in-class governance.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">🔄</div>
            <h4>Sybil Resistant</h4>
            <p>
              Each wallet can only vote once per proposal, enforced by on-chain PDAs.
              Combined with encryption, this prevents both double-voting and
              vote-buying attacks.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">🌐</div>
            <h4>Open Source</h4>
            <p>
              Fully open source under MIT license. Inspect the encrypted circuits,
              the Solana program, and the frontend. Trust is established through
              transparency, not authority.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Teaser */}
      <section className="container" style={{ padding: 'var(--space-4xl) 0' }}>
        <div
          className="glass-card"
          style={{
            padding: 'var(--space-3xl)',
            textAlign: 'center',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.06) 0%, rgba(79, 70, 229, 0.03) 100%)',
          }}
        >
          <h2 style={{ marginBottom: 'var(--space-md)' }}>
            How Does <span className="text-gradient">Encrypted Voting</span> Work?
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto var(--space-xl)' }}>
            Arcium uses Multi-Party Computation (MPC) — a cryptographic technique where
            multiple nodes compute on secret-shared data. No single node ever sees your vote.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'var(--space-xl)',
              flexWrap: 'wrap',
              margin: 'var(--space-xl) 0',
            }}
          >
            {['🔐 Encrypt', '📡 Submit', '⚙️ Compute', '✅ Reveal'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(124, 58, 237, 0.12)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {step}
                </span>
                {i < 3 && (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '1.2rem' }}>→</span>
                )}
              </div>
            ))}
          </div>

          <Link href="/how-it-works" className="btn btn-primary">
            Learn More →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="container"
        style={{
          textAlign: 'center',
          padding: 'var(--space-2xl) 0',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          color: 'var(--text-tertiary)',
          fontSize: '0.85rem',
        }}
      >
        <p>
          Built with 🔐 for the{' '}
          <a
            href="https://skills.arcium.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-accent)' }}
          >
            Arcium Skills
          </a>{' '}
          bounty program — Private Voting (DAO Governance)
        </p>
        <p style={{ marginTop: 'var(--space-sm)' }}>
          VeilVote © {new Date().getFullYear()} · MIT License ·{' '}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
