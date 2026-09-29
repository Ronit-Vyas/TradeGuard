import React, { useState, useMemo } from 'react';
import { Card, StatCard, InfoBanner } from '../components/Card';
import LineChart from '../components/charts/LineChart';
import DonutChart from '../components/charts/DonutChart';
import { Info, X } from 'lucide-react';
import {
  mockTrades,
  mockEquitySeries,
  mockInstrumentDistribution,
} from '../data/mockData';

function formatINR(n) {
  return '₹' + n.toLocaleString('en-IN');
}

export default function Overview() {
  const [range, setRange] = useState('30d');
  const [drawerTrade, setDrawerTrade] = useState(null);
  const [showBanner, setShowBanner] = useState(true);

  const recent = mockTrades.slice(0, 5);

  const stats = useMemo(() => ({
    totalPnl: 42620,
    todayPnl: 3560,
    totalTrades: 207,
    winRate: '63.4%',
    profitFactor: 1.84,
    connectedBrokers: '3 of 4',
  }), []);

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Portfolio overview</h1>
          <p className="page-description">
            A consolidated view of your illustrative trading performance.
          </p>
        </div>
        <select
          className="filter-select"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {showBanner && (
        <div className="info-banner" style={{ position: 'relative' }}>
          <Info size={15} />
          <span>Illustrative sample data — not live broker information.</span>
          <button
            className="icon-btn"
            style={{ marginLeft: 'auto', width: 24, height: 24 }}
            onClick={() => setShowBanner(false)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="stat-grid">
        <StatCard
          label="Total P&L"
          value={formatINR(stats.totalPnl)}
          change="+5.1% vs prior period"
          changeType="positive"
        />
        <StatCard
          label="Today's P&L"
          value={formatINR(stats.todayPnl)}
          change="+0.8%"
          changeType="positive"
        />
        <StatCard
          label="Total trades"
          value={stats.totalTrades}
          change="14 more"
          changeType="neutral"
        />
        <StatCard
          label="Win rate"
          value={stats.winRate}
          change="+2.3 pp"
          changeType="positive"
        />
        <StatCard
          label="Profit factor"
          value={stats.profitFactor}
          change="Healthy"
          changeType="positive"
        />
        <StatCard
          label="Connected brokers"
          value={stats.connectedBrokers}
          change="1 needs action"
          changeType="neutral"
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <Card
          title="Equity performance"
          subtitle="Cumulative account equity across sample broker accounts"
        >
          <LineChart data={mockEquitySeries} />
        </Card>

        <Card
          title="Instrument distribution"
          subtitle="Share of total executed trades"
        >
          <DonutChart data={mockInstrumentDistribution} />
        </Card>
      </div>

      <div className="grid-2">
        <Card title="Recent trades" subtitle="Select a row to inspect its execution details" padded={false}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Avg. price</th>
                  <th className="text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} onClick={() => setDrawerTrade(t)}>
                    <td>
                      <div className="text-primary">
                        {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(t.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div className="text-primary">{t.symbol}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.segment}</div>
                    </td>
                    <td>
                      <span className={`badge ${t.side === 'BUY' ? 'badge-success' : 'badge-danger'}`}>
                        {t.side}
                      </span>
                    </td>
                    <td className="text-right mono">{t.qty}</td>
                    <td className="text-right mono">₹{t.avgPrice.toLocaleString('en-IN')}</td>
                    <td className="text-right mono" style={{ color: t.pnl >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>
                      {t.pnl >= 0 ? '+' : ''}{formatINR(t.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Risk summary" subtitle="Based on configured demo limits">
          <div className="progress-row">
            <div className="progress-header">
              <span style={{ color: 'var(--text-secondary)' }}>Daily loss used</span>
              <span className="mono">₹8,408 of ₹15,000</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill success" style={{ width: '56%' }} />
            </div>
          </div>
          <div className="progress-row">
            <div className="progress-header">
              <span style={{ color: 'var(--text-secondary)' }}>Capital exposed</span>
              <span className="mono">₹1.92L of ₹4.00L</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '48%' }} />
            </div>
          </div>
          <div className="progress-row">
            <div className="progress-header">
              <span style={{ color: 'var(--text-secondary)' }}>Current drawdown</span>
              <span className="mono">3.2% of 8.0%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill warning" style={{ width: '40%' }} />
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Overall status</span>
            <span className="badge badge-success">
              <span className="badge-dot" /> Healthy
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Within configured limits
          </div>
        </Card>
      </div>

      {drawerTrade && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerTrade(null)} />
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trade details</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{drawerTrade.id}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Illustrative execution record
                </div>
              </div>
              <button className="icon-btn" onClick={() => setDrawerTrade(null)}>
                <X size={18} />
              </button>
            </div>

            {[
              ['Symbol', drawerTrade.symbol],
              ['Broker', drawerTrade.broker],
              ['Side', drawerTrade.side],
              ['Quantity', drawerTrade.qty],
              ['Average price', `₹${drawerTrade.avgPrice.toLocaleString('en-IN')}`],
              ['Order type', drawerTrade.orderType],
              ['Segment', drawerTrade.segment],
              ['Executed', new Date(drawerTrade.date).toLocaleString('en-GB')],
            ].map(([label, value]) => (
              <div className="detail-row" key={label}>
                <span className="detail-label">{label}</span>
                <span className="detail-value">{value}</span>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Realized P&L
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: drawerTrade.pnl >= 0 ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {drawerTrade.pnl >= 0 ? '+' : ''}{formatINR(drawerTrade.pnl)}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}