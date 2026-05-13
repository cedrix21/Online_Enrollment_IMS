import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaMoneyBill, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import './ParentDashboard.css';   // we'll provide the CSS next

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);   // track which card is open
  const [profiles, setProfiles] = useState({});          // cached profiles by primary key
  const [ledgers, setLedgers] = useState({});            // cached ledgers by primary key
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'parent') {
      navigate('/login');
      return;
    }
    fetchChildren();
  }, [navigate]);

  const fetchChildren = async () => {
    try {
      const res = await API.get('/parent/children');
      setChildren(res.data);
    } catch (err) {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle a child card – fetch data on first expand
  const toggleChild = async (child) => {
    const childId = child.id;                // primary key
    if (expandedId === childId) {
      setExpandedId(null);                   // collapse
      return;
    }
    setExpandedId(childId);

    // Fetch profile if not yet cached
    if (!profiles[childId]) {
      try {
        const profileRes = await API.get(`/parent/children/${child.student_id}/profile`);
        setProfiles(prev => ({ ...prev, [childId]: profileRes.data }));
      } catch (err) {
        console.error('Error fetching profile', err);
      }
    }

    // Fetch ledger if not yet cached
    if (!ledgers[childId]) {
      try {
        const ledgerRes = await API.get(`/parent/children/${childId}/ledger`);
        setLedgers(prev => ({ ...prev, [childId]: ledgerRes.data }));
      } catch (err) {
        console.error('Error fetching ledger', err);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="parent-dashboard">
      <header className="dashboard-header">
        <h1>Parent Dashboard</h1>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </header>

      <div className="dashboard-content">
        <h2>Your Children</h2>

        {error && <div className="alert alert-error">{error}</div>}

        {children.length === 0 ? (
          <p className="no-students">No linked students found. Please contact the registrar if this is unexpected.</p>
        ) : (
          <div className="children-grid">
            {children.map(child => {
              const isOpen = expandedId === child.id;
              const profile = profiles[child.id] || {};
              const ledger = ledgers[child.id];

              return (
                <div key={child.id} className={`child-card ${isOpen ? 'expanded' : ''}`}>
                  {/* Summary (always visible) */}
                  <div className="card-summary" onClick={() => toggleChild(child)}>
                    <div className="summary-text">
                      <h3>{child.last_name}, {child.first_name}</h3>
                      <p>{child.grade_level} · {child.section}</p>
                      <p className="school-year">{child.school_year}</p>
                    </div>
                    <button className="expand-btn">
                      {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>

                  {/* Expanded details (peekaboo) */}
                  {isOpen && (
                    <div className="card-details">
                      <div className="detail-section profile-section">
                        <h3><FaUserCircle /> Student Profile</h3>
                        <p><strong>Student ID:</strong> {profile.studentId ?? child.student_id}</p>
                        <p><strong>Name:</strong> {profile.lastName ?? child.last_name}, {profile.firstName ?? child.first_name} {profile.middleName || ''}</p>
                        <p><strong>Grade:</strong> {profile.gradeLevel ?? child.grade_level}</p>
                        <p><strong>Section:</strong> {profile.section ?? child.section}</p>
                        <p><strong>Gender:</strong> {profile.gender}</p>
                        <p><strong>Date of Birth:</strong> {profile.dateOfBirth}</p>
                        <p><strong>LRN:</strong> {profile.lrn || '—'}</p>
                      </div>
                      <div className="detail-section ledger-section">
                        <h3><FaMoneyBill /> Payment Ledger</h3>
                        {ledger && ledger.summary ? (
                          <table className="ledger-table">
                            <thead>
                              <tr><th>Description</th><th>Amount</th></tr>
                            </thead>
                            <tbody>
                              <tr><td><strong>Total Tuition</strong></td><td>₱{(ledger.summary.total_tuition || 0).toLocaleString()}</td></tr>
                              {ledger.summary.discount_percent > 0 && (
                                <tr><td>Discount ({ledger.summary.discount_percent}%)</td><td>-₱{(ledger.summary.discount_amount || 0).toLocaleString()}</td></tr>
                              )}
                              <tr><td>Total Paid</td><td>₱{(ledger.summary.total_paid || 0).toLocaleString()}</td></tr>
                              <tr className="total-row"><td>Remaining Balance</td><td style={{ color: ledger.summary.balance > 0 ? 'red' : 'green' }}>₱{(ledger.summary.balance || 0).toLocaleString()}</td></tr>
                            </tbody>
                          </table>
                        ) : ledger === null ? (
                          <p>No ledger data available or failed to load.</p>
                        ) : (
                          <p>Loading ledger...</p>
                        )}
                        {ledger?.summary?.books && (
                          <div className="books-section">
                            <strong>📚 Books</strong>
                            <table className="ledger-table">
                              <tbody>
                                <tr><td>Book Fee</td><td>₱{(ledger.summary.books.total || 0).toLocaleString()}</td></tr>
                                <tr><td>Books Paid</td><td>₱{(ledger.summary.books.paid || 0).toLocaleString()}</td></tr>
                                <tr className="total-row"><td>Book Balance</td><td style={{ color: ledger.summary.books.balance > 0 ? 'red' : 'green' }}>₱{(ledger.summary.books.balance || 0).toLocaleString()}</td></tr>
                              </tbody>
                            </table>
                            <p className="status-text">Status: {ledger.summary.books.status}</p>
                          </div>
                        )}
                        {ledger?.summary && (
                          <p className="overall-status">Overall Status: <strong>{ledger.summary.status}</strong></p>
                        )}

                        {/* ── Transaction History ── */}
                        {ledger && ledger.ledger && ledger.ledger.length > 0 && (
                          <div className="history-section" style={{ marginTop: '20px' }}>
                            <h4 style={{ marginBottom: '10px', color: '#b8860b' }}>📋 Payment History</h4>
                            <table className="ledger-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Method</th>
                                  <th>Amount</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ledger.ledger
                                  .filter(p => p.payment_status !== 'pending')   // optional: show only completed/paid
                                  .map(payment => (
                                    <tr key={payment.id}>
                                      <td>{payment.payment_date?.split('T')[0] || '—'}</td>
                                      <td>{payment.paymentMethod || '—'}</td>
                                      <td>₱{(payment.amount_paid || 0).toLocaleString()}</td>
                                      <td style={{ color: payment.payment_status === 'paid' ? 'green' : 'orange' }}>
                                        {payment.payment_status}
                                      </td>
                                    </tr>
                                  ))
                                }
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}