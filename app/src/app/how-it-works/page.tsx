import HowItWorksFlow from '@/components/HowItWorksFlow';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="page-content">
      <div className="container">
        {/* Header */}
        <div className="section-title animate-fade-in" style={{ marginBottom: 'var(--space-3xl)' }}>
          <div className="hero-badge" style={{ marginBottom: 'var(--space-lg)' }}>
            <span>&gt;</span>
            TECHNICAL DEEP DIVE
          </div>
          <h1>
            $ MAN <span className="text-gradient">VEILVOTE</span>
          </h1>
          <p style={{ maxWidth: '650px', margin: 'var(--space-md) auto 0' }}>
            veilvote uses arcium&apos;s Multi-Party Computation (MPC) to keep your vote
            encrypted during the entire tallying process. here&apos;s the full pipeline.
          </p>
        </div>

        {/* Step-by-step flow */}
        <HowItWorksFlow />

        {/* Why MPC? Section */}
        <div style={{ marginTop: 'var(--space-4xl)' }}>
          <div className="section-title">
            <h2>$ DIFF --COMPARE PRIVACY_TECH</h2>
            <p>
              // comparing MPC to other privacy approaches for DAO voting.
            </p>
          </div>

          <div
            className="glass-card"
            style={{
              padding: 'var(--space-xl)',
              maxWidth: '900px',
              margin: '0 auto',
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>FEATURE</th>
                  <th style={thStyle}>
                    <span className="text-gradient" style={{ fontWeight: 700 }}>MPC (ARCIUM)</span>
                  </th>
                  <th style={thStyle}>FHE</th>
                  <th style={thStyle}>ZK PROOFS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>vote_privacy</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] full</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] full</td>
                  <td style={{ ...tdStyle, color: 'var(--warning)' }}>[..] partial</td>
                </tr>
                <tr>
                  <td style={tdStyle}>compute_speed</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] fast</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>[ERR] slow</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] fast</td>
                </tr>
                <tr>
                  <td style={tdStyle}>trusted_setup</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] none</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] none</td>
                  <td style={{ ...tdStyle, color: 'var(--warning)' }}>[..] depends</td>
                </tr>
                <tr>
                  <td style={tdStyle}>encrypted_tally</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] native</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] native</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>[ERR] no</td>
                </tr>
                <tr>
                  <td style={tdStyle}>solana_native</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] arcium</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>[ERR] no</td>
                  <td style={{ ...tdStyle, color: 'var(--warning)' }}>[..] limited</td>
                </tr>
                <tr>
                  <td style={tdStyle}>multi_party_input</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>[OK] native</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>[ERR] single-key</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>[ERR] prover only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Three Layers */}
        <div style={{ marginTop: 'var(--space-4xl)' }}>
          <div className="section-title">
            <h2>$ CAT /ARCHITECTURE</h2>
            <p>
              // every veilvote operation flows through three coupled surfaces.
            </p>
          </div>

          <div className="features-grid stagger-children">
            <div className="glass-card feature-card">
              <div className="feature-icon" style={{ color: 'var(--accent-secondary)' }}>01//</div>
              <h4>ARCIS_CIRCUIT</h4>
              <p>
                rust code that runs inside arcium&apos;s MPC network on encrypted data.
                defines the vote tallying logic -- adding votes, comparing counts.
                all arithmetic on secret-shared data.
              </p>
              <code
                style={{
                  display: 'block',
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'rgba(51, 255, 0, 0.04)',
                  border: '1px dashed var(--glass-border)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-secondary)',
                }}
              >
                $ cat encrypted-ixs/src/lib.rs
              </code>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon" style={{ color: 'var(--accent-secondary)' }}>02//</div>
              <h4>SOLANA_PROGRAM</h4>
              <p>
                anchor program that manages proposals, queues MPC computations,
                stores encrypted state onchain, and handles callbacks from the
                arx node network.
              </p>
              <code
                style={{
                  display: 'block',
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'rgba(51, 255, 0, 0.04)',
                  border: '1px dashed var(--glass-border)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-secondary)',
                }}
              >
                $ cat programs/veilvote/src/lib.rs
              </code>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon" style={{ color: 'var(--accent-secondary)' }}>03//</div>
              <h4>CLIENT_APP</h4>
              <p>
                performs x25519 key exchange with MXE, encrypts votes using
                RescueCipher, submits transactions, and decrypts results. your
                vote is encrypted before it ever touches the network.
              </p>
              <code
                style={{
                  display: 'block',
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'rgba(51, 255, 0, 0.04)',
                  border: '1px dashed var(--glass-border)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-secondary)',
                }}
              >
                $ cat app/src/lib/arcium.ts
              </code>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div
          className="glass-card"
          style={{
            marginTop: 'var(--space-4xl)',
            padding: 'var(--space-3xl)',
            textAlign: 'center',
            borderColor: 'var(--accent-primary)',
          }}
        >
          <h2 style={{ marginBottom: 'var(--space-md)' }}>
            $ READY TO VOTE <span className="text-gradient">PRIVATELY</span>?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', maxWidth: '500px', margin: '0 auto var(--space-xl)' }}>
            // connect your wallet and cast your first encrypted vote.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/proposals" className="btn btn-primary btn-lg">
              [ BROWSE PROPOSALS ]
            </Link>
            <a
              href="https://github.com/mrnetwork0001/VeilVote"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-lg"
            >
              [ GITHUB ]
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Table styling helpers
const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  borderBottom: '1px solid var(--glass-border)',
  color: 'var(--accent-primary)',
  fontWeight: 700,
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontFamily: 'var(--font-mono)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px dashed var(--glass-border)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',
};