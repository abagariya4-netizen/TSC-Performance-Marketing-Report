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
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
      <span style={{ backgroundColor: '#1f2333', padding: '6px 12px', borderRadius: '4px', fontSize: '14px', border: '1px solid #2d3348', color: '#fff' }}>
        📅 {dateInfo.displayDate} | Day {dateInfo.daysPassed} of {dateInfo.totalDays} | {dateInfo.daysRemaining} days remaining
      </span>
    </div>
  );
}
