import React, { useEffect, useState } from 'react';
import { Card, StatCard, InfoBanner } from '../components/Card';
import { Info, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';

export default function RiskManagement() {
  const [dailyLimit, setDailyLimit] = useState(15000);
  const [riskPerTrade, setRiskPerTrade] = useState(1.5);
  const [exposures, setExposures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadExposures() {
      setLoading(true);
      setError('');
      try {
        const response = await api.riskExposures();
        if (active) {
          setExposures(response?.data?.exposures || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load exposures');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadExposures();
    return () => { active = false; };
  }, []);

  const totalExposure = exposures.reduce((sum, e) => sum + (e.avgPrice * e.quantity), 0);
  const maxExposure = 100000;
  const exposurePct = totalExposure > 0 ? Math.min((totalExposure / maxExposure) * 100, 100) : 0;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Risk management</h1>
        <p className="page-description">Monitor exposure against your configured demo guardrails.</p>
      </div>

      <InfoBanner icon={Info}>
        These settings provide visual guidance only. They cannot place, modify, or block orders.
      </InfoBanner>

      {error && (
        <div className="info-banner" role="alert">
          Could not load exposure data: {error}
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Total exposure" value={`₹${Math.round(totalExposure).toLocaleString('en-IN')}`} change={`${exposures.length} open positions`} changeType="neutral" />
        <StatCard label="Exposure used" value={`${exposurePct.toFixed(1)}%`} change="Of ₹100K limit" changeType={exposurePct > 75 ? 'negative' : 'positive'} />
        <StatCard label="Risk per trade" value={`${riskPerTrade.toFixed(1)}%`} change="Configured" changeType="neutral" />
        <StatCard label="Daily loss limit" value={`₹${dailyLimit.toLocaleString('en-IN')}`} change="Configured" changeType="neutral" />
      </div>

      <div className="grid-2">
        <Card title="Exposure summary" subtitle="Open positions from your trade records">
          {loading ? (
            <p>Loading exposures…</p>
          ) : exposures.length === 0 ? (
            <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
              No open positions found in your trade records.
            </div>
          ) : (
            exposures.map((e) => {
              const value = e.avgPrice * e.quantity;
              const pct = Math.min((value / maxExposure) * 100, 100);
              return (
                <div className="progress-row" key={e.instrument}>
                  <div className="progress-header">
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{e.instrument}</span>
                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                      ₹{Math.round(value).toLocaleString('en-IN')}
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
            })
          )}
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

          {exposurePct > 60 && (
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
                  Total exposure exceeds 60% of the limit.
                </div>
              </div>
              <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>
                <span className="badge-dot" /> Warning
              </span>
            </div>
          )}

          <button className="btn btn-primary mt-4">
            Save preferences
          </button>
        </Card>
      </div>
    </>
  );
}
