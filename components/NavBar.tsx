'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const navItems = [
    { label: 'Region Level Spends (Meta)', href: '/meta' },
    { label: '6 City (Meta)',              href: '/meta?tab=6city' },
    { label: 'LC to LP',                   href: '/meta/lc-to-lp' },
    { label: 'CPM',                        href: '/meta/cpm' },
    { label: 'Placements (Meta)',          href: '/meta/placements' },
    { label: 'City Level Spends (Google)', href: '/google/city-spends' },
    { label: '6 City (Google)',            href: '/google/6city-spends' },
  ];

  const getIsActive = (href: string) => {
    if (href === '/meta?tab=6city') return pathname === '/meta' && tab === '6city';
    if (href === '/meta') return pathname === '/meta' && tab !== '6city';
    return pathname === href;
  };

  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', alignItems: 'center', borderBottom: '1px solid #2d3748', paddingBottom: '16px' }}>
      {navItems.map((item) => {
        const isActive = getIsActive(item.href);
        return (
          <Link key={item.label} href={item.href} style={{ 
            padding: '8px 20px', 
            borderRadius: '8px 8px 0 0', 
            textDecoration: 'none',
            background: isActive ? '#e8733a' : 'transparent',
            color: isActive ? 'white' : '#a0aec0', 
            fontWeight: 600,
            borderBottom: isActive ? '3px solid white' : '3px solid transparent'
          }}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
