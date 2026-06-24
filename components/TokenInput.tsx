'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function TokenInput() {
  const [metaToken, setMetaToken] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [cityMappingCount, setCityMappingCount] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const savedMapping = localStorage.getItem('tsc_google_city_mapping');
    if (savedMapping) {
      try {
        const parsed = JSON.parse(savedMapping);
        setCityMappingCount(Object.keys(parsed).length);
      } catch (e) {
        console.error(e);
      }
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

  const handleCityMappingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\\n');
      const mapping: Record<string, string> = {};
      
      lines.forEach((line, index) => {
        if (index === 0 && line.toLowerCase().includes('googlecity')) return; // skip header
        if (!line.trim()) return;
        
        // Handle simple CSV splitting, ignoring commas inside quotes
        const match = line.match(/(?:"([^"]*)")|([^,]+)/g);
        if (match && match.length >= 2) {
          const googleCity = match[0].replace(/^"|"$/g, '').toLowerCase().trim();
          const mappedCity = match[1].replace(/^"|"$/g, '').trim();
          if (googleCity && mappedCity) {
            mapping[googleCity] = mappedCity;
          }
        }
      });
      
      const count = Object.keys(mapping).length;
      if (count > 0) {
        localStorage.setItem('tsc_google_city_mapping', JSON.stringify(mapping));
        setCityMappingCount(count);
        alert(`Successfully loaded ${count} city mappings!`);
      } else {
        alert('No valid mappings found in the CSV.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

      {/* City Mapping */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          City Mapping:
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleCityMappingUpload}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-outline"
        >
          Upload CSV
        </button>
        {cityMappingCount > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {cityMappingCount} cities loaded
          </span>
        )}
      </div>
    </div>
  );
}
