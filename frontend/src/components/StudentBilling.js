import React, { useState, useEffect } from 'react';
import API from '../api/api';
import './StudentBilling.css';

// --- Skeleton Components (same as before) ---
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
// Returns true if today is past the 5 business-day grace period from the 1st
const isPastGracePeriod = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the 1st of the current month
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Count 5 business days (skip weekends) from the 1st
  let businessDays = 0;
  let graceEnd = new Date(firstOfMonth);

  while (businessDays < 5) {
    const day = graceEnd.getDay(); // 0 = Sun, 6 = Sat
    if (day !== 0 && day !== 6) {
      businessDays++;
    }
    if (businessDays < 5) {
      graceEnd.setDate(graceEnd.getDate() + 1);
    }
  }

  // Penalty kicks in the day AFTER the grace period ends
  const penaltyStartDate = new Date(graceEnd);
  penaltyStartDate.setDate(penaltyStartDate.getDate() + 1);
  // Skip if penalty start lands on weekend
  while (penaltyStartDate.getDay() === 0 || penaltyStartDate.getDay() === 6) {
    penaltyStartDate.setDate(penaltyStartDate.getDate() + 1);
  }

  return today >= penaltyStartDate;
};


// --- Modal Component (unchanged) ---
const AddPaymentModal = ({ studentId, onPaymentSuccess, onClose,schoolYear  }) => {
    const [loading, setLoading] = useState(false);
    const [baseAmount, setBaseAmount] = useState('');
    const [bookAmount, setBookAmount] = useState('');
    const [applyPenalty, setApplyPenalty] = useState(false);
    const [paymentData, setPaymentData] = useState({
        paymentMethod: 'Cash',
        reference_number: ''
    });

    const monthly = parseFloat(baseAmount) || 0;
    const books = parseFloat(bookAmount) || 0;
    const penalty = applyPenalty ? monthly * 0.10 : 0;
    const monthlyTotal = monthly + penalty;

    useEffect(() => {
    if (isPastGracePeriod()) {
        setApplyPenalty(true);
    }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (monthly <= 0 && books <= 0) {
            alert("Please enter at least one amount (monthly or books)");
            return;
        }

        setLoading(true);
        const promises = [];

        if (monthly > 0) {
            const monthlyPayload = {
                ...paymentData,
                amount_paid: monthlyTotal.toFixed(2),
                payment_type: applyPenalty ? 'Monthly w/ penalty' : 'Monthly Installment',
                 school_year: schoolYear
            };
            promises.push(API.post(`/admin/billing/student/${studentId}/pay`, monthlyPayload));
        }

        if (books > 0) {
            const booksPayload = {
                ...paymentData,
                amount_paid: books.toFixed(2),
                payment_type: 'Books',
                 school_year: schoolYear
            };
            promises.push(API.post(`/admin/billing/student/${studentId}/pay`, booksPayload));
        }

        try {
            const results = await Promise.all(promises);
            const newPayments = results.map(r => r.data.payment);
            alert("Payment(s) recorded successfully!");
            onPaymentSuccess(newPayments);
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
                    {/* Base monthly amount - optional now */}
                    <div className="billing-form-group">
                        <label className="billing-form-label">Base Monthly Amount (₱)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="billing-form-input"
                            value={baseAmount}
                            onChange={(e) => setBaseAmount(e.target.value)}
                            placeholder="Enter monthly installment amount"
                        />
                    </div>

                    {/* Optional book payment */}
                    <div className="billing-form-group">
                        <label className="billing-form-label">Book Payment (₱)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="billing-form-input"
                            value={bookAmount}
                            onChange={(e) => setBookAmount(e.target.value)}
                            placeholder="Enter book amount if paying books"
                        />
                    </div>

                    {/* Penalty checkbox - disabled if no monthly amount */}
                    <div className="billing-form-group">
                    <label className="billing-form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                        type="checkbox"
                        checked={applyPenalty}
                        onChange={(e) => setApplyPenalty(e.target.checked)}
                        disabled={!baseAmount || parseFloat(baseAmount) <= 0}
                        />
                        <span style={{ opacity: (!baseAmount || parseFloat(baseAmount) <= 0) ? 0.6 : 1 }}>
                        Apply 10% late penalty
                        </span>
                        {isPastGracePeriod() && (
                        <span style={{
                            fontSize: '0.75rem', backgroundColor: '#fff3e0',
                            color: '#e65100', padding: '2px 8px', borderRadius: '12px',
                            fontWeight: 600, border: '1px solid #ffcc80'
                        }}>
                            ⚠️ Past due — auto-applied
                        </span>
                        )}
                    </label>
                    </div>

                    {/* Show totals breakdown only if there's something to show */}
                    {(monthly > 0 || books > 0) && (
                        <div className="billing-form-group">
                            <label className="billing-form-label">Payment Breakdown</label>
                            <div style={{ fontSize: '0.9rem', color: '#555' }}>
                                {monthly > 0 && <p>Monthly: ₱{monthly.toFixed(2)}</p>}
                                {applyPenalty && monthly > 0 && <p>Penalty (10%): ₱{penalty.toFixed(2)}</p>}
                                {books > 0 && <p>Books: ₱{books.toFixed(2)}</p>}
                                <hr style={{ margin: '8px 0' }} />
                                <p><strong>Total: ₱{(monthlyTotal + books).toFixed(2)}</strong></p>
                            </div>
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
                            {loading ? "Saving..." : "Record Payment(s)"}
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
const StudentBilling = ({ studentId, payments, totalTuition = 25000, books, onPaymentAdded, loading = false,  selectedSchoolYear  }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
    const tuitionPaid = payments.filter(p => p.payment_type !== 'Books').reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
    const tuitionBalance = totalTuition - tuitionPaid;
    const isTuitionFullyPaid = tuitionBalance <= 0;

    const bookSummary = books || { total: 0, paid: 0, balance: 0, status: 'unpaid' };
    const isBooksFullyPaid = bookSummary.balance <= 0;

    return (
        <div className="billing-container">
            <div className="billing-header">
                <div>
                    <h2>Student Ledger</h2>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="billing-add-payment-btn"
                    disabled={loading || (isTuitionFullyPaid && isBooksFullyPaid)}
                >
                    + Add New Payment
                </button>
            </div>

            {/* Combined Summary Grid (6 columns) */}
            {loading ? (
                <div className="billing-summary six-col">
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                    <SummaryCardSkeleton />
                </div>
            ) : (
                <div className="billing-summary six-col">
                    {/* Tuition cards - default style */}
                    <div className="billing-summary-card tuition">
                        <small>Tuition</small>
                        <h3>₱{totalTuition.toLocaleString()}</h3>
                    </div>
                    <div className="billing-summary-card paid">
                        <small>Paid</small>
                        <h3>₱{tuitionPaid.toLocaleString()}</h3>
                    </div>
                    <div className={`billing-summary-card ${isTuitionFullyPaid ? 'paid-full' : 'balance'}`}>
                        <small>Balance</small>
                        <h3 style={{ color: isTuitionFullyPaid ? '#4caf50' : '#f5222d' }}>
                            {isTuitionFullyPaid ? '✓' : `₱${tuitionBalance.toLocaleString()}`}
                        </h3>
                    </div>

                    {/* Books cards - with additional class "book-card" */}
                    <div className="billing-summary-card tuition book-card">
                        <small>Books</small>
                        <h3>₱{bookSummary.total.toLocaleString()}</h3>
                    </div>
                    <div className="billing-summary-card paid book-card">
                        <small>Paid</small>
                        <h3>₱{bookSummary.paid.toLocaleString()}</h3>
                    </div>
                    <div className={`billing-summary-card ${isBooksFullyPaid ? 'paid-full' : 'balance'} book-card`}>
                        <small>Balance</small>
                        <h3 style={{ color: isBooksFullyPaid ? '#4caf50' : '#f5222d' }}>
                            {isBooksFullyPaid ? '✓' : `₱${bookSummary.balance.toLocaleString()}`}
                        </h3>
                    </div>
                </div>
            )}

            {/* Payments Table */}
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
                    schoolYear={selectedSchoolYear} 
                />
            )}
        </div>
    );
};

export default StudentBilling;