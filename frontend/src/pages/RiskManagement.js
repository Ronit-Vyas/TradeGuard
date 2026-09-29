import React, { useState } from 'react';
import { Card, StatCard, InfoBanner } from '../components/Card';
import { Info, AlertTriangle } from 'lucide-react';

const EXPOSURES = [
  { instrument: 'NIFTY 50', value: 82480, max: 100000 },
  { instrument: 'BANKNIFTY', value: 56200, max: 100000 },
  { instrument: 'RELIANCE', value: 31000, max: 100000 },
  { instrument: 'TCS', value: 21600, max: 100000 },
];

export default function RiskManagement() {
  const [dailyLimit, setDailyLimit] = useState(15000);
  const [riskPerTrade, setRiskPerTrade] = useState(1.5);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Risk management</h1>
        <p className="page-description">Monitor exposure against your configured demo guardrails.</p>
      </div>

      <InfoBanner icon={Info}>
        These settings provide visual guidance only. They cannot place, modify, or block orders.
      </InfoBanner>

      <div className="stat-grid">
        <StatCard label="Daily loss used" value="₹8,408 / ₹15K" change="56% used" changeType="neutral" />
        <StatCard label="Current drawdown" value="3.2%" change="Within 8% limit" changeType="positive" />
        <StatCard label="Risk per trade" value="1.5%" change="Configured" changeType="neutral" />
        <StatCard label="Avg. risk/reward" value="1 : 1.84" change="Healthy" changeType="positive" />
      </div>

      <div className="grid-2">
        <Card title="Exposure summary" subtitle="Open sample positions by instrument">
          {EXPOSURES.map((e) => {
            const pct = (e.value / e.max) * 100;
            return (
              <div className="progress-row" key={e.instrument}>
                <div className="progress-header">
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{e.instrument}</span>
                  <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                    ₹{e.value.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${pct > 75 ? 'warning' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </Card>

        <Card title="Risk preferences" subtitle="Saved locally for this preview">
          <div className="form-group">
            <label className="form-label">Daily loss limit (₹)</label>
            <input
              type="number"
              className="form-input"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center mb-2">
              <label className="form-label" style={{ margin: 0 }}>Risk per trade</label>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                {riskPerTrade.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={riskPerTrade}
              onChange={(e) => setRiskPerTrade(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <div
            style={{
              background: 'var(--warning-bg)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 8,
              padding: 14,
              marginTop: 20,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Concentration warning</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Index derivatives exceed 60% of exposure.
              </div>
            </div>
            <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>
              <span className="badge-dot" /> Warning
            </span>
          </div>

          <button className="btn btn-primary mt-4">
            Save preferences
          </button>
        </Card>
      </div>
    </>
  );
}