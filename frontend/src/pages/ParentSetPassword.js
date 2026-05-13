import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api/api';

export default function ParentSetPassword() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState('loading'); // loading, valid, invalid, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from query string
  const query = new URLSearchParams(location.search);
  const token = query.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMsg('No token provided. This link is invalid.');
      return;
    }
    // Verify the signed token with the backend
    API.get(`/parent/verify-set-password?${token.split('?')[1] || token}`)
      .then(res => {
        setEmail(res.data.email);
        setStatus('valid');
      })
      .catch(err => {
        setStatus('invalid');
        setErrorMsg(err.response?.data?.message || 'Invalid or expired link.');
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      setErrorMsg('Passwords do not match');
      return;
    }
    try {
      // The POST request must include the original signed parameters
      // We'll send the full token as query string
      await API.post(`/parent/set-password?${token.split('?')[1] || token}`, {
        email: email,
        password: password,
        password_confirmation: passwordConfirmation,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.response?.data?.message || 'Failed to set password. Please try again.');
    }
  };

  if (status === 'loading') {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Verifying your link...</div>;
  }

  if (status === 'invalid') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
        <h2>Invalid or Expired Link</h2>
        <p>{errorMsg}</p>
        <p>Please contact the school registrar for assistance.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Password Set Successfully!</h2>
        <p>You can now log in to your parent account.</p>
        <button onClick={() => navigate('/login')} className="btn-submit">Go to Login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '20px' }}>
      <h2>Set Your Password</h2>
      <p>Email: {email}</p>
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