import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('tg_token');
    const storedUser = localStorage.getItem('tg_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('tg_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('tg_token', data.token);
    const normalizedUser = {
      id: data.user._id || data.user.id,
      userId: data.user._id || data.user.id,
      username: data.user.username,
      email: data.user.email,
    };
    localStorage.setItem('tg_user', JSON.stringify(normalizedUser));
    setToken(data.token);
    setUser(normalizedUser);
    return normalizedUser;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const data = await api.register(username, email, password);
    localStorage.setItem('tg_token', data.token);
    const normalizedUser = {
      id: data.user._id || data.user.id,
      userId: data.user._id || data.user.id,
      username: data.user.username,
      email: data.user.email,
    };
    localStorage.setItem('tg_user', JSON.stringify(normalizedUser));
    setToken(data.token);
    setUser(normalizedUser);
    return normalizedUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tg_token');
    localStorage.removeItem('tg_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}