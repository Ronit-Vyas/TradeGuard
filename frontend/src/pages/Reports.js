import React, { useState } from 'react';
import { Card, StatCard, InfoBanner } from '../components/Card';
import { Info, Download, Printer, FileText } from 'lucide-react';
import { useToast } from '../components/Toast';
import { mockBrokerPnL } from '../data/mockData';

export default function Reports() {
  const [range, setRange] = useState('30d');
  const toast = useToast();

  function handleExport(type) {
    toast.push(`Sample ${type} export generated (frontend-only)`, 'info');
  }

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Performance report</h1>
          <p className="page-description">
            Generate a print-friendly summary from illustrative records.
          </p>
        </div>
        <div className="flex gap-2">
          <select className="filter-select" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="fy">Financial year</option>
          </select>
          <button className="btn btn-secondary" onClick={() => handleExport('CSV')}>
            <Download size={14} /> CSV
          </button>
          <button className="btn btn-primary" onClick={() => handleExport('PDF')}>
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      <InfoBanner icon={Info}>
        Illustrative sample data — not live broker information.
      </InfoBanner>

      <div className="stat-grid">
        <StatCard label="Net P&L" value="₹42,620" change="+5.1%" changeType="positive" />
        <StatCard label="Total trades" value="207" change="30-day period" changeType="neutral" />
        <StatCard label="Win rate" value="63.4%" change="131 winning trades" changeType="positive" />
        <StatCard label="Charges paid" value="₹8,740" change="Sample estimate" changeType="neutral" />
      </div>

      <div className="grid-2">
        <Card title="Trade statistics">
          {[
            ['Winning trades', '131'],
            ['Losing trades', '76'],
            ['Average win', '₹4,820'],
            ['Average loss', '₹2,770'],
            ['Largest win', '₹18,420'],
            ['Largest loss', '₹7,860'],
          ].map(([label, value], i) => (
            <div
              className="detail-row"
              key={label}
              style={i === 0 ? { paddingTop: 0 } : undefined}
            >
              <span className="detail-label">{label}</span>
              <span className="detail-value mono">{value}</span>
            </div>
          ))}
        </Card>

        <Card title="Broker-wise breakdown" subtitle="Sample contribution">
          {mockBrokerPnL.map((b) => (
            <div className="detail-row" key={b.broker}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sample contribution</div>
              </div>
              <span className="detail-value mono" style={{ color: 'var(--success)' }}>
                +₹{b.value.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}