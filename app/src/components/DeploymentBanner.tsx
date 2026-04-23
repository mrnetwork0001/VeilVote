'use client';

import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/lib/types';

interface ProgramInfo {
  executable: boolean;
  lamports: number;
  owner: string;
}

export default function DeploymentBanner() {
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgramInfo = async () => {
      try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const info = await connection.getAccountInfo(new PublicKey(PROGRAM_ID));
        if (info) {
          setProgramInfo({
            executable: info.executable,
            lamports: info.lamports,
            owner: info.owner.toBase58(),
          });
        }
      } catch (e) {
        console.error('Failed to fetch program info:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProgramInfo();
  }, []);

  return (
    <div className="deployment-banner">
      <div className="deployment-banner-inner">
        <div className="deployment-status">
          <span className={`deployment-dot ${programInfo?.executable ? 'live' : 'offline'}`} />
          <span className="deployment-label">
            {loading ? 'Checking...' : programInfo?.executable ? 'Live on Solana Devnet' : 'Offline'}
          </span>
        </div>

        <div className="deployment-details">
          <div className="deployment-item">
            <span className="deployment-item-label">Program</span>
            <a
              href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="deployment-item-value link"
            >
              {PROGRAM_ID.slice(0, 8)}...{PROGRAM_ID.slice(-6)}
            </a>
          </div>
          <div className="deployment-item">
            <span className="deployment-item-label">Network</span>
            <span className="deployment-item-value">Devnet</span>
          </div>
          <div className="deployment-item">
            <span className="deployment-item-label">MPC</span>
            <span className="deployment-item-value">Arcium Cluster #456</span>
          </div>
        </div>

        <a
          href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="deployment-explorer-link"
        >
          View on Explorer ↗
        </a>
      </div>
    </div>
  );
}
