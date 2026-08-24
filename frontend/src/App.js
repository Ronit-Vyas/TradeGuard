import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LoginPage from './Auth/Login';
import RegisterPage from './Auth/Register';
import HomePage from './Auth/HomePage';
import ForgotPasswordPage from './Auth/ForgotPassword';
import ResetPasswordPage from './Auth/ResetPassword';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/api/users/" element={<LoginPage />} />
          <Route path="/api/users/register" element={<RegisterPage />} />
          <Route path="/api/users/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/api/users/reset-password/:token" element={<ResetPasswordPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;