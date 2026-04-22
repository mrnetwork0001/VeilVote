'use client';

import { useEffect, useState } from 'react';
import { getTimeRemaining } from '@/lib/program';

interface CountdownTimerProps {
  endTime: number;
  compact?: boolean;
}

export default function CountdownTimer({ endTime, compact = false }: CountdownTimerProps) {
  const [time, setTime] = useState(getTimeRemaining(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (time.expired) {
    return <span style={{ color: 'var(--warning)', fontSize: compact ? '0.8rem' : '0.9rem' }}>Voting ended</span>;
  }

  if (compact) {
    if (time.days > 0) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{time.days}d {time.hours}h left</span>;
    if (time.hours > 0) return <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{time.hours}h {time.minutes}m left</span>;
    return <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>{time.minutes}m {time.seconds}s left</span>;
  }

  return (
    <div className="countdown">
      {time.days > 0 && (
        <>
          <div className="countdown-segment">
            <span className="countdown-value">{String(time.days).padStart(2, '0')}</span>
            <span className="countdown-label">Days</span>
          </div>
          <span className="countdown-separator">:</span>
        </>
      )}
      <div className="countdown-segment">
        <span className="countdown-value">{String(time.hours).padStart(2, '0')}</span>
        <span className="countdown-label">Hours</span>
      </div>
      <span className="countdown-separator">:</span>
      <div className="countdown-segment">
        <span className="countdown-value">{String(time.minutes).padStart(2, '0')}</span>
        <span className="countdown-label">Mins</span>
      </div>
      <span className="countdown-separator">:</span>
      <div className="countdown-segment">
        <span className="countdown-value">{String(time.seconds).padStart(2, '0')}</span>
        <span className="countdown-label">Secs</span>
      </div>
    </div>
  );
}
