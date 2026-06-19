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



  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
      {/* Meta Token */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          Meta Token:
        </label>
        <input
          type="password"
          value={metaToken}
          onChange={(e) => setMetaToken(e.target.value)}
          placeholder="••••••••••••••••••••"
          className="input-field"
          style={{ width: '180px' }}
        />
        <button
          onClick={handleUpdateMeta}
          className="btn-outline"
        >
          Update
        </button>
      </div>

      {/* Google Token */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          Google Token:
        </label>
        <input
          type="password"
          value={googleToken}
          onChange={(e) => setGoogleToken(e.target.value)}
          placeholder="Refresh Token..."
          className="input-field"
          style={{ width: '180px' }}
        />
        <button
          onClick={handleUpdateGoogle}
          className="btn-outline"
        >
          Update
        </button>
      </div>
    </div>
  );
}
