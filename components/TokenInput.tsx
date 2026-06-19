'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TokenInput() {
  const [metaToken, setMetaToken] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    // Read existing tokens from cookies
    const cookies = document.cookie.split('; ');
    const metaCookie = cookies.find(row => row.startsWith('meta_token='));
    if (metaCookie) {
      setMetaToken(metaCookie.split('=')[1]);
    }
    const googleCookie = cookies.find(row => row.startsWith('google_refresh_token='));
    if (googleCookie) {
      setGoogleToken(googleCookie.split('=')[1]);
    }
  }, []);

  const handleUpdateMeta = () => {
    if (metaToken.trim()) {
      document.cookie = `meta_token=${metaToken.trim()}; path=/; max-age=2592000; samesite=strict`;
    } else {
      document.cookie = `meta_token=; path=/; max-age=0; samesite=strict`;
    }
    router.refresh();
  };

  const handleUpdateGoogle = () => {
    if (googleToken.trim()) {
      document.cookie = `google_refresh_token=${googleToken.trim()}; path=/; max-age=2592000; samesite=strict`;
    } else {
      document.cookie = `google_refresh_token=; path=/; max-age=0; samesite=strict`;
    }
    router.refresh();
  };

  if (!isClient) return null;

  const btnStyle = {
    background: '#3182ce',
    color: 'white',
    border: 'none',
    padding: '7px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s'
  };

  const inputStyle = {
    background: '#0f1117',
    border: '1px solid #4a5568',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    width: '200px',
    outline: 'none'
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
      {/* Meta Token */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ color: '#a0aec0', fontSize: '14px', fontWeight: 500 }}>
          Meta Token:
        </label>
        <input
          type="password"
          value={metaToken}
          onChange={(e) => setMetaToken(e.target.value)}
          placeholder="••••••••••••••••••••"
          style={inputStyle}
        />
        <button
          onClick={handleUpdateMeta}
          style={btnStyle}
          onMouseOver={(e) => e.currentTarget.style.background = '#2b6cb0'}
          onMouseOut={(e) => e.currentTarget.style.background = '#3182ce'}
        >
          Update
        </button>
      </div>

      {/* Google Token */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ color: '#a0aec0', fontSize: '14px', fontWeight: 500 }}>
          Google Token:
        </label>
        <input
          type="password"
          value={googleToken}
          onChange={(e) => setGoogleToken(e.target.value)}
          placeholder="Refresh Token..."
          style={inputStyle}
        />
        <button
          onClick={handleUpdateGoogle}
          style={btnStyle}
          onMouseOver={(e) => e.currentTarget.style.background = '#2b6cb0'}
          onMouseOut={(e) => e.currentTarget.style.background = '#3182ce'}
        >
          Update
        </button>
      </div>
    </div>
  );
}
