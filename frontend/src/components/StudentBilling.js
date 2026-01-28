import React, { useState } from 'react';
import API from '../api/api';

// --- SUB-COMPONENT: The Modal Form ---
const AddPaymentModal = ({ studentId, onPaymentSuccess, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [paymentData, setPaymentData] = useState({
        amount_paid: '',
        paymentMethod: 'Cash',
        payment_type: 'Monthly Installment',
        reference_number: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await API.post(`/admin/billing/student/${studentId}/pay`, paymentData);
            alert("Payment recorded successfully!");
            onPaymentSuccess(response.data.payment); 
            onClose();
        } catch (err) {
            alert("Error: " + (err.response?.data?.message || "Failed to save payment"));
        } finally {
            setLoading(false);
        }
    };

    return (

        
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="modal-content" style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Add New Payment</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Payment Type</label>
                        <select 
                            style={{ width: '100%', padding: '8px' }}
                            value={paymentData.payment_type}
                            onChange={(e) => setPaymentData({...paymentData, payment_type: e.target.value})}
                        >
                            <option value="Monthly Installment">Monthly Installment</option>
                            <option value="Prelim Exam">Prelim Exam</option>
                            <option value="Midterm Exam">Midterm Exam</option>
                            <option value="Final Exam">Final Exam</option>
                            <option value="Books/Uniform">Books/Uniform</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Amount (₱)</label>
                        <input 
                            type="number" 
                            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                            required
                            value={paymentData.amount_paid}
                            onChange={(e) => setPaymentData({...paymentData, amount_paid: e.target.value})}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Method</label>
                        <select 
                            style={{ width: '100%', padding: '8px' }}
                            value={paymentData.payment_method}
                            onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                        >
                            <option value="Cash">Cash</option>
                            <option value="GCash">GCash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                    </div>

                    {paymentData.payment_method !== 'Cash' && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Reference Number</label>
                            <input 
                                type="text" 
                                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                                required
                                value={paymentData.reference_number}
                                onChange={(e) => setPaymentData({...paymentData, reference_number: e.target.value})}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            {loading ? "Saving..." : "Record Payment"}
                        </button>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT: The Ledger View ---
const StudentBilling = ({ studentId, payments, totalTuition = 25000, onPaymentAdded }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
    const balance = totalTuition - totalPaid;

    return (
        <div className="billing-container" style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Student Ledger</h2>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ padding: '10px 20px', backgroundColor: '#b8860b', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    + Add New Payment
                </button>
            </div>

            <div className="billing-summary" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ padding: '15px', background: '#f0f7ff', borderRadius: '8px', borderLeft: '5px solid #007bff' }}>
                    <small>Total Tuition</small>
                    <h3 style={{ margin: 0 }}>₱{totalTuition.toLocaleString()}</h3>
                </div>
                <div style={{ padding: '15px', background: '#f6ffed', borderRadius: '8px', borderLeft: '5px solid #52c41a' }}>
                    <small>Total Paid</small>
                    <h3 style={{ margin: 0, color: '#52c41a' }}>₱{totalPaid.toLocaleString()}</h3>
                </div>
                <div style={{ padding: '15px', background: '#fff1f0', borderRadius: '8px', borderLeft: '5px solid #f5222d' }}>
                    <small>Remaining Balance</small>
                    <h3 style={{ margin: 0, color: '#f5222d' }}>₱{balance.toLocaleString()}</h3>
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '10px' }}>Date</th>
                        <th>Type</th>
                        <th>Method</th>
                        <th>Ref #</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.length > 0 ? (
                        payments.map((p) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{new Date(p.payment_date || p.created_at).toLocaleDateString()}</td>
                                <td><strong>{p.payment_type}</strong></td>
                                <td>{p.payment_method}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.reference_number}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₱{parseFloat(p.amount_paid).toLocaleString()}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No payment records found.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Modal Logic */}
            {isModalOpen && (
                <AddPaymentModal 
                    studentId={studentId} 
                    onClose={() => setIsModalOpen(false)} 
                    onPaymentSuccess={onPaymentAdded} 
                />
            )}
        </div>
    );
};

export default StudentBilling;