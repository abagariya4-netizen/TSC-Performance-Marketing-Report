'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TokenInput() {
  const [token, setToken] = useState('');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    // Read existing meta_token from cookie
    const cookies = document.cookie.split('; ');
    const metaCookie = cookies.find(row => row.startsWith('meta_token='));
    if (metaCookie) {
      setToken(metaCookie.split('=')[1]);
    }
  }, []);

  const handleUpdate = () => {
    if (token.trim()) {
      // Set for 30 days
      document.cookie = `meta_token=${token.trim()}; path=/; max-age=2592000; samesite=strict`;
    } else {
      // Clear cookie
      document.cookie = `meta_token=; path=/; max-age=0; samesite=strict`;
    }
    router.refresh();
  };

  if (!isClient) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <label style={{ color: '#a0aec0', fontSize: '14px', fontWeight: 500 }}>
        Token:
      </label>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="••••••••••••••••••••"
        style={{
          background: '#0f1117',
          border: '1px solid #4a5568',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          width: '240px',
          outline: 'none'
        }}
      />
      <button
        onClick={handleUpdate}
        style={{
          background: '#3182ce',
          color: 'white',
          border: 'none',
          padding: '7px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#2b6cb0'}
        onMouseOut={(e) => e.currentTarget.style.background = '#3182ce'}
      >
        Update
      </button>
    </div>
  );
}
