import React, { useState, useMemo } from 'react';
import { Card, InfoBanner } from '../components/Card';
import { Info, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { mockTrades, BROKER_META } from '../data/mockData';

export default function Trades() {
  const [range, setRange] = useState('30d');
  const [broker, setBroker] = useState('all');
  const [side, setSide] = useState('all');
  const [search, setSearch] = useState('');
  const [drawerTrade, setDrawerTrade] = useState(null);
  const [showBanner, setShowBanner] = useState(true);

  const filtered = useMemo(() => {
    return mockTrades.filter((t) => {
      if (broker !== 'all' && t.broker !== broker) return false;
      if (side !== 'all' && t.side !== side) return false;
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [broker, side, search]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Trade history</h1>
        <p className="page-description">Search, filter, and inspect synchronized trade records.</p>
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

      <Card padded={false}>
        <div style={{ padding: 20 }}>
          <div className="card-title">All trades</div>
          <div className="card-subtitle">10 locally stored sample executions</div>

          <div className="filters-row" style={{ marginTop: 16 }}>
            <input
              className="form-input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder="Search symbol or trade ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="filter-select" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
            </select>
            <select className="filter-select" value={broker} onChange={(e) => setBroker(e.target.value)}>
              <option value="all">All brokers</option>
              {Object.entries(BROKER_META).map(([k, m]) => (
                <option key={k} value={k}>{m.name}</option>
              ))}
            </select>
            <select className="filter-select" value={side} onChange={(e) => setSide(e.target.value)}>
              <option value="all">All sides</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Symbol</th>
                <th>Broker</th>
                <th>Side</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Avg. price</th>
                <th>Order</th>
                <th className="text-right">P&L</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No trades match your filters
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} onClick={() => setDrawerTrade(t)}>
                  <td>
                    <div className="text-primary">
                      {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(t.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div className="text-primary">{t.symbol}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.segment}</div>
                  </td>
                  <td>{BROKER_META[t.broker]?.name || t.broker}</td>
                  <td>
                    <span className={`badge ${t.side === 'BUY' ? 'badge-success' : 'badge-danger'}`}>
                      {t.side}
                    </span>
                  </td>
                  <td className="text-right mono">{t.qty}</td>
                  <td className="text-right mono">₹{t.avgPrice.toLocaleString('en-IN')}</td>
                  <td>{t.orderType}</td>
                  <td className="text-right mono" style={{ color: t.pnl >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>
                    {t.pnl >= 0 ? '+' : ''}₹{Math.abs(t.pnl).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {filtered.length} of {mockTrades.length} sample trades
          </span>
          <div className="flex gap-2">
            <button className="icon-btn" disabled>
              <ChevronLeft size={16} />
            </button>
            <button className="icon-btn" disabled>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>

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
              ['Broker', BROKER_META[drawerTrade.broker]?.name || drawerTrade.broker],
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
                {drawerTrade.pnl >= 0 ? '+' : ''}₹{Math.abs(drawerTrade.pnl).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}