'use client';
import React, { useState } from 'react';

type RowData = {
  mtd: number;
  yesterday: number;
};

type CityData = {
  'Search Non-Brand (New)'?: RowData;
  'Search Non-Brand (Old)'?: RowData;
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

    const diffColor = diffPercent >= 0 ? '#48bb78' : '#fc8181';
    
    return (
      <tr key={`${city}-${campaignType}`} style={{ backgroundColor: isTotal ? '#1a1d27' : '#1f2333', borderBottom: '1px solid #2d3748' }}>
        <td style={{ padding: '12px', paddingLeft: `${12 + indentLevel * 20}px`, fontWeight: isTotal ? 'bold' : 'normal', color: 'white' }}>
          {isTotal && indentLevel === 0 ? (
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => toggleCity(city)}>
              <span style={{ marginRight: '8px', fontSize: '10px' }}>{expandedCities[city] ? '▼' : '▶'}</span>
              {city}
            </span>
          ) : (
            campaignType
          )}
        </td>
        <td style={{ padding: '12px', textAlign: 'right', color: '#a0aec0' }}>{planValue ? formatIndianNum(planValue) : '-'}</td>
        <td style={{ padding: '12px', textAlign: 'right', color: 'white' }}>{formatIndianNum(rowData.mtd)}</td>
        <td style={{ padding: '12px', textAlign: 'right', color: 'white' }}>{formatIndianNum(rowData.yesterday)}</td>
        <td style={{ padding: '12px', textAlign: 'right', color: 'white' }}>{formatIndianNum(estSpends)}</td>
        <td style={{ padding: '12px', textAlign: 'right', color: diffColor }}>
          {planValue > 0 ? `${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(2)}%` : '-'}
        </td>
        <td style={{ padding: '12px', textAlign: 'right', color: estMinusPlan >= 0 ? '#48bb78' : '#fc8181' }}>
          {planValue > 0 ? formatIndianNum(estMinusPlan) : '-'}
        </td>
        <td style={{ padding: '12px', textAlign: 'center' }}>
          {planValue > 0 ? (
             <span style={{ 
               padding: '4px 8px', 
               borderRadius: '12px', 
               fontSize: '12px', 
               fontWeight: 'bold',
               backgroundColor: overUnder === 'Over' ? '#c6f6d5' : '#fed7d7',
               color: overUnder === 'Over' ? '#22543d' : '#822727'
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
      return ['Search Non-Brand (New)', 'Search Non-Brand (Old)', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];
    }
    return ['Search', 'Branded Search', 'Demand Gen Clicks', 'Demand Gen Video', 'Performance Max', 'Shopping', 'Display'];
  };

  return (
    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #2d3748' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead style={{ backgroundColor: '#2d3748', color: '#a0aec0', textAlign: 'left' }}>
          <tr>
            <th style={{ padding: '12px', fontWeight: 'bold' }}>City/Campaign Type</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Overall (Plan)</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>MTD</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Yesterday</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Est. Spends</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Difference</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Est - Plan</th>
            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Over/Under</th>
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
                  const typePlan = cityPlan[type] || 0;
                  return renderRow(cityName, type, cityData[type], typePlan, false, 1);
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
              <tr style={{ backgroundColor: '#e8733a', color: 'white', fontWeight: 'bold' }}>
                <td style={{ padding: '12px' }}>Grand Total</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{grandPlan ? formatIndianNum(grandPlan) : '-'}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{formatIndianNum(data.grandTotal.mtd)}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{formatIndianNum(data.grandTotal.yesterday)}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{formatIndianNum(data.grandTotal.mtd + (data.grandTotal.yesterday * daysRemaining))}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {grandPlan > 0 && daysPassed > 0 ? (
                    `${(((data.grandTotal.mtd / (grandPlan * (daysPassed / totalDays))) - 1) * 100).toFixed(2)}%`
                  ) : '-'}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {grandPlan > 0 ? formatIndianNum((data.grandTotal.mtd + (data.grandTotal.yesterday * daysRemaining)) - grandPlan) : '-'}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>-</td>
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}
