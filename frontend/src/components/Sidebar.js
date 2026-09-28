import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Wallet, ArrowLeftRight, BarChart3,
  Receipt, AlertTriangle, FileText, GitCompare, Settings, X, ChevronLeft,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/app/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/app/broker-accounts', label: 'Broker Accounts', icon: Wallet },
  { to: '/app/trades', label: 'Trades', icon: ArrowLeftRight },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/charges', label: 'Charges', icon: Receipt },
  { to: '/app/risk', label: 'Risk Management', icon: AlertTriangle },
  { to: '/app/reports', label: 'Reports', icon: FileText },
  { to: '/app/broker-comparison', label: 'Broker Comparison', icon: GitCompare },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Shield size={18} />
        </div>
        {!collapsed && <div className="sidebar-title">TradeGuard</div>}
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button className="collapse-btn" onClick={onToggle}>
          {collapsed ? <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} /> : <X size={16} />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );
}