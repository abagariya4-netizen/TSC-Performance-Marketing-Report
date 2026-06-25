'use client';

import React, { useState, useEffect } from 'react';

export default function GoogleAdsGate({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem('google_ads_unlocked') === 'true') {
      setIsUnlocked(true);
    }
    setIsChecking(false);
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'TSC@Google2026') {
      sessionStorage.setItem('google_ads_unlocked', 'true');
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (isChecking) {
    return <div style={{ backgroundColor: '#0A0E17', minHeight: '100vh' }}></div>;
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div style={{ backgroundColor: '#0A0E17', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ backgroundColor: '#131A2A', border: '1px solid #232E47', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' }}>TSC Performance Report</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Google Ads reports are currently restricted</p>
        
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="password" 
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', background: '#1f2333', border: '1px solid #2d3348', borderRadius: '8px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
          {error && <div style={{ color: '#fc8181', fontSize: '14px', textAlign: 'left' }}>{error}</div>}
          <button 
            type="submit"
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(90deg, #e8733a, #e25822)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Access Report
          </button>
        </form>
      </div>
    </div>
  );
}
