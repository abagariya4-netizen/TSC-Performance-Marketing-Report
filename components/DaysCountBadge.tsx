'use client';
import React, { useState, useEffect } from 'react';

export default function DaysCountBadge() {
  const [dateInfo, setDateInfo] = useState<{
    displayDate: string;
    daysPassed: number;
    totalDays: number;
    daysRemaining: number;
  } | null>(null);

  useEffect(() => {
    // Current time in IST
    const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const today = new Date(istString);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    
    const daysPassed = yesterday.getDate();
    const totalDays = new Date(yesterday.getFullYear(), yesterday.getMonth() + 1, 0).getDate();
    const daysRemaining = totalDays - daysPassed;
    
    // For formatting like "2026-06-01" (Month Start)
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const displayDate = `${y}-${m}-01`;

    setDateInfo({
      displayDate,
      daysPassed,
      totalDays,
      daysRemaining
    });
  }, []);

  if (!dateInfo) return null;

  return (
    <div style={{ 
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '8px', 
      padding: '4px 12px', 
      background: 'rgba(99, 102, 241, 0.1)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '999px', 
      fontSize: '13px', 
      fontWeight: 500,
      color: 'var(--accent-hover)' 
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }}></span>
      {dateInfo.displayDate} <span style={{ opacity: 0.5 }}>|</span> Day {dateInfo.daysPassed} of {dateInfo.totalDays} <span style={{ opacity: 0.5 }}>|</span> {dateInfo.daysRemaining} days remaining
    </div>
  );
}
