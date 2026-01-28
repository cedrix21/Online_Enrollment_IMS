import React, { useState } from 'react';
import API from '../api/api';
import './StudentBilling.css';

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
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Add New Payment</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Payment Type</label>
                        <select 
                            className="form-select"
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

                    <div className="form-group">
                        <label className="form-label">Amount (₱)</label>
                        <input 
                            type="number"
                            className="form-input"
                            required
                            value={paymentData.amount_paid}
                            onChange={(e) => setPaymentData({...paymentData, amount_paid: e.target.value})}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Method</label>
                        <select 
                            className="form-select"
                            value={paymentData.paymentMethod}
                            onChange={(e) => setPaymentData({...paymentData, paymentMethod: e.target.value})}
                        >
                            <option value="Select Method">Select Method</option>
                            <option value="Cash">Cash</option>
                            <option value="GCash">GCash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                    </div>

                    {paymentData.paymentMethod !== 'Cash' && (
                        <div className="form-group">
                            <label className="form-label">Reference Number</label>
                            <input 
                                type="text"
                                className="form-input"
                                required
                                value={paymentData.reference_number}
                                onChange={(e) => setPaymentData({...paymentData, reference_number: e.target.value})}
                            />
                        </div>
                    )}

                    <div className="modal-buttons">
                        <button type="submit" disabled={loading} className="btn-submit">
                            {loading ? "Saving..." : "Record Payment"}
                        </button>
                        <button type="button" onClick={onClose} className="btn-cancel">
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
        <div className="billing-container">
            
            <div className="billing-header">
                <h2>Student Ledger</h2>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="add-payment-btn"
                >
                    + Add New Payment
                </button>
            </div>

            <div className="billing-summary">
                <div className="summary-card tuition">
                    <small>Total Tuition</small>
                    <h3>₱{totalTuition.toLocaleString()}</h3>
                </div>
                <div className="summary-card paid">
                    <small>Total Paid</small>
                    <h3>₱{totalPaid.toLocaleString()}</h3>
                </div>
                <div className="summary-card balance">
                    <small>Remaining Balance</small>
                    <h3>₱{balance.toLocaleString()}</h3>
                </div>
            </div>

            <table className="payment-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Method</th>
                        <th>Ref #</th>
                        <th className="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.length > 0 ? (
                        payments.map((p) => (
                            <tr key={p.id}>
                                <td>{new Date(p.payment_date || p.created_at).toLocaleDateString()}</td>
                                <td className="payment-type">{p.payment_type}</td>
                                <td>{p.paymentMethod}</td>
                                <td className="payment-ref">{p.reference_number}</td>
                                <td className="payment-amount">₱{parseFloat(p.amount_paid).toLocaleString()}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" className="no-payments">No payment records found.</td>
                        </tr>
                    )}
                </tbody>
            </table>

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