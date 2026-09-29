import React, { useEffect, useMemo, useState } from 'react';
import { Card, StatCard } from '../components/Card';
import { Info, X } from 'lucide-react';
import { api } from '../api/client';
import DonutChart from '../components/charts/DonutChart';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16'];

function formatINR(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function getTradeDate(trade) {
  return trade.tradeTime || trade.executedAt || trade.createdAt || trade.updatedAt || null;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

function formatTime(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getId(trade) {
  return trade._id || trade.tradeId || trade.orderId || 'Execution';
}

function getQuantity(trade) {
  return trade.quantity ?? '—';
}

function getPrice(trade) {
  return trade.executedPrice ?? trade.averagePrice ?? trade.price;
}

export default function Overview() {
  const [range, setRange] = useState('30d');
  const [drawerTrade, setDrawerTrade] = useState(null);
  const [showBanner, setShowBanner] = useState(true);

  const [summary, setSummary] = useState(null);
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [instrumentDistribution, setInstrumentDistribution] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      setLoading(true);
      setError('');

      try {
        const [summaryResponse, tradesResponse, accountsResponse, instrumentResponse] =
          await Promise.all([
            api.tradeSummary(),
            api.listTrades(),
            api.listBrokerAccounts(),
            api.instrumentDistribution(),
          ]);

        if (!active) return;

        setSummary(summaryResponse?.data || null);
        setTrades(
          Array.isArray(tradesResponse?.data) ? tradesResponse.data : []
        );
        setAccounts(
          Array.isArray(accountsResponse?.data) ? accountsResponse.data : []
        );
        setInstrumentDistribution(instrumentResponse?.data?.distribution || []);
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Unable to load your saved trading data.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, []);

  // Apply the selected date range to the execution list.
  // The summary cards below remain all-time totals returned by the API.
  const filteredTrades = useMemo(() => {
    const now = new Date();
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);

    return trades
      .filter((trade) => {
        const value = getTradeDate(trade);
        if (!value) return false;

        const date = new Date(value);
        return !Number.isNaN(date.getTime()) && date >= cutoff && date <= now;
      })
      .sort((a, b) => {
        const dateA = new Date(getTradeDate(a) || 0).getTime();
        const dateB = new Date(getTradeDate(b) || 0).getTime();
        return dateB - dateA;
      });
  }, [trades, range]);

  const recent = filteredTrades.slice(0, 5);

  const totalExecutions =
    summary?.totalExecutions ?? trades.length;

  const buyExecutions =
    summary?.buyExecutions ??
    trades.filter((trade) => trade.transactionType === 'BUY').length;

  const sellExecutions =
    summary?.sellExecutions ??
    trades.filter((trade) => trade.transactionType === 'SELL').length;

  const totalQuantity =
    summary?.totalQuantity ??
    trades.reduce((total, trade) => total + Number(trade.quantity || 0), 0);

  const brokerAccountCount =
    summary?.brokerAccounts ?? accounts.length;

  const distinctSymbols =
    summary?.distinctSymbols ??
    new Set(trades.map((trade) => trade.symbol).filter(Boolean)).size;

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Portfolio overview</h1>
          <p className="page-description">
            A consolidated view of executions saved in your TradeGuard database.
          </p>
        </div>

        <select
          className="filter-select"
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {showBanner && (
        <div className="info-banner" style={{ position: 'relative' }}>
          <Info size={15} />
          <span>
            Dashboard values are loaded from your saved TradeGuard records.
            P&amp;L and risk metrics are not shown until they are calculated
            from matched trades and configured risk limits.
          </span>

          <button
            className="icon-btn"
            aria-label="Dismiss information"
            style={{ marginLeft: 'auto', width: 24, height: 24 }}
            onClick={() => setShowBanner(false)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="info-banner" role="alert">
          Could not load account data: {error}
        </div>
      )}

      {loading ? (
        <p>Loading your saved trading data…</p>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Saved executions"
              value={totalExecutions}
              change="All-time database total"
              changeType="neutral"
            />
            <StatCard
              label="Buy executions"
              value={buyExecutions}
              change="All-time database total"
              changeType="neutral"
            />
            <StatCard
              label="Sell executions"
              value={sellExecutions}
              change="All-time database total"
              changeType="neutral"
            />
            <StatCard
              label="Executed quantity"
              value={Number(totalQuantity).toLocaleString('en-IN')}
              change="All-time database total"
              changeType="neutral"
            />
            <StatCard
              label="Broker accounts"
              value={brokerAccountCount}
              change="Saved accounts"
              changeType="neutral"
            />
            <StatCard
              label="Symbols traded"
              value={distinctSymbols}
              change="Distinct saved symbols"
              changeType="neutral"
            />
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            <Card
              title="Equity performance"
              subtitle="Equity curve will appear when portfolio-level P&L history is available"
            >
              <div
                style={{
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  padding: 20,
                }}
              >
                No equity history available yet.
                <br />
                Individual executions are not enough to construct an accurate
                account equity curve.
              </div>
            </Card>

            <Card
              title="Instrument distribution"
              subtitle="Executed trades grouped by equity product, futures and options"
            >
              {instrumentDistribution.length === 0 ? (
                <div style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                  No instrument classification available. Check saved segment/product fields.
                </div>
              ) : (
                <DonutChart
                  data={instrumentDistribution.map((item, index) => ({
                    label: item.label,
                    value: item.value,
                    color: CHART_COLORS[index % CHART_COLORS.length],
                  }))}
                  size={200}
                  thickness={28}
                />
              )}
            </Card>
          </div>

          <div className="grid-2">
            <Card
              title="Recent trades"
              subtitle={`Saved executions from the selected ${range} period. Select a row for details.`}
              padded={false}
            >
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Execution price</th>
                      <th>Broker</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recent.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>
                          No saved executions found for this period.
                        </td>
                      </tr>
                    ) : (
                      recent.map((trade) => {
                        const tradeDate = getTradeDate(trade);
                        const side = trade.transactionType;

                        return (
                          <tr
                            key={trade._id || trade.tradeId || trade.orderId}
                            onClick={() => setDrawerTrade(trade)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>
                              <div className="text-primary">
                                {formatDate(tradeDate)}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {formatTime(tradeDate)}
                              </div>
                            </td>

                            <td>
                              <div className="text-primary">
                                {trade.symbol || '—'}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {trade.segment || trade.exchange || '—'}
                              </div>
                            </td>

                            <td>
                              <span
                                className={`badge ${
                                  side === 'BUY'
                                    ? 'badge-success'
                                    : side === 'SELL'
                                    ? 'badge-danger'
                                    : ''
                                }`}
                              >
                                {side || '—'}
                              </span>
                            </td>

                            <td className="text-right mono">
                              {getQuantity(trade)}
                            </td>

                            <td className="text-right mono">
                              {getPrice(trade) == null
                                ? '—'
                                : formatINR(getPrice(trade))}
                            </td>

                            <td>{trade.broker || '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card
              title="Risk summary"
              subtitle="Risk metrics require configured limits and portfolio-level calculations"
            >
              <div
                style={{
                  minHeight: 190,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Risk metrics not available yet
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Daily loss used, capital exposed, and drawdown will be
                  displayed after risk limits and the required position/P&amp;L
                  calculations are connected to the backend.
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {drawerTrade && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => setDrawerTrade(null)}
          />

          <div className="drawer">
            <div className="drawer-header">
              <div>
                <div
                  style={{ fontSize: 12, color: 'var(--text-muted)' }}
                >
                  Execution details
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {getId(drawerTrade)}
                </div>
                <div
                  style={{ fontSize: 12, color: 'var(--text-muted)' }}
                >
                  Saved TradeGuard execution record
                </div>
              </div>

              <button
                className="icon-btn"
                aria-label="Close trade details"
                onClick={() => setDrawerTrade(null)}
              >
                <X size={18} />
              </button>
            </div>

            {[
              ['Symbol', drawerTrade.symbol],
              ['Broker', drawerTrade.broker],
              ['Side', drawerTrade.transactionType],
              ['Quantity', drawerTrade.quantity],
              [
                'Execution price',
                getPrice(drawerTrade) == null
                  ? '—'
                  : formatINR(getPrice(drawerTrade)),
              ],
              ['Order type', drawerTrade.orderType],
              ['Segment', drawerTrade.segment || drawerTrade.exchange],
              ['Order ID', drawerTrade.orderId],
              ['Trade ID', drawerTrade.tradeId],
              ['Status', drawerTrade.status],
              [
                'Executed / saved',
                getTradeDate(drawerTrade)
                  ? new Date(getTradeDate(drawerTrade)).toLocaleString('en-GB')
                  : '—',
              ],
            ].map(([label, value]) => (
              <div className="detail-row" key={label}>
                <span className="detail-label">{label}</span>
                <span className="detail-value">{value ?? '—'}</span>
              </div>
            ))}

            <div
              style={{
                marginTop: 20,
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              Realized P&amp;L is not displayed for an individual execution.
              It must be calculated by matching relevant buy and sell fills
              using the selected accounting method.
            </div>
          </div>
        </>
      )}
    </>
  );
}