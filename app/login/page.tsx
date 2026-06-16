'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [companyId, setCompanyId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId.trim()) {
      setError('Please enter Sleep Company ID');
      return;
    }
    if (password === 'TSC@2026') {
      // Set session cookie (expires when browser is closed)
      document.cookie = 'tsc_auth=true; path=/; samesite=strict';
      router.push('/');
      router.refresh(); // Refresh to clear any cached states
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1117',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#1a1d27',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #2d3748'
      }}>
        <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '8px', fontSize: '24px' }}>
          🛏 TSC Login
        </h1>
        <p style={{ color: '#a0aec0', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>
          Performance Report Generator
        </p>

        {error && (
          <div style={{
            background: 'rgba(252, 129, 129, 0.1)',
            color: '#fc8181',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center',
            border: '1px solid rgba(252, 129, 129, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', color: '#e2e8f0', marginBottom: '8px', fontSize: '14px' }}>
              Sleep Company ID
            </label>
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="Enter your ID"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                background: '#0f1117',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#e2e8f0', marginBottom: '8px', fontSize: '14px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                background: '#0f1117',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: '#e8733a',
              color: 'white',
              border: 'none',
              padding: '14px',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '8px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#d66329'}
            onMouseOut={(e) => e.currentTarget.style.background = '#e8733a'}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
