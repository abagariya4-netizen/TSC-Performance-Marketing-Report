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
    }}>
      <div className="card" style={{
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '24px', fontWeight: 'bold' }}>
          🛏 TSC Login
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>
          Performance Report Generator
        </p>

        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.1)',
            color: 'var(--danger-color)',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center',
            border: '1px solid rgba(244, 63, 94, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Sleep Company ID
            </label>
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="Enter your ID"
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: '14px',
              fontSize: '16px',
              marginTop: '8px',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
