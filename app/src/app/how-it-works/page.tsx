import HowItWorksFlow from '@/components/HowItWorksFlow';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="page-content">
      <div className="container">
        {/* Header */}
        <div className="section-title animate-fade-in" style={{ marginBottom: 'var(--space-3xl)' }}>
          <div className="hero-badge" style={{ marginBottom: 'var(--space-lg)' }}>
            <span>🔬</span>
            Technical Deep Dive
          </div>
          <h1>
            How <span className="text-gradient">VeilVote</span> Works
          </h1>
          <p style={{ maxWidth: '650px', margin: 'var(--space-md) auto 0' }}>
            VeilVote uses Arcium&apos;s Multi-Party Computation (MPC) to keep your vote
            encrypted during the entire tallying process. Here&apos;s how it works, step by step.
          </p>
        </div>

        {/* Step-by-step flow */}
        <HowItWorksFlow />

        {/* Why MPC? Section */}
        <div style={{ marginTop: 'var(--space-4xl)' }}>
          <div className="section-title">
            <h2>Why Multi-Party Computation?</h2>
            <p>
              Comparing MPC to other privacy approaches for DAO voting.
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Feature</th>
                  <th style={thStyle}>
                    <span className="text-gradient" style={{ fontWeight: 700 }}>MPC (Arcium)</span>
                  </th>
                  <th style={thStyle}>FHE</th>
                  <th style={thStyle}>ZK Proofs</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Vote Privacy</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Full</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Full</td>
                  <td style={{ ...tdStyle, color: 'var(--warning)' }}>⚠️ Partial</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Computation Speed</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Fast</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>❌ Slow</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Fast</td>
                </tr>
                <tr>
                  <td style={tdStyle}>No Trusted Setup</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Yes</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Yes</td>
                  <td style={{ ...tdStyle, color: 'var(--warning)' }}>⚠️ Depends</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Encrypted Tallying</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Native</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Native</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>❌ No</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Solana Native</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Arcium</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>❌ No</td>
                  <td style={{ ...tdStyle, color: 'var(--warning)' }}>⚠️ Limited</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Multi-Party Input</td>
                  <td style={{ ...tdStyle, color: 'var(--success)' }}>✅ Native</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>❌ Single-Key</td>
                  <td style={{ ...tdStyle, color: 'var(--error)' }}>❌ Prover Only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Arcium Architecture */}
        <div style={{ marginTop: 'var(--space-4xl)' }}>
          <div className="section-title">
            <h2>The Three Layers</h2>
            <p>
              Every VeilVote operation flows through three coupled surfaces.
            </p>
          </div>

          <div className="features-grid stagger-children">
            <div className="glass-card feature-card">
              <div className="feature-icon">⚡</div>
              <h4>Arcis Circuit</h4>
              <p>
                Rust code that runs inside Arcium&apos;s MPC network on encrypted data.
                Defines the vote tallying logic - adding votes, comparing counts.
                All arithmetic happens on secret-shared data.
              </p>
              <code
                style={{
                  display: 'block',
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-accent)',
                }}
              >
                encrypted-ixs/src/lib.rs
              </code>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon">🔗</div>
              <h4>Solana Program</h4>
              <p>
                Anchor program that manages proposals, queues MPC computations,
                stores encrypted state onchain, and handles callbacks from the
                Arx node network.
              </p>
              <code
                style={{
                  display: 'block',
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-accent)',
                }}
              >
                programs/veilvote/src/lib.rs
              </code>
            </div>

            <div className="glass-card feature-card">
              <div className="feature-icon">💻</div>
              <h4>Client (This App)</h4>
              <p>
                Performs x25519 key exchange with MXE, encrypts votes using
                RescueCipher, submits transactions, and decrypts results. Your
                vote is encrypted before it ever touches the network.
              </p>
              <code
                style={{
                  display: 'block',
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--text-accent)',
                }}
              >
                app/src/lib/arcium.ts
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
            border: '1px solid rgba(124, 58, 237, 0.2)',
          }}
        >
          <h2 style={{ marginBottom: 'var(--space-md)' }}>
            Ready to Vote <span className="text-gradient">Privately</span>?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', maxWidth: '500px', margin: '0 auto var(--space-xl)' }}>
            Connect your wallet and cast your first encrypted vote.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
            <Link href="/proposals" className="btn btn-primary btn-lg">
              🗳️ Browse Proposals
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-lg"
            >
              ⭐ GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Table styling helpers
const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--text-secondary)',
  fontWeight: 600,
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  color: 'var(--text-primary)',
};