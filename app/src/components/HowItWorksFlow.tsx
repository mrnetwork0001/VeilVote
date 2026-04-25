'use client';

export default function HowItWorksFlow() {
  const steps = [
    {
      number: 1,
      icon: '🔗',
      title: 'Connect Your Wallet',
      description:
        'Connect your Solana wallet (Phantom, Solflare) to VeilVote. Your wallet generates a deterministic x25519 encryption keypair through a signed message - no extra keys to manage.',
    },
    {
      number: 2,
      icon: '🔐',
      title: 'Encrypt Your Vote Locally',
      description:
        'Your vote is encrypted right in your browser using RescueCipher with a shared secret derived from your x25519 key and the MXE public key. The plaintext vote NEVER leaves your device.',
    },
    {
      number: 3,
      icon: '📡',
      title: 'Submit to Solana',
      description:
        'The encrypted vote ciphertext is sent as a Solana transaction to the VeilVote program. The onchain program queues it for MPC computation - the encrypted bytes are visible, but they reveal nothing about your choice.',
    },
    {
      number: 4,
      icon: '⚙️',
      title: 'Multi-Party Computation (MPC)',
      description:
        'Arcium\'s distributed Arx nodes perform the vote tallying on secret-shared data. Each node holds a mathematical fragment - no single node ever sees your vote. The computation adds your vote to the encrypted running total.',
    },
    {
      number: 5,
      icon: '✅',
      title: 'Result Revealed Onchain',
      description:
        'After voting ends, the authority triggers a reveal. The MPC nodes compare the encrypted yes/no counts and publish only a boolean result (pass/fail). Even after reveal, individual votes and exact counts remain encrypted forever.',
    },
  ];

  return (
    <div className="how-steps stagger-children">
      {steps.map((step) => (
        <div key={step.number} className="how-step glass-card" style={{ padding: 'var(--space-xl)' }}>
          <div className="how-step-number">{step.icon}</div>
          <div className="how-step-content">
            <h3>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginRight: '8px' }}>
                Step {step.number}
              </span>
              {step.title}
            </h3>
            <p>{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}