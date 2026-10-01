import React, { useEffect, useState, useMemo } from 'react';
import { Card, InfoBanner } from '../components/Card';
import {
  Receipt,
  Calculator,
  TrendingDown,
  TrendingUp,
  Search,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Percent,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';
import { api } from '../api/client';
import { BROKER_META } from '../data/mockData';

const RANGES = [
  { id: 'today', label: 'Today (1D)' },
  { id: '7d', label: '1 Week (7D)' },
  { id: '30d', label: '1 Month (30D)' },
  { id: '1y', label: '1 Year' },
  { id: 'all', label: 'All Time' }
];

export default function Charges() {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'simulator'
  const [range, setRange] = useState('30d');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Simulator State
  const [broker, setBroker] = useState('UPSTOX');
  const [productType, setProductType] = useState('Equity intraday');
  const [buyPrice, setBuyPrice] = useState(125);
  const [sellPrice, setSellPrice] = useState(132.5);
  const [quantity, setQuantity] = useState(50);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState('');

  // Fetch real trade charges analytics
  useEffect(() => {
    let active = true;

    async function loadCharges() {
      setLoading(true);
      setError('');
      try {
        const res = await api.chargesAnalytics(range);
        if (active) {
          setAnalytics(res?.data || null);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load charges analytics');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCharges();
    return () => {
      active = false;
    };
  }, [range]);

  // Simulator debounce calculation
  useEffect(() => {
    if (activeTab !== 'simulator') return;
    let active = true;

    async function calculate() {
      setSimLoading(true);
      setSimError('');
      try {
        const response = await api.calculateCharges({
          broker,
          productType,
          buyPrice: Number(buyPrice),
          sellPrice: Number(sellPrice),
          quantity: Number(quantity)
        });
        if (active) {
          setSimResult(response?.data || null);
        }
      } catch (err) {
        if (active) {
          setSimError(err.message || 'Failed to calculate hypothetical charges');
        }
      } finally {
        if (active) setSimLoading(false);
      }
    }

    const timeout = setTimeout(calculate, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [broker, productType, buyPrice, sellPrice, quantity, activeTab]);

  const formatINR = (n) =>
    '₹' +
    Number(Math.abs(n || 0)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const filteredTrades = useMemo(() => {
    if (!analytics?.recentTrades) return [];
    if (!search.trim()) return analytics.recentTrades;
    const q = search.toLowerCase();
    return analytics.recentTrades.filter(
      (t) =>
        t.symbol?.toLowerCase().includes(q) ||
        t.tradeId?.toLowerCase().includes(q) ||
        t.orderId?.toLowerCase().includes(q)
    );
  }, [analytics?.recentTrades, search]);

  const FEE_ITEMS = [
    { key: 'brokerage', label: 'Brokerage', desc: 'Broker execution commission', color: '#6366f1' },
    { key: 'stt', label: 'STT / CTT', desc: 'Securities / Commodities transaction tax', color: '#ec4899' },
    { key: 'gst', label: 'GST (18%)', desc: 'Govt tax on brokerage & exchange fees', color: '#f59e0b' },
    { key: 'exchangeCharges', label: 'Exchange Turnover', desc: 'NSE/BSE exchange charges', color: '#10b981' },
    { key: 'stampDuty', label: 'Stamp Duty', desc: 'State stamp duty on buy turnover', color: '#06b6d4' },
    { key: 'sebiCharges', label: 'SEBI Turnover', desc: '₹10/crore regulatory fee', color: '#8b5cf6' },
    { key: 'dpCharges', label: 'DP Charges', desc: 'Depository fee on delivery sells', color: '#64748b' },
    { key: 'ctt', label: 'Commodity Tax', desc: 'CTT on commodity segments', color: '#14b8a6' }
  ];

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Charges &amp; Taxes Analytics</h1>
          <p className="page-description">
            Exact statutory and broker fees aggregated directly from your executed trades.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-tertiary)', padding: 4, borderRadius: 8 }}>
          <button
            className={`btn btn-sm ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setActiveTab('analytics')}
          >
            <Receipt size={14} /> Real Trade Charges
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'simulator' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setActiveTab('simulator')}
          >
            <Calculator size={14} /> Hypothetical Simulator
          </button>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <>
          {/* Range Selector Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Timeframe:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    className={`btn btn-sm ${range === r.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: 12, padding: '5px 12px' }}
                    onClick={() => setRange(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Showing {analytics?.totalTrades || 0} executed trades
            </div>
          </div>

          {error && (
            <div className="info-banner" role="alert" style={{ marginBottom: 16 }}>
              Could not load charges analytics: {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spinner" style={{ margin: '0 auto 12px' }} />
              <div>Calculating 8 statutory &amp; broker fees across your trades…</div>
            </div>
          ) : !analytics || analytics.totalTrades === 0 ? (
            <Card>
              <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No executed trades in this period</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 16px' }}>
                  There are no completed trades recorded for {RANGES.find((r) => r.id === range)?.label || range}.
                  Try choosing "1 Month" or "All Time", or sync trades from your broker.
                </p>
                <button className="btn btn-secondary" onClick={() => setRange('all')}>
                  View All Time Charges
                </button>
              </div>
            </Card>
          ) : (
            <>
              {/* Primary KPI Metric Cards */}
              <div className="stat-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                  <div className="stat-label">Total Charges Incurred</div>
                  <div className="stat-value" style={{ color: '#fbbf24' }}>
                    {formatINR(analytics.totalCharges)}
                  </div>
                  <div className="stat-change neutral" style={{ fontSize: 11 }}>
                    {analytics.chargesToTurnoverPercent}% of turnover · Avg {formatINR(analytics.avgChargePerTrade)}/trade
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '3px solid #6366f1' }}>
                  <div className="stat-label">Total Traded Turnover</div>
                  <div className="stat-value mono">{formatINR(analytics.totalTurnover)}</div>
                  <div className="stat-change neutral" style={{ fontSize: 11 }}>
                    Across {analytics.totalTrades} executions
                  </div>
                </div>

                <div
                  className="stat-card"
                  style={{
                    borderLeft: `3px solid ${analytics.grossPnL >= 0 ? '#10b981' : '#f43f5e'}`
                  }}
                >
                  <div className="stat-label">Gross Realized P&amp;L</div>
                  <div
                    className="stat-value mono"
                    style={{ color: analytics.grossPnL >= 0 ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {analytics.grossPnL >= 0 ? '+' : '-'}
                    {formatINR(analytics.grossPnL)}
                  </div>
                  <div className="stat-change neutral" style={{ fontSize: 11 }}>
                    Before statutory deductions
                  </div>
                </div>

                <div
                  className="stat-card"
                  style={{
                    borderLeft: `3px solid ${analytics.netPnL >= 0 ? '#10b981' : '#f43f5e'}`
                  }}
                >
                  <div className="stat-label">Net Realized P&amp;L</div>
                  <div
                    className="stat-value mono"
                    style={{ color: analytics.netPnL >= 0 ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {analytics.netPnL >= 0 ? '+' : '-'}
                    {formatINR(analytics.netPnL)}
                  </div>
                  <div
                    className="stat-change"
                    style={{
                      fontSize: 11,
                      color: analytics.netPnL < analytics.grossPnL ? '#f87171' : 'var(--text-muted)'
                    }}
                  >
                    Fee drag: -{formatINR(analytics.totalCharges)}
                  </div>
                </div>
              </div>

              {/* Fee Composition Progress Bar */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 18,
                  marginBottom: 20
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Fee Composition Breakdown</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Total: {formatINR(analytics.totalCharges)}
                  </div>
                </div>

                {/* Multi-segment progress bar */}
                <div
                  style={{
                    display: 'flex',
                    height: 12,
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.05)',
                    marginBottom: 14
                  }}
                >
                  {FEE_ITEMS.map((item) => {
                    const pct = analytics.percentages?.[item.key] || 0;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={item.key}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.color,
                          transition: 'width 0.4s ease'
                        }}
                        title={`${item.label}: ${pct}% (${formatINR(analytics.breakdown?.[item.key])})`}
                      />
                    );
                  })}
                </div>

                {/* 8-Charges Detailed Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: 12
                  }}
                >
                  {FEE_ITEMS.map((item) => {
                    const amount = analytics.breakdown?.[item.key] || 0;
                    const pct = analytics.percentages?.[item.key] || 0;
                    return (
                      <div
                        key={item.key}
                        style={{
                          background: 'var(--bg-tertiary)',
                          borderRadius: 8,
                          padding: '10px 14px',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: item.color
                              }}
                            />
                            {item.label}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>
                          {formatINR(amount)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {item.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Second row: Top Charged Symbols & Daily Trend */}
              <div className="grid-2" style={{ marginBottom: 20 }}>
                <Card title="Top Instruments by Charges" subtitle="Symbols incurring the highest fees">
                  {analytics.topSymbols && analytics.topSymbols.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {analytics.topSymbols.map((item, idx) => (
                        <div
                          key={item.symbol}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 6
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 4,
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#818cf8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{item.symbol}</span>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>
                              {formatINR(item.charges)}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {item.percentage}% of total fees
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                      No symbol breakdown available
                    </div>
                  )}
                </Card>

                <Card title="Charges Timeline" subtitle="Historical distribution across trading sessions">
                  {analytics.timeline && analytics.timeline.length > 0 ? (
                    <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {analytics.timeline.slice(-8).reverse().map((t) => (
                        <div
                          key={t.date}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 6
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{t.date}</span>
                          </div>
                          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>
                            {formatINR(t.charges)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Timeline data will populate as trades occur
                    </div>
                  )}
                </Card>
              </div>

              {/* Itemized Executed Trades Charges Table */}
              <Card
                title="Executed Trades &amp; Itemized Charges"
                subtitle="Calculated breakdown per executed order in the selected timeframe"
              >
                <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
                  <div className="search-box" style={{ maxWidth: 300, width: '100%' }}>
                    <Search size={14} />
                    <input
                      placeholder="Filter by symbol or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date &amp; Time</th>
                        <th>Symbol</th>
                        <th>Side</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Exec Price</th>
                        <th className="text-right">Turnover</th>
                        <th className="text-right">Brokerage</th>
                        <th className="text-right">STT</th>
                        <th className="text-right">Exchange</th>
                        <th className="text-right">GST</th>
                        <th className="text-right">Total Charges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.map((t) => {
                        const isBuy = t.transactionType === 'BUY';
                        return (
                          <tr key={t._id || t.tradeId}>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {t.tradeTime
                                ? new Date(t.tradeTime).toLocaleString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '—'}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.symbol}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {t.segment || 'EQUITY'} · {t.broker || 'UPSTOX'}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${isBuy ? 'badge-success' : 'badge-danger'}`}>
                                {t.transactionType}
                              </span>
                            </td>
                            <td className="text-right mono">{t.quantity}</td>
                            <td className="text-right mono">{formatINR(t.price)}</td>
                            <td className="text-right mono">{formatINR(t.turnover)}</td>
                            <td className="text-right mono">{formatINR(t.charges?.brokerage)}</td>
                            <td className="text-right mono">{formatINR(t.charges?.stt)}</td>
                            <td className="text-right mono">{formatINR(t.charges?.exchangeCharges)}</td>
                            <td className="text-right mono">{formatINR(t.charges?.gst)}</td>
                            <td className="text-right mono" style={{ fontWeight: 700, color: '#fbbf24' }}>
                              {formatINR(t.charges?.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      ) : (
        /* Hypothetical Simulator Tab */
        <>
          <InfoBanner icon={Calculator}>
            Hypothetical Simulator: test order scenarios to estimate statutory and broker fees before entering a position.
          </InfoBanner>

          {simError && (
            <div className="info-banner" role="alert" style={{ marginBottom: 16 }}>
              Could not calculate simulator charges: {simError}
            </div>
          )}

          <div className="grid-2">
            <Card title="Hypothetical Trade Inputs" subtitle="Enter simulated order values">
              <div className="form-group">
                <label className="form-label">Broker</label>
                <select className="form-select" value={broker} onChange={(e) => setBroker(e.target.value)}>
                  {Object.entries(BROKER_META).map(([k, m]) => (
                    <option key={k} value={k}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Product type</label>
                <select className="form-select" value={productType} onChange={(e) => setProductType(e.target.value)}>
                  <option>Equity intraday</option>
                  <option>Equity delivery</option>
                  <option>Futures</option>
                  <option>Options</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Buy price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sell price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
            </Card>

            <Card title="Estimated Breakdown (8 Fees)" subtitle="Calculated with statutory SEBI/Exchange rules">
              {simLoading && !simResult ? (
                <p>Calculating charges…</p>
              ) : simResult ? (
                <>
                  <div className="detail-row">
                    <span className="detail-label">Brokerage</span>
                    <span className="detail-value mono">{formatINR(simResult.brokerage)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">STT (Securities Transaction Tax)</span>
                    <span className="detail-value mono">{formatINR(simResult.stt)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Exchange Transaction Charges</span>
                    <span className="detail-value mono">{formatINR(simResult.exchangeCharges)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">SEBI Turnover Charges</span>
                    <span className="detail-value mono">{formatINR(simResult.sebiCharges)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">DP Charges</span>
                    <span className="detail-value mono">{formatINR(simResult.dpCharges)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">GST (18%)</span>
                    <span className="detail-value mono">{formatINR(simResult.gst)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Stamp Duty</span>
                    <span className="detail-value mono">{formatINR(simResult.stampDuty)}</span>
                  </div>

                  <div
                    className="detail-row"
                    style={{
                      borderTop: '2px solid var(--border)',
                      borderBottom: 'none',
                      marginTop: 8,
                      paddingTop: 14
                    }}
                  >
                    <span className="detail-label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      Total Combined Charges
                    </span>
                    <span className="detail-value mono" style={{ color: '#fbbf24', fontWeight: 700, fontSize: 16 }}>
                      {formatINR(simResult.totalCharges)}
                    </span>
                  </div>

                  <div className="grid-2" style={{ marginTop: 20 }}>
                    <div
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: 14,
                        borderRadius: 8,
                        border: '1px solid var(--border)'
                      }}
                    >
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Simulated Gross P&amp;L</div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: simResult.grossPnL >= 0 ? 'var(--success)' : 'var(--danger)'
                        }}
                      >
                        {simResult.grossPnL >= 0 ? '+' : '-'}
                        {formatINR(simResult.grossPnL)}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: 14,
                        borderRadius: 8,
                        border: '1px solid var(--border)'
                      }}
                    >
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Simulated Net P&amp;L</div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 600,
                          color: simResult.netPnL >= 0 ? 'var(--success)' : 'var(--danger)'
                        }}
                      >
                        {simResult.netPnL >= 0 ? '+' : '-'}
                        {formatINR(simResult.netPnL)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p>Enter trade values to see the charges breakdown.</p>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
