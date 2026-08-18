// pages/HomePage.js - Updated with scroll animations
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './styles/HomePage.css';

const HomePage = () => {
  const animatedRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    animatedRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      animatedRefs.current.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  const addToRefs = (el) => {
    if (el && !animatedRefs.current.includes(el)) {
      animatedRefs.current.push(el);
    }
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="logo">
          <i className="fas fa-shield-alt"></i>
          <h1>TradeGaurd</h1>
        </div>
        <div className="home-actions">
          <span className="btn-outline">
            <i className="fas fa-chart-line"></i> Market
          </span>
          <Link to="/api/users/" className="btn-primary">
            <i className="fas fa-sign-in-alt"></i> Log in
          </Link>
          <Link to="/api/users/register" className="btn-secondary">
            <i className="fas fa-user-plus"></i> Sign up
          </Link>
        </div>
      </div>

      <div className="home-hero">
        <div className="hero-text">
          <div className="scroll-animate" ref={addToRefs}>
            <span className="badge">
              <i className="fas fa-rocket" style={{ marginRight: '6px' }}></i>
              Next-Gen Trading Intelligence
            </span>
          </div>
          
          <div className="scroll-animate delay-1" ref={addToRefs}>
            <h2>
              Risk · Ratios ·<br />
              <span className="highlight">Broker Comparisons</span>
            </h2>
          </div>
          
          <div className="scroll-animate delay-2" ref={addToRefs}>
            <p>
              Insightful P&L analytics, broker-wise benchmarking and real-time risk metrics — 
              all in one professional cockpit.
            </p>
          </div>
          
          <div className="hero-stats scroll-animate delay-3" ref={addToRefs}>
            <div className="stat-item">
              <span className="num">4.2 <span className="trend">↑</span></span>
              <span className="label">avg P/L ratio</span>
            </div>
            <div className="stat-item">
              <span className="num">12</span>
              <span className="label">brokers</span>
            </div>
            <div className="stat-item">
              <span className="num">87%</span>
              <span className="label">risk efficiency</span>
            </div>
          </div>
        </div>

        <div className="hero-graphic scroll-animate-right delay-2" ref={addToRefs}>
          <div className="graphic-title">
            <i className="fas fa-arrow-trend-up" style={{ marginRight: '8px' }}></i>
            Top Performers
          </div>
          
          <div className="broker-grid">
            <div className="broker-card">
              <div className="icon"><i className="fas fa-university"></i></div>
              <div className="info">
                <div className="name">Zerodha</div>
                <span className="change positive">+2.3%</span>
              </div>
            </div>
            <div className="broker-card">
              <div className="icon"><i className="fas fa-building"></i></div>
              <div className="info">
                <div className="name">Groww</div>
                <span className="change positive">+1.8%</span>
              </div>
            </div>
            <div className="broker-card">
              <div className="icon"><i className="fas fa-chart-simple"></i></div>
              <div className="info">
                <div className="name">Angel One</div>
                <span className="change positive">+1.2%</span>
              </div>
            </div>
            <div className="broker-card">
              <div className="icon"><i className="fas fa-arrow-trend-down"></i></div>
              <div className="info">
                <div className="name">Upstox</div>
                <span className="change negative">-0.4%</span>
              </div>
            </div>
          </div>

          <div className="graphic-footer">
            <span className="pill">
              <i className="fas fa-arrow-right"></i> 5 more brokers
            </span>
            <span style={{ color: '#6e94ad', fontSize: '0.8rem' }}>
              <i className="fas fa-rotate-right" style={{ marginRight: '4px' }}></i>
              updated now
            </span>
          </div>
        </div>
      </div>

      {/* Additional content to demonstrate scroll animations */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem',
        padding: '2rem 0',
        marginTop: '2rem'
      }}>
        <div className="scroll-animate-scale delay-1" ref={addToRefs} style={{
          background: 'rgba(14, 22, 28, 0.5)',
          padding: '2rem',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255,255,255,0.03)'
        }}>
          <i className="fas fa-shield" style={{ fontSize: '2rem', color: '#5fc3e4', marginBottom: '1rem' }}></i>
          <h3 style={{ color: '#e0ecf5', marginBottom: '0.5rem' }}>Risk Management</h3>
          <p style={{ color: '#93b3ca', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Real-time risk assessment with advanced analytics and predictive modeling.
          </p>
        </div>

        <div className="scroll-animate-scale delay-2" ref={addToRefs} style={{
          background: 'rgba(14, 22, 28, 0.5)',
          padding: '2rem',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255,255,255,0.03)'
        }}>
          <i className="fas fa-scale-balanced" style={{ fontSize: '2rem', color: '#5fc3e4', marginBottom: '1rem' }}></i>
          <h3 style={{ color: '#e0ecf5', marginBottom: '0.5rem' }}>P&L Ratios</h3>
          <p style={{ color: '#93b3ca', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Track profit/loss ratios across multiple timeframes and trading strategies.
          </p>
        </div>

        <div className="scroll-animate-scale delay-3" ref={addToRefs} style={{
          background: 'rgba(14, 22, 28, 0.5)',
          padding: '2rem',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255,255,255,0.03)'
        }}>
          <i className="fas fa-arrow-left-arrow-right" style={{ fontSize: '2rem', color: '#5fc3e4', marginBottom: '1rem' }}></i>
          <h3 style={{ color: '#e0ecf5', marginBottom: '0.5rem' }}>Broker Insights</h3>
          <p style={{ color: '#93b3ca', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Compare broker performance and make data-driven decisions with confidence.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;