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

  // Close dropdown on outside click
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
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
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
            <span style={{ fontSize: '0.9rem' }}>🟢</span>
            <span className="wallet-address">{shortenedAddress}</span>
          </>
        ) : (
          <>
            <span>🔗</span>
            Connect Wallet
          </>
        )}
      </button>

      {showDropdown && connected && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem',
            minWidth: '180px',
            zIndex: 200,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <button
            className="btn-ghost"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.6rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              background: 'transparent',
            }}
            onClick={() => {
              navigator.clipboard.writeText(publicKey?.toBase58() || '');
              setShowDropdown(false);
            }}
          >
            📋 Copy Address
          </button>
          <button
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.6rem 0.8rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              color: 'var(--error)',
              background: 'transparent',
            }}
            onClick={() => {
              disconnect();
              setShowDropdown(false);
            }}
          >
            ⏏️ Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
