import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api/api';

export default function ParentSetPassword() {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState('valid'); // valid, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the full token from the URL query
  const query = new URLSearchParams(location.search);
  const token = query.get('token');

  // Extract just the query string part (everything after '?')
  const tokenQuery = token ? (token.split('?')[1] || token) : '';

  // Parse email from the token's query parameters
  const emailFromToken = tokenQuery
    ? new URLSearchParams(tokenQuery).get('email') || ''
    : '';

  // If token is missing entirely, show invalid
  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
        <h2>Invalid or Missing Link</h2>
        <p>No token provided. This link is invalid.</p>
        <p>Please contact the school registrar for assistance.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      setErrorMsg('Passwords do not match');
      return;
    }
    try {
      await API.post(`/parent/set-password?${tokenQuery}`, {
        email: emailFromToken,
        password: password,
        password_confirmation: passwordConfirmation,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.message || 'Invalid or expired link. Please request a new one.');
    }
  };

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Password Set Successfully!</h2>
        <p>You can now log in to your parent account.</p>
        <button onClick={() => navigate('/login')} className="btn-submit">Go to Login</button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
        <h2>Invalid or Expired Link</h2>
        <p>{errorMsg}</p>
        <p>Please contact the school registrar for assistance.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '20px' }}>
      <h2>Set Your Password</h2>
      <p>Email: <strong>{emailFromToken}</strong></p>
      {errorMsg && <div style={{ color: 'red', marginBottom: '10px' }}>{errorMsg}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="form-input"
          style={{ width: '100%', padding: '8px', margin: '5px 0' }}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={passwordConfirmation}
          onChange={e => setPasswordConfirmation(e.target.value)}
          required
          className="form-input"
          style={{ width: '100%', padding: '8px', margin: '5px 0' }}
        />
        <button type="submit" className="btn-submit" style={{ width: '100%', padding: '10px' }}>
          Set Password
        </button>
      </form>
    </div>
  );
}