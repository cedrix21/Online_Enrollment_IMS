import React, { useState } from 'react';
import API from '../api/api';
import './StudentBilling.css';

// --- Skeleton Components ---
const SummaryCardSkeleton = () => (
    <div className="billing-summary-card skeleton">
        <div className="skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '8px' }}></div>
        <div className="skeleton-line" style={{ width: '40%', height: '24px' }}></div>
    </div>
);

const TableRowSkeleton = () => (
    <tr>
        <td><div className="skeleton-line" style={{ width: '80px', height: '16px' }}></div></td>
        <td><div className="skeleton-line" style={{ width: '100px', height: '16px' }}></div></td>
        <td><div className="skeleton-line" style={{ width: '60px', height: '16px' }}></div></td>
        <td><div className="skeleton-line" style={{ width: '90px', height: '16px' }}></div></td>
        <td><div className="skeleton-line" style={{ width: '70px', height: '16px' }}></div></td>
        <td><div className="skeleton-line" style={{ width: '80px', height: '16px', marginLeft: 'auto' }}></div></td>
    </tr>
);

const TableSkeleton = () => (
    <>
        {[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} />)}
    </>
);

// --- Modal Component ---
const AddPaymentModal = ({ studentId, onPaymentSuccess, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [baseAmount, setBaseAmount] = useState('');
    const [applyPenalty, setApplyPenalty] = useState(false);
    const [paymentData, setPaymentData] = useState({
        paymentMethod: 'Cash',
        reference_number: ''
    });

    const finalAmount = applyPenalty && baseAmount
        ? (parseFloat(baseAmount) * 1.10).toFixed(2)
        : baseAmount;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!baseAmount || parseFloat(baseAmount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        const payload = {
            ...paymentData,
            amount_paid: finalAmount,
            payment_type: applyPenalty ? 'Monthly w/ penalty' : 'Monthly Installment'
        };

        setLoading(true);
        try {
            const response = await API.post(`/admin/billing/student/${studentId}/pay`, payload);
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
        <div className="billing-modal-overlay">
            <div className="billing-modal-content">
                <div className="billing-modal-header">
                    <h3>Add New Payment</h3>
                    <button className="billing-modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="billing-form-group">
                        <label className="billing-form-label">Base Monthly Amount (₱)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="billing-form-input"
                            required
                            value={baseAmount}
                            onChange={(e) => setBaseAmount(e.target.value)}
                            placeholder="Enter monthly due"
                        />
                    </div>

                    <div className="billing-form-group">
                        <label className="billing-form-label" style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={applyPenalty}
                                onChange={(e) => setApplyPenalty(e.target.checked)}
                            />
                            <span style={{ marginLeft: '8px' }}>Apply 10% late penalty</span>
                        </label>
                    </div>

                    {applyPenalty && baseAmount && (
                        <div className="billing-form-group">
                            <label className="billing-form-label">Total with Penalty (₱)</label>
                            <input
                                type="number"
                                className="billing-form-input"
                                value={finalAmount}
                                readOnly
                                style={{ backgroundColor: '#f0f0f0' }}
                            />
                        </div>
                    )}

                    <div className="billing-form-group">
                        <label className="billing-form-label">Method</label>
                        <select
                            className="billing-form-select"
                            value={paymentData.paymentMethod}
                            onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                        >
                            <option value="Cash">Cash</option>
                            <option value="GCash">GCash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                    </div>

                    {paymentData.paymentMethod !== 'Cash' && (
                        <div className="billing-form-group">
                            <label className="billing-form-label">Reference Number</label>
                            <input
                                type="text"
                                className="billing-form-input"
                                required
                                value={paymentData.reference_number}
                                onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="billing-modal-buttons">
                        <button type="submit" disabled={loading} className="billing-btn-submit">
                            {loading ? "Saving..." : "Record Payment"}
                        </button>
                        <button type="button" onClick={onClose} className="billing-btn-cancel">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const StudentBilling = ({ studentId, payments, totalTuition = 25000, onPaymentAdded, loading = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
    const balance = totalTuition - totalPaid;
    const isFullyPaid = payments.some(p => p.payment_status === 'paid') || balance <= 0;

    return (
        <div className="billing-container">
            <div className="billing-header">
                <div>
                    <h2>Student Ledger</h2>
                    {!loading && isFullyPaid && (
                        <span className="billing-paid-badge">✓ FULLY PAID</span>
                    )}
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="billing-add-payment-btn"
                    disabled={isFullyPaid || loading}
                >
                    + Add New Payment
                </button>
            </div>

            <div className="billing-summary">
                {loading ? (
                    <>
                        <SummaryCardSkeleton />
                        <SummaryCardSkeleton />
                        <SummaryCardSkeleton />
                    </>
                ) : (
                    <>
                        <div className="billing-summary-card tuition">
                            <small>Total Tuition</small>
                            <h3>₱{totalTuition.toLocaleString()}</h3>
                        </div>
                        <div className="billing-summary-card paid">
                            <small>Total Paid</small>
                            <h3>₱{totalPaid.toLocaleString()}</h3>
                        </div>
                        <div className={`billing-summary-card ${isFullyPaid ? 'paid-full' : 'balance'}`}>
                            <small>{isFullyPaid ? 'Status' : 'Remaining Balance'}</small>
                            <h3 style={{ color: isFullyPaid ? '#4caf50' : '#f5222d' }}>
                                {isFullyPaid ? '✓ PAID' : `₱${balance.toLocaleString()}`}
                            </h3>
                        </div>
                    </>
                )}
            </div>

            <div className="billing-table-container">
                <table className="billing-payment-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Method</th>
                            <th>Ref #</th>
                            <th>Status</th>
                            <th className="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <TableSkeleton />
                        ) : payments.length > 0 ? (
                            payments.map((p) => (
                                <tr key={p.id}>
                                    <td>{new Date(p.payment_date || p.created_at).toLocaleDateString()}</td>
                                    <td className="billing-payment-type">{p.payment_type}</td>
                                    <td>{p.paymentMethod}</td>
                                    <td className="billing-payment-ref">{p.reference_number}</td>
                                    <td>
                                        <span className={`billing-status-badge ${p.payment_status}`}>
                                            {p.payment_status === 'paid' ? '✓ Paid' :
                                             p.payment_status === 'pending' ? '⏳ Pending' : 
                                             '✓ Completed'}
                                        </span>
                                    </td>
                                    <td className="billing-payment-amount">₱{parseFloat(p.amount_paid).toLocaleString()}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="billing-no-payments">No payment records found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

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