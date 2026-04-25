'use client';

interface ResultsChartProps {
  result: boolean;
  totalVotes: number;
}

export default function ResultsChart({ result, totalVotes }: ResultsChartProps) {
  // Since reveal_result only returns a boolean (yes > no),
  // we show the verdict rather than exact counts.
  // This is by design - individual counts are never revealed.

  return (
    <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
      <h4 style={{ marginBottom: 'var(--space-xl)' }}>Final Result</h4>

      <div className="result-verdict">
        <div className={`result-verdict-icon ${result ? 'passed' : 'failed'}`}>
          {result ? '✅' : '❌'}
        </div>
        <h3 style={{ marginBottom: 'var(--space-sm)' }}>
          {result ? 'Proposal Passed' : 'Proposal Rejected'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {result
            ? 'The majority voted in favor of this proposal.'
            : 'The majority voted against this proposal.'}
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 'var(--space-2xl)',
        marginTop: 'var(--space-xl)',
        paddingTop: 'var(--space-xl)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}>
            {totalVotes}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Total Votes
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: result ? 'var(--success)' : 'var(--error)',
          }}>
            {result ? 'YES' : 'NO'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Outcome
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-accent)',
          }}>
            🔐
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Counts Hidden
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 'var(--space-xl)',
        padding: 'var(--space-md)',
        background: 'var(--accent-gradient-subtle)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        textAlign: 'center',
      }}>
        💡 Only the boolean result (pass/fail) is revealed. Individual vote counts remain encrypted - this prevents vote-buying and strategic voting.
      </div>
    </div>
  );
}