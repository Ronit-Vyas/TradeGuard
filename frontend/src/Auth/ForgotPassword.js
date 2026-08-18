// pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './styles/ForgotPassword.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Simulate API call - replace with actual endpoint
      const response = await fetch('http://localhost:5001/api/users/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      console.log(data)
      if (!response.ok) {
        setError(data.message || 'Something went wrong. Please try again.');
        setIsLoading(false);
        return;
      }

      // Show success state
      setIsSubmitted(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setError('Network error. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page forgot-password-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo">
            <i className="fas fa-shield-alt"></i>
            <h1>TradeGaurd</h1>
          </div>
          <h2>Forgot Password</h2>
          <p className="auth-subtitle">
            {!isSubmitted 
              ? "Enter your email address and we'll send you a reset link"
              : "Check your email for the reset link"}
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary btn-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i> Send Reset Link
                </>
              )}
            </button>

            <div className="auth-footer">
              <p>
                <Link to="/api/users/" className="auth-link">
                  <i className="fas fa-arrow-left"></i> Back to Sign In
                </Link>
              </p>
            </div>
          </form>
        ) : (
          <div className="success-container">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h3>Email Sent!</h3>
            <p className="success-message">
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your inbox and follow the instructions.
            </p>
            <div className="success-actions">
              <Link to="/api/users/" className="btn-primary btn-full">
                <i className="fas fa-sign-in-alt"></i> Back to Sign In
              </Link>
              <button 
                className="btn-secondary btn-full" 
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                style={{ marginTop: '0.8rem' }}
              >
                <i className="fas fa-redo"></i> Try Another Email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;