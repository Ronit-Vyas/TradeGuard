import React, { useState } from 'react';
import { Card, InfoBanner } from '../components/Card';
import { Info, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockBrokerComparison, BROKER_META } from '../data/mockData';

export default function BrokerComparison() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState({
    UPSTOX: true,
    ANGEL_ONE: true,
    DHAN: true,
    KOTAK_NEO: true,
  });

  const rows = mockBrokerComparison.filter((r) => visible[r.broker]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Broker comparison</h1>
        <p className="page-description">
          Compare manually maintained sample values side by side.
        </p>
      </div>

      <InfoBanner icon={Info}>
        Values are illustrative and may not reflect current broker pricing, segments, or API availability.
      </InfoBanner>

      <Card>
        <div className="card-title" style={{ marginBottom: 12 }}>Brokers shown</div>
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          {Object.entries(BROKER_META).map(([key, meta]) => (
            <label className="checkbox" key={key}>
              <input
                type="checkbox"
                checked={visible[key]}
                onChange={(e) => setVisible((v) => ({ ...v, [key]: e.target.checked }))}
              />
              {meta.name}
            </label>
          ))}
        </div>
      </Card>

      <Card padded={false} className="mt-4">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Broker</th>
                <th>Delivery</th>
                <th>Intraday</th>
                <th>Supported segments</th>
                <th>Connection label</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const meta = BROKER_META[r.broker];
                return (
                  <tr key={r.broker}>
                    <td>
                      <div className="text-primary">{meta.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Illustrative</div>
                    </td>
                    <td className="mono">{r.delivery}</td>
                    <td className="mono">{r.intraday}</td>
                    <td>{r.segments}</td>
                    <td>
                      {r.connection === 'Not configured' ? (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => navigate('/app/broker-accounts/new')}
                        >
                          <Link2 size={12} /> Not configured
                        </button>
                      ) : (
                        <span className="badge badge-neutral">
                          <span className="badge-dot" /> {r.connection}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}