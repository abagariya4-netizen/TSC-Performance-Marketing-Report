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
    { label: '6 City Filtered (Meta)',     href: '/six-city-meta-filtered' },
    { label: 'LC to LP',                   href: '/meta/lc-to-lp' },
    { label: 'CPM',                        href: '/meta/cpm' },
    { label: 'Placements (Meta)',          href: '/meta/placements' },
    { label: 'Funnel Level Performance (Meta)', href: '/funnel-level-performance' },
    { label: 'Walkin Dashboard (Meta)',    href: '/walkin-dashboard' },
    { label: 'Region Level Spends - Mattress (Meta)', href: '/region-spends-mattress' },
    { label: 'Region Level Spends - Growth & Boost (Meta)', href: '/region-spends-growth-boost' },
    { label: 'City Level Spends (Google)', href: '/google/city-spends' },
    { label: '6 City (Google)',            href: '/google/6city-spends' },
    { label: '6 City Filtered (Google)',   href: '/six-city-google-filtered' },
    { label: 'Product Spends (Google)',    href: '/google/product-spends' },
    { label: 'Campaign Type (Google)',     href: '/google-campaign-performance' },
    { label: 'Brand Impression MoM (Google)', href: '/brand-impression' },
    { label: 'Auction Insights (Google)',  href: '/auction-insights' },
    { label: 'SQR (Google)',               href: '/sqr' },
  ];

  const getIsActive = (href: string) => {
    if (href === '/meta?tab=6city') return pathname === '/meta' && tab === '6city';
    if (href === '/meta') return pathname === '/meta' && tab !== '6city';
    return pathname === href;
  };

  return (
    <div style={{ display: 'flex', gap: '8px', paddingBottom: '0', flexWrap: 'wrap' }}>
      {navItems.map((item) => {
        const isActive = getIsActive(item.href);
        return (
          <Link key={item.label} href={item.href} style={{ 
            padding: '8px 16px', 
            borderRadius: '999px', 
            textDecoration: 'none',
            background: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
            color: isActive ? '#ffffff' : 'var(--text-secondary)', 
            fontWeight: isActive ? 600 : 500,
            fontSize: '14px',
            border: isActive ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s ease',
            boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
          }}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
