import React, { useMemo, useState } from 'react';
import { Card, InfoBanner } from '../components/Card';
import { Info } from 'lucide-react';
import { BROKER_META } from '../data/mockData';

function calculateCharges({ broker, productType, buyPrice, sellPrice, quantity }) {
  const turnover = (buyPrice + sellPrice) * quantity;
  const brokerage = 20; // flat per order sample

  let stt = 0;
  if (productType === 'Equity intraday') stt = sellPrice * quantity * 0.00025;
  else if (productType === 'Equity delivery') stt = (buyPrice + sellPrice) * quantity * 0.001;
  else stt = sellPrice * quantity * 0.000625;

  const exchange = turnover * 0.0000322;
  const gst = (brokerage + exchange) * 0.18;
  const stamp = buyPrice * quantity * 0.00003;
  const total = brokerage + stt + exchange + gst + stamp;

  const grossPnl = (sellPrice - buyPrice) * quantity;
  const netPnl = grossPnl - total;

  return { brokerage, stt, exchange, gst, stamp, total, grossPnl, netPnl };
}

export default function Charges() {
  const [broker, setBroker] = useState('UPSTOX');
  const [productType, setProductType] = useState('Equity intraday');
  const [buyPrice, setBuyPrice] = useState(125000);
  const [sellPrice, setSellPrice] = useState(132500);
  const [quantity, setQuantity] = useState(50);

  const result = useMemo(
    () => calculateCharges({ broker, productType, buyPrice, sellPrice, quantity }),
    [broker, productType, buyPrice, sellPrice, quantity]
  );

  const formatINR = (n) =>
    '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Charges calculator</h1>
        <p className="page-description">Estimate the impact of fees on a hypothetical trade.</p>
      </div>

      <InfoBanner icon={Info}>
        All rates and results are sample estimates, not broker quotes or tax advice.
      </InfoBanner>

      <div className="grid-2">
        <Card title="Trade inputs" subtitle="Enter hypothetical order values">
          <div className="form-group">
            <label className="form-label">Broker</label>
            <select className="form-select" value={broker} onChange={(e) => setBroker(e.target.value)}>
              {Object.entries(BROKER_META).map(([k, m]) => (
                <option key={k} value={k}>{m.name} — sample rate</option>
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

        <Card title="Estimated breakdown" subtitle="Calculated instantly from sample rates">
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
            <span className="detail-value mono">{formatINR(result.exchange)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">GST</span>
            <span className="detail-value mono">{formatINR(result.gst)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Stamp duty</span>
            <span className="detail-value mono">{formatINR(result.stamp)}</span>
          </div>
          <div className="detail-row" style={{ borderTop: '2px solid var(--border)', borderBottom: 'none', marginTop: 8, paddingTop: 14 }}>
            <span className="detail-label" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              Total estimated charges
            </span>
            <span className="detail-value mono" style={{ color: 'var(--danger)' }}>
              {formatINR(result.total)}
            </span>
          </div>

          <div className="grid-2" style={{ marginTop: 20 }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Gross P&L</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: result.grossPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {result.grossPnl >= 0 ? '+' : '-'}{formatINR(result.grossPnl)}
              </div>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Estimated net P&L</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: result.netPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {result.netPnl >= 0 ? '+' : '-'}{formatINR(result.netPnl)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}