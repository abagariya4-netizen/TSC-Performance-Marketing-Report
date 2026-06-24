import React, { useState } from 'react';

type DateRangePickerProps = {
  onApply: (startMonth: string, endMonth: string) => void;
  onReset: () => void;
};

export default function DateRangePicker({ onApply, onReset }: DateRangePickerProps) {
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const handleApply = () => {
    if (!startMonth || !endMonth) return;
    onApply(startMonth, endMonth);
  };

  const handleReset = () => {
    setStartMonth('');
    setEndMonth('');
    onReset();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Start:</label>
        <input 
          type="month" 
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
          className="input-field"
          style={{ padding: '6px 10px', minHeight: '36px' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>End:</label>
        <input 
          type="month" 
          value={endMonth}
          onChange={(e) => setEndMonth(e.target.value)}
          className="input-field"
          style={{ padding: '6px 10px', minHeight: '36px' }}
        />
      </div>
      <button 
        onClick={handleApply}
        disabled={!startMonth || !endMonth}
        className="btn-primary"
        style={{ padding: '6px 16px', minHeight: '36px', fontSize: '13px' }}
      >
        Apply
      </button>
      <button 
        onClick={handleReset}
        className="btn-outline"
        style={{ padding: '6px 16px', minHeight: '36px', fontSize: '13px' }}
      >
        Reset
      </button>
    </div>
  );
}
