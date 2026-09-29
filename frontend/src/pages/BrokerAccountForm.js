import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Card } from '../components/Card';
import { useToast } from '../components/Toast';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BROKER_META } from '../data/mockData';

export default function BrokerAccountForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    broker: 'UPSTOX',
    clientId: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    refreshToken: '',
    tokenExpiresAt: '',
    isActive: true,
  });
  const [show, setShow] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;

    let active = true;

    async function loadAccount() {
      setFetching(true);
      try {
        const response = await api.getBrokerAccount(id);
        if (active) {
          const acc = response?.data || response;
          setForm((f) => ({
            ...f,
            broker: acc.broker || f.broker,
            clientId: acc.credentials?.clientId || '',
            isActive: acc.isActive ?? true,
            // Sensitive fields are never returned by the API — leave blank
            apiKey: '',
            apiSecret: '',
            accessToken: '',
            refreshToken: '',
            tokenExpiresAt: '',
          }));
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load account');
        }
      } finally {
        if (active) setFetching(false);
      }
    }

    loadAccount();
    return () => { active = false; };
  }, [id, isEdit]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.broker || !form.clientId) {
      setError('Broker and client ID are required');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const payload = {
          broker: form.broker,
          isActive: form.isActive,
          credentials: { clientId: form.clientId },
        };
        if (form.apiKey) payload.credentials.apiKey = form.apiKey;
        if (form.apiSecret) payload.credentials.apiSecret = form.apiSecret;
        if (form.accessToken) payload.credentials.accessToken = form.accessToken;
        if (form.refreshToken) payload.credentials.refreshToken = form.refreshToken;
        if (form.tokenExpiresAt) payload.credentials.tokenExpiresAt = form.tokenExpiresAt;
        await api.updateBrokerAccount(id, payload);
        toast.push('Broker account updated', 'success');
      } else {
        const payload = {
          userId: user?.id,
          broker: form.broker,
          credentials: { clientId: form.clientId },
        };
        if (form.apiKey) payload.credentials.apiKey = form.apiKey;
        if (form.apiSecret) payload.credentials.apiSecret = form.apiSecret;
        if (form.accessToken) payload.credentials.accessToken = form.accessToken;
        if (form.refreshToken) payload.credentials.refreshToken = form.refreshToken;
        if (form.tokenExpiresAt) payload.credentials.tokenExpiresAt = form.tokenExpiresAt;
        await api.createBrokerAccount(payload);
        toast.push('Broker account created successfully', 'success');
      }
      navigate('/app/broker-accounts');
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  function SecretField({ name, label, placeholder }) {
    return (
      <div className="form-group">
        <label className="form-label">{label}</label>
        <div className="input-with-icon">
          <input
            type={show[name] ? 'text' : 'password'}
            className="form-input"
            placeholder={placeholder}
            value={form[name]}
            onChange={(e) => update(name, e.target.value)}
          />
          <button
            type="button"
            className="input-icon-btn"
            onClick={() => setShow((s) => ({ ...s, [name]: !s[name] }))}
          >
            {show[name] ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
    );
  }

  if (fetching) {
    return (
      <>
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="page-title">Edit broker account</h1>
        </div>
        <Card>
          <p>Loading account data…</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="page-title">{isEdit ? 'Edit broker account' : 'Connect broker account'}</h1>
        <p className="page-description">
          {isEdit
            ? 'Update credentials and connection status. Leave credential fields blank to keep existing values.'
            : 'Add a new broker account. Credentials are write-only and never returned by the API.'}
        </p>
      </div>

      <Card>
        <form onSubmit={onSubmit} style={{ maxWidth: 640 }}>
          <div className="form-group">
            <label className="form-label">Broker</label>
            <select
              className="form-select"
              value={form.broker}
              onChange={(e) => update('broker', e.target.value)}
              disabled={isEdit}
            >
              {Object.entries(BROKER_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Client ID *</label>
            <input
              className="form-input"
              placeholder="e.g. AB123456"
              value={form.clientId}
              onChange={(e) => update('clientId', e.target.value)}
            />
          </div>

          <SecretField name="apiKey" label="API key" placeholder="Optional" />
          <SecretField name="apiSecret" label="API secret" placeholder="Optional" />
          <SecretField name="accessToken" label="Access token" placeholder="Optional" />
          <SecretField name="refreshToken" label="Refresh token" placeholder="Optional" />

          <div className="form-group">
            <label className="form-label">Token expires at</label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.tokenExpiresAt}
              onChange={(e) => update('tokenExpiresAt', e.target.value)}
            />
          </div>

          {isEdit && (
            <div className="form-group">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => update('isActive', e.target.checked)}
                />
                Account active
              </label>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : isEdit ? 'Save changes' : 'Create account'}
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}
