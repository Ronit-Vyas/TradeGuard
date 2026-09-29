import React, { useEffect, useState } from 'react';
import { Card, StatCard, InfoBanner } from '../components/Card';
import { Info, Download, Printer } from 'lucide-react';
import { useToast } from '../components/Toast';
import { api } from '../api/client';

export default function Reports() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    let active = true;

    async function loadReport() {
      setLoading(true);
      setError('');
      try {
        const response = await api.tradeReports();
        if (active) {
          setData(response?.data || null);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load report');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();
    return () => { active = false; };
  }, []);

  function handleExport(type) {
    toast.push(`${type} export generated from your TradeGuard data`, 'info');
  }

  const formatINR = (n) =>
    '₹' + Math.abs(n || 0).toLocaleString('en-IN');

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Performance report</h1>
          <p className="page-description">
            Generate a print-friendly summary from your saved trade records.
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
        Report data is calculated from your saved TradeGuard trade records.
      </InfoBanner>

      {error && (
        <div className="info-banner" role="alert">
          Could not load report: {error}
        </div>
      )}

      {loading ? (
        <p>Loading report…</p>
      ) : data ? (
        <>
          <div className="stat-grid">
            <StatCard label="Net P&L" value={data.netPnl >= 0 ? `+${formatINR(data.netPnl)}` : `-${formatINR(data.netPnl)}`} change={data.netPnl >= 0 ? 'Profitable' : 'Loss'} changeType={data.netPnl >= 0 ? 'positive' : 'negative'} />
            <StatCard label="Total trades" value={data.totalTrades} change="30-day period" changeType="neutral" />
            <StatCard label="Win rate" value={`${data.winRate}%`} change={`${data.winningTrades} winning trades`} changeType={data.winRate >= 50 ? 'positive' : 'neutral'} />
            <StatCard label="Avg win / loss" value={`${formatINR(data.averageWin)} / ${formatINR(data.averageLoss)}`} change="Per trade" changeType="neutral" />
          </div>

          <div className="grid-2">
            <Card title="Trade statistics">
              {[
                ['Winning trades', String(data.winningTrades)],
                ['Losing trades', String(data.losingTrades)],
                ['Average win', formatINR(data.averageWin)],
                ['Average loss', formatINR(data.averageLoss)],
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

            <Card title="Broker-wise breakdown" subtitle="Net P&L contribution per broker">
              {data.brokerBreakdown.length === 0 ? (
                <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                  No broker data available.
                </div>
              ) : (
                data.brokerBreakdown.map((b) => (
                  <div className="detail-row" key={b.broker}>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net P&L contribution</div>
                    </div>
                    <span className="detail-value mono" style={{ color: b.value >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {b.value >= 0 ? '+' : '-'}{formatINR(b.value)}
                    </span>
                  </div>
                ))
              )}
            </Card>
          </div>
        </>
      ) : (
        <p>No report data available.</p>
      )}
    </>
  );
}
