'use client';

import { VOTE_STEPS, type VoteStatus } from '@/lib/types';

interface VoteStatusTrackerProps {
  currentStatus: VoteStatus;
}

export default function VoteStatusTracker({ currentStatus }: VoteStatusTrackerProps) {
  const statusOrder: VoteStatus[] = ['encrypting', 'submitting', 'computing', 'finalized'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="vote-tracker" id="vote-status-tracker">
      {VOTE_STEPS.map((step, index) => {
        let stepClass = '';
        if (index < currentIndex) stepClass = 'complete';
        else if (index === currentIndex) stepClass = 'active';

        return (
          <div key={step.id} className={`vote-step ${stepClass}`}>
            <div className="vote-step-icon">
              {stepClass === 'complete' ? '✓' : step.icon}
            </div>
            <div className="vote-step-content">
              <h5>{step.label}</h5>
              <p>{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
