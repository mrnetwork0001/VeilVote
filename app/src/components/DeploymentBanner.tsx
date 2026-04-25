'use client';

export default function DeploymentBanner() {
  return (
    <div className="deployment-banner">
      <span>[ LIVE ] deployed on solana devnet // program: </span>
      <a
        href="https://explorer.solana.com/address/B9xuJHLGqgb2szy76qBUiXrAFpYgx4g7aUZrEDimsRFk?cluster=devnet"
        target="_blank"
        rel="noopener noreferrer"
      >
        B9xu...RFk
      </a>
      <span> // cluster_offset: 456</span>
    </div>
  );
}
