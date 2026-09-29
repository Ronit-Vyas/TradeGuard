import React, { useEffect, useState } from 'react';
import { Card, InfoBanner } from '../components/Card';
import { Info } from 'lucide-react';
import { api } from '../api/client';
import { BROKER_META } from '../data/mockData';

export default function Charges() {
  const [broker, setBroker] = useState('UPSTOX');
  const [productType, setProductType] = useState('Equity intraday');
  const [buyPrice, setBuyPrice] = useState(125);
  const [sellPrice, setSellPrice] = useState(132.5);
  const [quantity, setQuantity] = useState(50);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function calculate() {
      setLoading(true);
      setError('');
      try {
        const response = await api.calculateCharges({
          broker,
          productType,
          buyPrice: Number(buyPrice),
          sellPrice: Number(sellPrice),
          quantity: Number(quantity),
        });
        if (active) {
          setResult(response?.data || null);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to calculate charges');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    const timeout = setTimeout(calculate, 300);
    return () => { active = false; clearTimeout(timeout); };
  }, [broker, productType, buyPrice, sellPrice, quantity]);

  const formatINR = (n) =>
    '₹' + Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Charges calculator</h1>
        <p className="page-description">Estimate the impact of fees on a hypothetical trade.</p>
      </div>

      <InfoBanner icon={Info}>
        Estimates use the selected broker's configured rates and applicable turnover/premium basis. Confirm current rates with your broker.
      </InfoBanner>

      {error && (
        <div className="info-banner" role="alert">
          Could not calculate charges: {error}
        </div>
      )}

      <div className="grid-2">
        <Card title="Trade inputs" subtitle="Enter hypothetical order values">
          <div className="form-group">
            <label className="form-label">Broker</label>
            <select className="form-select" value={broker} onChange={(e) => setBroker(e.target.value)}>
              {Object.entries(BROKER_META).map(([k, m]) => (
                <option key={k} value={k}>{m.name}</option>
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
              <label className="form-label">Buy price</label>
              <input type="number" className="form-input" value={buyPrice} onChange={(e) => setBuyPrice(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Sell price</label>
              <input type="number" className="form-input" value={sellPrice} onChange={(e) => setSellPrice(Number(e.target.value))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input type="number" className="form-input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
        </Card>

        <Card title="Estimated breakdown" subtitle="Calculated by TradeGuard backend">
          {loading && !result ? (
            <p>Calculating…</p>
          ) : result ? (
            <>
              <div className="detail-row">
                <span className="detail-label">Brokerage</span>
                <span className="detail-value mono">{formatINR(result.brokerage)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">STT</span>
                <span className="detail-value mono">{formatINR(result.stt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Exchange charges</span>
                <span className="detail-value mono">{formatINR(result.exchangeCharges)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">SEBI charges</span>
                <span className="detail-value mono">{formatINR(result.sebiCharges)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">DP charges</span>
                <span className="detail-value mono">{formatINR(result.dpCharges)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">GST</span>
                <span className="detail-value mono">{formatINR(result.gst)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Stamp duty</span>
                <span className="detail-value mono">{formatINR(result.stampDuty)}</span>
              </div>
              <div className="detail-row" style={{ borderTop: '2px solid var(--border)', borderBottom: 'none', marginTop: 8, paddingTop: 14 }}>
                <span className="detail-label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  Total estimated charges
                </span>
                <span className="detail-value mono" style={{ color: 'var(--danger)' }}>
                  {formatINR(result.totalCharges)}
                </span>
              </div>

              <div className="grid-2" style={{ marginTop: 20 }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Gross P&L</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: result.grossPnL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {result.grossPnL >= 0 ? '+' : '-'}{formatINR(result.grossPnL)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Estimated net P&L</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: result.netPnL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {result.netPnL >= 0 ? '+' : '-'}{formatINR(result.netPnL)}
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
  );
}
