import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaMoneyBill, FaFileInvoice, FaGraduationCap } from 'react-icons/fa';

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChild, setSelectedChild] = useState(null);
  const [ledger, setLedger] = useState(null);
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

  const handleViewProfile = async (child) => {
    setSelectedChild(child);
    // Fetch full profile
    try {
      const profileRes = await API.get(`/parent/children/${child.student_id}/profile`);
      setSelectedChild(prev => ({ ...prev, ...profileRes.data }));
    } catch (err) {
      console.error(err);
    }
    // Fetch ledger
    try {
      const ledgerRes = await API.get(`/parent/children/${child.student_id}/ledger`);
      setLedger(ledgerRes.data);
    } catch (err) {
      setLedger(null);
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
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: '#b8860b', color: 'white' }}>
        <h1>Parent Dashboard</h1>
        <button onClick={handleLogout} className="btn-logout" style={{ background: '#fff', color: '#b8860b', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
      </header>

      <div style={{ padding: '20px' }}>
        <h2>Your Children</h2>
        {children.length === 0 ? (
          <p>No linked students found. If you believe this is an error, please contact the registrar.</p>
        ) : (
          <div className="children-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {children.map(child => (
              <div key={child.id} className="child-card" style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', cursor: 'pointer' }} onClick={() => handleViewProfile(child)}>
                <h3>{child.last_name}, {child.first_name}</h3>
                <p>Grade: {child.grade_level}</p>
                <p>Section: {child.section}</p>
                <p>School Year: {child.school_year}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal/section */}
      {selectedChild && (
        <div className="child-detail" style={{ padding: '20px', background: '#f8fafc', marginTop: '20px' }}>
          <h2>{selectedChild.last_name}, {selectedChild.first_name} - Details</h2>
          <button onClick={() => { setSelectedChild(null); setLedger(null); }} style={{ marginBottom: '10px', background: '#ccc', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Close</button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h3><FaUserCircle /> Student Profile</h3>
                <p><strong>Student ID:</strong> {selectedChild.studentId ?? selectedChild.student_id}</p>
                <p><strong>Name:</strong> {selectedChild.lastName}, {selectedChild.firstName} {selectedChild.middleName || ''}</p>
                <p><strong>Grade:</strong> {selectedChild.gradeLevel}</p>
                <p><strong>Section:</strong> {selectedChild.section}</p>
                <p><strong>Gender:</strong> {selectedChild.gender}</p>
                <p><strong>Date of Birth:</strong> {selectedChild.dateOfBirth}</p>
                <p><strong>LRN:</strong> {selectedChild.lrn || '—'}</p>
            </div>
            <div>
                <h3><FaMoneyBill /> Payment Ledger</h3>
                {ledger && ledger.summary ? (
                    <>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr><th>Description</th><th>Amount</th></tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td><strong>Total Tuition</strong></td>
                            <td>₱{(ledger.summary.total_tuition || 0).toLocaleString()}</td>
                        </tr>
                        {ledger.summary.discount_percent > 0 && (
                            <tr>
                            <td>Discount ({ledger.summary.discount_percent}%)</td>
                            <td>-₱{(ledger.summary.discount_amount || 0).toLocaleString()}</td>
                            </tr>
                        )}
                        <tr>
                            <td>Total Paid</td>
                            <td>₱{(ledger.summary.total_paid || 0).toLocaleString()}</td>
                        </tr>
                        <tr style={{ fontWeight: 'bold', borderTop: '2px solid #ccc' }}>
                            <td>Remaining Balance</td>
                            <td style={{ color: ledger.summary.balance > 0 ? 'red' : 'green' }}>
                            ₱{(ledger.summary.balance || 0).toLocaleString()}
                            </td>
                        </tr>
                        </tbody>
                    </table>

                    {ledger.summary.books && (
                        <div style={{ marginTop: '15px' }}>
                        <strong>📚 Books</strong>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '5px' }}>
                            <tbody>
                            <tr><td>Book Fee</td><td>₱{(ledger.summary.books.total || 0).toLocaleString()}</td></tr>
                            <tr><td>Books Paid</td><td>₱{(ledger.summary.books.paid || 0).toLocaleString()}</td></tr>
                            <tr style={{ fontWeight: 'bold' }}><td>Book Balance</td><td style={{ color: ledger.summary.books.balance > 0 ? 'red' : 'green' }}>₱{(ledger.summary.books.balance || 0).toLocaleString()}</td></tr>
                            </tbody>
                        </table>
                        <p style={{ fontSize: '0.85rem', color: '#666' }}>Status: {ledger.summary.books.status}</p>
                        </div>
                    )}

                    <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                        Overall Status: <strong>{ledger.summary.status}</strong>
                    </p>
                    </>
                ) : (
                    <p>No ledger data available or failed to load.</p>
                )}
                </div>
          </div>
        </div>
      )}
    </div>
  );
}