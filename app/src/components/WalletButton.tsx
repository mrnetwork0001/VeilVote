'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useState, useRef, useEffect } from 'react';

export default function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(() => {
    if (connected) {
      setShowDropdown(!showDropdown);
    } else {
      setVisible(true);
    }
  }, [connected, showDropdown, setVisible]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const shortenedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}..${publicKey.toBase58().slice(-4)}`
    : '';

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        className={`wallet-btn ${connected ? 'connected' : ''}`}
        onClick={handleClick}
        id="wallet-connect-button"
      >
        {connected ? (
          <>
            <span style={{ color: 'var(--accent-primary)' }}>&#9608;</span>
            <span className="wallet-address">{shortenedAddress}</span>
          </>
        ) : (
          <>[ CONNECT ]</>
        )}
      </button>

      {showDropdown && connected && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            background: 'var(--bg-primary)',
            border: '1px solid var(--accent-primary)',
            padding: '4px',
            minWidth: '200px',
            zIndex: 200,
            boxShadow: '0 0 15px rgba(51, 255, 0, 0.15)',
          }}
        >
          <button
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              background: 'transparent',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(51, 255, 0, 0.08)';
              e.currentTarget.style.color = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            onClick={() => {
              navigator.clipboard.writeText(publicKey?.toBase58() || '');
              setShowDropdown(false);
            }}
          >
            $ copy --address
          </button>
          <button
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              color: 'var(--error)',
              background: 'transparent',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 51, 51, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={() => {
              disconnect();
              setShowDropdown(false);
            }}
          >
            $ disconnect --force
          </button>
        </div>
      )}
    </div>
  );
}
