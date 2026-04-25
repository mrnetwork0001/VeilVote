'use client';

interface ResultsChartProps {
  result: boolean | undefined;
  revealed: boolean;
}

export default function ResultsChart({ result, revealed }: ResultsChartProps) {
  // VeilVote only reveals pass/fail, not individual counts.
  // This is by design -- individual counts are never revealed.

  if (!revealed) {
    const bar = '[||||||||||||||||||||..........]';
    return (
      <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
        <h4 style={{ marginBottom: 'var(--space-md)' }}>$ TALLY --STATUS</h4>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          // vote tally is encrypted. individual counts hidden until authority reveals.
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: 'var(--text-tertiary)',
          marginBottom: 'var(--space-sm)',
        }}>
          yes: [????????????????????????????????] ???
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: 'var(--text-tertiary)',
          marginBottom: 'var(--space-lg)',
        }}>
          no:  [????????????????????????????????] ???
        </div>
        <div style={{
          padding: 'var(--space-md)',
          border: '1px dashed var(--glass-border)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
        }}>
          // only the boolean result (pass/fail) is revealed. individual vote counts
          remain encrypted -- this prevents vote-buying and strategic voting.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{
      padding: 'var(--space-xl)',
      borderColor: result ? 'var(--success)' : 'var(--error)',
    }}>
      <h4 style={{ marginBottom: 'var(--space-md)' }}>$ TALLY --RESULT</h4>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.2rem',
        fontWeight: 800,
        color: result ? 'var(--success)' : 'var(--error)',
        textShadow: result
          ? '0 0 12px rgba(51, 255, 0, 0.5)'
          : '0 0 12px rgba(255, 51, 51, 0.5)',
        textAlign: 'center',
        padding: 'var(--space-lg)',
        marginBottom: 'var(--space-md)',
      }}>
        {result ? '> RESULT: PASSED [exit 0]' : '> RESULT: REJECTED [exit 1]'}
      </div>
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        textAlign: 'center',
      }}>
        // boolean result revealed by arcium MPC. exact vote counts remain encrypted.
      </div>
    </div>
  );
}