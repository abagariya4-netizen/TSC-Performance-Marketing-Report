'use client';
import React, { useState } from 'react';

type RowData = {
  mtd: number;
  yesterday: number;
};

type CityData = {
  'Search Non-Brand (New)': RowData;
  'Search Non-Brand (Old)': RowData;
  'Search': RowData;
  'Branded Search': RowData;
  'Demand Gen Clicks': RowData;
  'Demand Gen Video': RowData;
  'Performance Max': RowData;
  'Shopping': RowData;
  'Display': RowData;
  total: RowData;
};

type DateInfo = {
  dayOfMonth: number;
  daysRemaining: number;
  totalDays: number;
  monthName: string;
};

type Google6CityTableProps = {
  data: {
    cities: Record<string, CityData>;
    grandTotal: RowData;
    dateInfo: DateInfo;
  };
  planData: Record<string, Record<string, number>> | null;
};

const formatIndianNum = (num: number) => {
  return new Intl.NumberFormat('en-IN').format(Math.round(num));
};

const getPillColor = (isOver: boolean) => {
  return isOver ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

export default function Google6CityTable({ data, planData }: Google6CityTableProps) {
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});

  const toggleCity = (city: string) => {
    setExpandedCities(prev => ({ ...prev, [city]: !prev[city] }));
  };

  const { dayOfMonth: daysPassed, daysRemaining, totalDays } = data.dateInfo;

  const renderRow = (
    city: string,
    campaignType: string,
    rowData: RowData,
    planValue: number,
    isTotal: boolean = false,
    indentLevel: number = 0
  ) => {
    const estSpends = rowData.mtd + (rowData.yesterday * daysRemaining);
    const estMinusPlan = estSpends - planValue;
    const overUnder = estSpends >= planValue ? 'Over' : 'Under';

    let diffPercent = 0;
    if (planValue > 0 && daysPassed > 0) {
      const proratedPlan = planValue * (daysPassed / totalDays);
      diffPercent = ((rowData.mtd / proratedPlan) - 1) * 100;
    }

    const diffColor = diffPercent >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
    
    return (
      <tr key={`${city}-${campaignType}`} style={{ backgroundColor: isTotal ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
        <td style={{ textAlign: 'left', paddingLeft: `${12 + indentLevel * 20}px`, fontWeight: isTotal ? 'bold' : 'normal', borderRight: '1px solid var(--border-color)' }}>
          {isTotal && indentLevel === 0 ? (
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => toggleCity(city)}>
              <span style={{ marginRight: '8px', fontSize: '10px' }}>{expandedCities[city] ? '▼' : '▶'}</span>
              {city}
            </span>
          ) : (
            campaignType
          )}
        </td>
        <td>{planValue ? formatIndianNum(planValue) : '-'}</td>
        <td>{formatIndianNum(rowData.mtd)}</td>
        <td>{formatIndianNum(rowData.yesterday)}</td>
        <td>{formatIndianNum(estSpends)}</td>
        <td style={{ color: diffColor }}>
          {planValue > 0 ? `${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(2)}%` : '-'}
        </td>
        <td style={{ color: estMinusPlan >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
          {planValue > 0 ? formatIndianNum(estMinusPlan) : '-'}
        </td>
        <td style={{ textAlign: 'center' }}>
          {planValue > 0 ? (
             <span style={{ 
               padding: '2px 10px', 
               borderRadius: '999px', 
               fontSize: '12px', 
               fontWeight: 'bold',
               backgroundColor: overUnder === 'Over' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
               color: overUnder === 'Over' ? 'var(--success-color)' : 'var(--danger-color)',
               border: overUnder === 'Over' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)'
             }}>
               {overUnder}
             </span>
          ) : '-'}
        </td>
      </tr>
    );
  };

  const newOldCities = ['Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad'];
  const getCampaignTypes = (cityName: string): (keyof CityData)[] => {
    if (newOldCities.includes(cityName)) {
      // Search Non-Brand (New) and (Old) at bottom, after Display
      return ['Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display', 'Search Non-Brand (New)', 'Search Non-Brand (Old)'];
    }
    // Gujarat and Delhi+NCR keep Search as normal row
    return ['Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];
  };

  return (
    <div style={{ marginBottom: '32px' }}>
      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)' }}>City/Campaign Type</th>
              <th style={{ textAlign: 'center' }}>Overall (Plan)</th>
              <th style={{ textAlign: 'center' }}>MTD</th>
              <th style={{ textAlign: 'center' }}>Yesterday</th>
              <th style={{ textAlign: 'center' }}>Est. Spends</th>
              <th style={{ textAlign: 'center' }}>Difference</th>
              <th style={{ textAlign: 'center' }}>Est - Plan</th>
              <th style={{ textAlign: 'center' }}>Over/Under</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data.cities).map(([cityName, cityData]) => {
              const cityPlan = planData?.[cityName] || {};
              const totalPlan = cityPlan['Total'] || 0;
              
              return (
                <React.Fragment key={cityName}>
                  {renderRow(cityName, cityName, cityData.total, totalPlan, true, 0)}
                  {expandedCities[cityName] && getCampaignTypes(cityName).map(type => {
                    const typePlan = cityPlan[type as string] || 0;
                    const rowData = cityData[type] || { mtd: 0, yesterday: 0 };
                    return renderRow(cityName, type as string, rowData, typePlan, false, 1);
                  })}
                </React.Fragment>
              );
            })}
            {/* Grand Total */}
            {(() => {
              let grandPlan = 0;
              if (planData) {
                Object.values(planData).forEach(cp => {
                  if (cp['Total']) grandPlan += cp['Total'];
                });
              }
              return (
                <tr style={{ backgroundColor: 'var(--accent-primary)', color: 'white', fontWeight: 'bold' }}>
                  <td style={{ textAlign: 'left', borderRight: '1px solid var(--border-color)' }}>Grand Total</td>
                  <td>{grandPlan ? formatIndianNum(grandPlan) : '-'}</td>
                  <td>{formatIndianNum(data.grandTotal.mtd)}</td>
                  <td>{formatIndianNum(data.grandTotal.yesterday)}</td>
                  <td>{formatIndianNum(data.grandTotal.mtd + (data.grandTotal.yesterday * daysRemaining))}</td>
                  <td>
                    {grandPlan > 0 && daysPassed > 0 ? (
                      `${(((data.grandTotal.mtd / (grandPlan * (daysPassed / totalDays))) - 1) * 100).toFixed(2)}%`
                    ) : '-'}
                  </td>
                  <td>
                    {grandPlan > 0 ? formatIndianNum((data.grandTotal.mtd + (data.grandTotal.yesterday * daysRemaining)) - grandPlan) : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>-</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
