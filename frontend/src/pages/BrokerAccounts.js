import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, MoreHorizontal, Link2, AlertTriangle } from 'lucide-react';
import { Card, InfoBanner } from '../components/Card';
import { useToast } from '../components/Toast';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BROKER_META } from '../data/mockData';

export default function BrokerAccounts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncingId, setSyncingId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.listBrokerAccounts(user?.userId);
      // handle { data: [...] } or [...]
      const list = Array.isArray(data) ? data : data.data || [];
      setAccounts(list);
    } catch (err) {
      setError(err.message || 'Failed to load broker accounts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  async function handleSync(id) {
    setSyncingId(id);
    try {
      const now = new Date();
      const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const startDate = `${currentYear}-04-01`;
      const endDate = `${currentYear + 1}-03-31`;

      const response = await api.syncBrokerTrades(id, { startDate, endDate });
      const data = response?.data;
      if (data) {
        toast.push(
          `Sync complete — ${data.inserted || 0} new, ${data.updated || 0} updated, ${data.skipped || 0} skipped`,
          'success'
        );
      } else {
        toast.push('Sync complete', 'success');
      }
      await load();
    } catch (err) {
      toast.push(err.message || 'Failed to sync trades', 'error');
    } finally {
      setSyncingId(null);
    }
  }

  async function handleConnect(id) {
    setSyncingId(id);
    try {
      await api.updateBrokerAccount(id, { isConnected: true, lastConnectedAt: new Date().toISOString() });
      toast.push('Broker account connected', 'success');
      await load();
    } catch (err) {
      toast.push(err.message || 'Failed to connect', 'error');
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Broker accounts</h1>
          <p className="page-description">Review and manage demo broker connections.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/app/broker-accounts/new')}>
          <Link2 size={15} /> Connect broker
        </button>
      </div>

      <InfoBanner icon={AlertTriangle}>
        Connection states and sync times are illustrative. No broker credentials are used.
      </InfoBanner>

      {loading && (
        <div className="broker-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="broker-card">
              <div className="skeleton" style={{ height: 40, width: 40, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 12, width: '40%' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <Card>
          <div className="empty-state">
            <AlertTriangle size={32} />
            <h3>Could not load broker accounts</h3>
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={load}>
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        </Card>
      )}

      {!loading && !error && accounts.length === 0 && (
        <Card>
          <div className="empty-state">
            <Link2 size={32} />
            <h3>No broker accounts yet</h3>
            <p>Connect a broker account to start tracking your trades.</p>
            <button className="btn btn-primary" onClick={() => navigate('/app/broker-accounts/new')}>
              <Plus size={15} /> Add broker account
            </button>
          </div>
        </Card>
      )}

      {!loading && !error && accounts.length > 0 && (
        <div className="broker-grid">
          {accounts.map((acc) => {
            const meta = BROKER_META[acc.broker] || { name: acc.broker, short: '?', color: '#666' };
            const connected = acc.isConnected;
            const actionNeeded = !acc.isActive;
            const syncing = syncingId === acc._id;

            return (
              <div className="broker-card" key={acc._id}>
                <div className="broker-card-header">
                  <div
                    className="broker-avatar"
                    style={{ color: meta.color, borderColor: meta.color + '40' }}
                  >
                    {meta.short}
                  </div>
                  <button className="icon-btn" onClick={() => navigate(`/app/broker-accounts/${acc._id}/edit`)}>
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                <div className="broker-name">{meta.name}</div>
                <div style={{ marginTop: 6 }}>
                  {!acc.isActive ? (
                    <span className="badge badge-warning">
                      <span className="badge-dot" /> Action needed
                    </span>
                  ) : connected ? (
                    <span className="badge badge-success">
                      <span className="badge-dot" /> Connected
                    </span>
                  ) : (
                    <span className="badge badge-neutral">
                      <span className="badge-dot" /> Not connected
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="broker-meta">
                    <span>Account</span>
                    <span className="mono">
                      {acc.credentials?.clientId
                        ? `•••• ${String(acc.credentials.clientId).slice(-4)}`
                        : '—'}
                    </span>
                  </div>
                  <div className="broker-meta">
                    <span>Last sync</span>
                    <span>
                      {acc.lastConnectedAt
                        ? new Date(acc.lastConnectedAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="broker-actions">
                  <button
                    className={`btn ${actionNeeded || !connected ? 'btn-primary' : 'btn-secondary'} w-full`}
                    onClick={() => connected ? handleSync(acc._id) : handleConnect(acc._id)}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <><span className="spinner" /> Connecting…</>
                    ) : connected ? (
                      <><RefreshCw size={14} /> Sync trades</>
                    ) : (
                      <><Link2 size={14} /> Connect</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}