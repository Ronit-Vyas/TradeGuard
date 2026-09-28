const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem('tg_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/api/users', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (username, email, password) =>
    request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  forgotPassword: (email) =>
    request('/api/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, newPassword) =>
    request('/api/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

  // Broker accounts
  listBrokerAccounts: (userId) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request(`/api/broker-accounts${qs}`);
  },

  getBrokerAccount: (id) => request(`/api/broker-accounts/${id}`),

  createBrokerAccount: (payload) =>
    request('/api/broker-accounts', { method: 'POST', body: JSON.stringify(payload) }),

  updateBrokerAccount: (id, payload) =>
    request(`/api/broker-accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deleteBrokerAccount: (id) =>
    request(`/api/broker-accounts/${id}`, { method: 'DELETE' }),
};

export { ApiError };