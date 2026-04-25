import Link from 'next/link';
import DeploymentBanner from '@/components/DeploymentBanner';

export default function Home() {
  return (
    <div className="page-content">
      <DeploymentBanner />
      {/* ============ HERO ============ */}
      <section className="hero container">
        <div className="hero-badge">
          <span>&gt;</span>
          [ ARCIUM MPC ] // ENCRYPTED GOVERNANCE
        </div>

        <h1>
          <span className="text-gradient">PRIVATE. VERIFIABLE.</span>
          <br />
          GOVERNANCE_
        </h1>

        <p className="hero-subtitle">
          $ cast encrypted votes on solana. no one sees how you voted --
          not even the nodes processing your vote. only final results
          are revealed onchain.
        </p>

        <div className="hero-actions">
          <Link href="/proposals" className="btn btn-primary btn-lg" id="cta-proposals">
            [ BROWSE PROPOSALS ]
          </Link>
          <Link href="/how-it-works" className="btn btn-secondary btn-lg" id="cta-how-it-works">
            [ HOW IT WORKS ] --help
          </Link>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="container" style={{ paddingTop: 'var(--space-3xl)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-md)',
            textAlign: 'center',
          }}
        >
          {[
            { value: '100%', label: 'VOTE_PRIVACY', prefix: '>' },
            { value: 'ZERO', label: 'KNOWLEDGE_LEAK', prefix: '>' },
            { value: 'ONCHAIN', label: 'VERIFIABLE', prefix: '>' },
            { value: 'SOLANA', label: 'SPEED_SCALE', prefix: '>' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card"
              style={{ padding: 'var(--space-lg)', cursor: 'default' }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                  textShadow: '0 0 12px rgba(51, 255, 0, 0.5)',
                  marginBottom: '4px',
                }}
              >
                {stat.prefix} {stat.value}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="features-section container">
        <div className="section-title">
          <h2>
            $ WHY <span className="text-gradient">VEILVOTE</span> --LIST
          </h2>
          <p>
            traditional DAO voting is public -- enabling vote-buying, coercion, and
            frontrunning. veilvote patches this vulnerability.
          </p>
        </div>

        <div className="features-grid stagger-children">
          {[
            {
              flag: '--privacy',
              title: 'PRIVACY_BY_DEFAULT',
              desc: 'your vote is encrypted on your device before submission. arcium\'s MPC network processes it without any node seeing the plaintext. vote-buying becomes impossible when votes can\'t be proven.',
            },
            {
              flag: '--verify',
              title: 'VERIFIABLE_RESULTS',
              desc: 'despite full privacy, results are cryptographically verifiable onchain. the MPC computation produces correctness proofs -- you can trust the tally without trusting any single party.',
            },
            {
              flag: '--resist',
              title: 'COERCION_RESISTANT',
              desc: 'since individual votes are never revealed -- not even the yes/no counts -- no one can coerce voters or prove how someone voted. true secret ballot democracy for DAOs.',
            },
            {
              flag: '--speed',
              title: 'BUILT_ON_SOLANA',
              desc: 'sub-second finality, negligible fees, and the most active developer ecosystem. veilvote leverages solana\'s speed with arcium\'s privacy layer.',
            },
            {
              flag: '--sybil',
              title: 'SYBIL_RESISTANT',
              desc: 'each wallet can only vote once per proposal, enforced by onchain PDAs. combined with encryption, this prevents both double-voting and vote-buying attacks.',
            },
            {
              flag: '--src',
              title: 'OPEN_SOURCE',
              desc: 'fully open source under MIT license. inspect the encrypted circuits, the solana program, and the frontend. trust is established through transparency.',
            },
          ].map((f) => (
            <div key={f.flag} className="glass-card feature-card">
              <div className="feature-icon" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-secondary)' }}>
                {f.flag}
              </div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS TEASER ============ */}
      <section className="container" style={{ padding: 'var(--space-4xl) 0' }}>
        <div
          className="glass-card"
          style={{
            padding: 'var(--space-3xl)',
            textAlign: 'center',
            borderColor: 'var(--accent-primary)',
          }}
        >
          <h2 style={{ marginBottom: 'var(--space-md)' }}>
            $ HOW DOES <span className="text-gradient">ENCRYPTED VOTING</span> WORK?
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto var(--space-xl)' }}>
            arcium uses Multi-Party Computation (MPC) -- a cryptographic technique where
            multiple nodes compute on secret-shared data. no single node ever sees your vote.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
              flexWrap: 'wrap',
              margin: 'var(--space-xl) 0',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
            }}
          >
            {['ENCRYPT', 'SUBMIT', 'COMPUTE', 'REVEAL'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span
                  style={{
                    padding: '6px 14px',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--accent-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  [{step}]
                </span>
                {i < 3 && (
                  <span style={{ color: 'var(--text-tertiary)' }}>&gt;</span>
                )}
              </div>
            ))}
          </div>

          <Link href="/how-it-works" className="btn btn-primary">
            [ LEARN MORE ] --verbose
          </Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer
        className="container"
        style={{
          textAlign: 'center',
          padding: 'var(--space-2xl) 0',
          borderTop: '1px dashed var(--glass-border)',
          color: 'var(--text-tertiary)',
          fontSize: '0.75rem',
        }}
      >
        <p>
          $ built with encryption for the{' '}
          <a href="https://skills.arcium.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-secondary)' }}>
            arcium_skills
          </a>{' '}
          bounty // private voting (DAO governance)
        </p>
        <p style={{ marginTop: 'var(--space-sm)' }}>
          veilvote (c) {new Date().getFullYear()} // MIT license //{' '}
          <a href="https://github.com/mrnetwork0001/VeilVote" target="_blank" rel="noopener noreferrer">
            github
          </a>
        </p>
      </footer>
    </div>
  );
}