'use client';

const steps = [
  {
    step: 'STEP_01',
    title: 'CONNECT_WALLET',
    description:
      'connect your solana wallet (phantom, solflare) to veilvote. your wallet generates a deterministic x25519 encryption keypair through a signed message -- no extra keys to manage.',
  },
  {
    step: 'STEP_02',
    title: 'ENCRYPT_VOTE',
    description:
      'your yes/no choice is encrypted locally using x25519 key exchange with the MXE public key, then wrapped in RescueCipher. the plaintext NEVER leaves your device.',
  },
  {
    step: 'STEP_03',
    title: 'SUBMIT_TO_CHAIN',
    description:
      'the encrypted vote ciphertext is sent as a solana transaction to the veilvote program. the onchain program queues it for MPC computation -- the encrypted bytes are visible, but they reveal nothing about your choice.',
  },
  {
    step: 'STEP_04',
    title: 'MPC_COMPUTATION',
    description:
      "arcium's distributed arx nodes perform the vote tallying on secret-shared data. each node holds a mathematical fragment -- no single node ever sees your vote. the computation adds your vote to the encrypted running total.",
  },
  {
    step: 'STEP_05',
    title: 'RESULT_REVEALED',
    description:
      'when the proposal authority triggers reveal, the MPC network compares encrypted yes vs no counts and publishes only a boolean result (pass/fail). exact vote counts remain encrypted forever.',
  },
];

export default function HowItWorksFlow() {
  return (
    <div className="how-it-works-flow">
      {steps.map((s) => (
        <div key={s.step} className="flow-step" data-step={s.step}>
          <h4>{s.title}</h4>
          <p>{s.description}</p>
        </div>
      ))}
    </div>
  );
}