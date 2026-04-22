'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletButton from './WalletButton';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/proposals', label: 'Proposals' },
    { href: '/how-it-works', label: 'How It Works' },
  ];

  return (
    <nav className="navbar" id="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <span className="brand-icon">🗳️</span>
          VeilVote
        </Link>

        <div className="navbar-links">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? 'active' : ''}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="navbar-actions">
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
