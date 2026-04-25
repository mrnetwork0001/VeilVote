'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import WalletButton from './WalletButton';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: '/home' },
    { href: '/proposals', label: '/proposals' },
    { href: '/how-it-works', label: '/docs' },
  ];

  return (
    <nav className="navbar" id="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <Image src="/logo.png" alt="VeilVote Logo" width={20} height={20} style={{ objectFit: 'contain' }} />
          VEILVOTE_
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
