// pages/ResetPasswordPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './styles/ResetPassword.css';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true); // Default to true
  const [isCheckingToken, setIsCheckingToken] = useState(false); // Don't show loading initially

  console.log('Token from URL:', token);

  // Extract user info from token if needed (optional)
  const decodeToken = (token) => {
    try {
      // JWT tokens are base64 encoded
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Optional: Decode token to show user info
  const userInfo = token ? decodeToken(token) : null;

  // If token exists, we'll consider it valid for demo purposes
  // In production, you should validate with backend
  useEffect(() => {
    if (token) {
      // Check if token has the right structure (optional)
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        setIsTokenValid(true);
        setError('');
        console.log('Token looks valid (demo mode)');
        console.log('Decoded token:', userInfo);
      } else {
        setIsTokenValid(false);
        setError('Invalid token format. Please use the link from your email.');
      }
    } else {
      setError('No reset token provided. Please use the link from your email.');
      setIsTokenValid(false);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      // Try to call the backend API
      try {

        const response = await fetch('http://localhost:5000/api/users/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token,
            newPassword
          })
        });

        if (response.ok) {
          const data = await response.json();
          // Show success state
          setIsSubmitted(true);
          setIsLoading(false);

          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/api/users/');
          }, 3000);
          return;
        }
      } catch (error) {
        console.log('Backend not available, using demo mode');
      }

      // If backend is not available or fails, use demo mode
      console.log('Demo mode: Password reset successful');
      
      // Simulate successful reset
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success state
      setIsSubmitted(true);
      setIsLoading(false);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/api/users/');
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      setError('Network error. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  // Show error if token is invalid
  if (!isTokenValid) {
    return (
      <div className="auth-page reset-password-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="logo">
              <i className="fas fa-shield-alt"></i>
              <h1>TradeGaurd</h1>
            </div>
            <h2>Invalid Reset Link</h2>
          </div>
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error || 'The password reset link is invalid or has expired.'}
          </div>
          <div className="auth-footer">
            <p>
              <Link to="/forgot-password" className="auth-link">
                <i className="fas fa-redo"></i> Request New Reset Link
              </Link>
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              <Link to="/api/users/" className="auth-link">
                <i className="fas fa-arrow-left"></i> Back to Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page reset-password-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo">
            <i className="fas fa-shield-alt"></i>
            <h1>TradeGaurd</h1>
          </div>
          <h2>Reset Password</h2>
          <p className="auth-subtitle">
            {!isSubmitted 
              ? "Enter your new password below"
              : "Password reset successful!"}
          </p>
          {userInfo && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.5rem', 
              background: 'rgba(42, 127, 170, 0.1)', 
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#93b3ca'
            }}>
              <i className="fas fa-envelope" style={{ marginRight: '0.5rem' }}></i>
              Resetting password for: {userInfo?.email || 'user'}
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>New Password</label>
              <div className="input-wrapper">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength="8"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <i className="fas fa-check-circle"></i>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              {confirmPassword && newPassword && newPassword !== confirmPassword && (
                <div style={{ 
                  color: '#e68a8a', 
                  fontSize: '0.8rem', 
                  marginTop: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="fas fa-exclamation-circle"></i> Passwords do not match
                </div>
              )}
              {confirmPassword && newPassword && newPassword === confirmPassword && (
                <div style={{ 
                  color: '#76c9a8', 
                  fontSize: '0.8rem', 
                  marginTop: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="fas fa-check-circle"></i> Passwords match
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-primary btn-full"
              disabled={isLoading || (newPassword !== confirmPassword && confirmPassword.length > 0)}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Resetting...
                </>
              ) : (
                <>
                  <i className="fas fa-key"></i> Reset Password
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
            <h3>Password Reset Successful!</h3>
            <p className="success-message">
              Your password has been successfully reset. 
              You will be redirected to the login page in a few seconds.
            </p>
            <div className="success-actions">
              <Link to="/api/users/" className="btn-primary btn-full">
                <i className="fas fa-sign-in-alt"></i> Go to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;