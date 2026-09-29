import React, { useState } from 'react';
import { Card, InfoBanner, StatCard } from '../components/Card';
import LineChart from '../components/charts/LineChart';
import { GroupedBarChart, SimpleBarChart } from '../components/charts/BarChart';
import { Info, X } from 'lucide-react';
import {
  mockEquitySeries,
  mockWeeklyPnL,
  mockBrokerPnL,
  mockDailyActivity,
} from '../data/mockData';

export default function Analytics() {
  const [range, setRange] = useState('30d');
  const [showBanner, setShowBanner] = useState(true);

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Performance analytics</h1>
          <p className="page-description">Understand patterns behind the sample results.</p>
        </div>
        <select className="filter-select" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {showBanner && (
        <div className="info-banner" style={{ position: 'relative' }}>
          <Info size={15} />
          <span>Illustrative sample data — not live broker information.</span>
          <button className="icon-btn" style={{ marginLeft: 'auto', width: 24, height: 24 }} onClick={() => setShowBanner(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Average win" value="₹4,820" change="1.74× avg loss" changeType="positive" />
        <StatCard label="Average loss" value="₹2,770" change="Controlled" changeType="neutral" />
        <StatCard label="Best instrument" value="NIFTY 50" change="+₹18.4K" changeType="positive" />
        <StatCard label="Best trading day" value="Thursday" change="52 trades" changeType="neutral" />
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <Card title="P&L over time" subtitle="Cumulative sample account equity">
          <LineChart data={mockEquitySeries} height={280} />
        </Card>

        <Card title="Win and loss distribution" subtitle="Gross weekly outcomes">
          <GroupedBarChart
            data={mockWeeklyPnL}
            series={[
              { key: 'wins', label: 'Gross wins', color: '#10b981' },
              { key: 'losses', label: 'Gross losses', color: '#ef4444' },
            ]}
          />
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Performance by broker" subtitle="Net P&L contribution">
          <SimpleBarChart
            data={mockBrokerPnL.map((b) => ({ label: b.name, value: b.value }))}
            color="#3b82f6"
            valueFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
          />
        </Card>

        <Card title="Trading activity by day" subtitle="Executed trade count">
          <SimpleBarChart
            data={mockDailyActivity}
            color="#d97706"
            valueFormatter={(v) => `${v} trades`}
          />
        </Card>
      </div>
    </>
  );
}