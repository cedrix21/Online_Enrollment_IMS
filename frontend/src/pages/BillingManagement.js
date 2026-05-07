import React, { useState, useEffect, useMemo } from 'react';
import StudentBilling from '../components/StudentBilling';
import API from '../api/api';
import './BillingManagement.css';
import { logActivity } from '../utils/activityLogger';
import { useLocation } from 'react-router-dom';
import { useCurrentSchoolYear } from '../hooks/useCurrentSchoolYear';

const BillingManagement = ({ user }) => {
    const { schoolYear: currentSchoolYear, loading: yearLoading } = useCurrentSchoolYear();
    const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [totalTuition, setTotalTuition] = useState(25000);
    const [booksSummary, setBooksSummary] = useState({ total: 0, paid: 0, balance: 0, status: 'unpaid' });
    const location = useLocation();
    const [filterPaymentStatus, setFilterPaymentStatus] = useState(
        location.state?.paymentFilter || 'all'
    );
    const [discountPercent, setDiscountPercent] = useState(0);
    const [savingDiscount, setSavingDiscount] = useState(false);
    const [originalTotal, setOriginalTotal] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    // Define tuition rates (used for search filtering only)
    const rates = {
        'Kindergarten 1': 20000,
        'Kindergarten 2': 20000,
        'Grade 1': 25000,
        'Grade 2': 27500,
        'Grade 3': 30000,
        'Grade 4': 32000,
        'Grade 5': 34000,
        'Grade 6': 36000,
    };

    // ── Compute total paid for the selected student ───
    const totalPaid = useMemo(() => {
        if (!payments || payments.length === 0) return 0;
        return payments.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
    }, [payments]);

    // Balance from tuition + fees
    const tuitionBalance = totalTuition - totalPaid;
    // Books balance
    const booksBalance = booksSummary?.balance || 0;
    // True if any money is still owed
    const hasOutstandingBalance = tuitionBalance > 0 || booksBalance > 0;

    // Sync school year
    useEffect(() => {
        if (currentSchoolYear && !selectedSchoolYear) {
            setSelectedSchoolYear(currentSchoolYear);
        }
    }, [currentSchoolYear, selectedSchoolYear]);

    // Fetch students with cleanup
    useEffect(() => {
        if (!selectedSchoolYear) return;
        let cancelled = false;

        const fetchStudents = async () => {
            setStudentsLoading(true);
            try {
                const res = await API.get('/students', {
                    params: { school_year: selectedSchoolYear }
                });
                if (!cancelled) setStudents(res.data);
            } catch (err) {
                if (!cancelled) console.error("Error fetching students", err);
            } finally {
                if (!cancelled) {
                    setStudentsLoading(false);
                    setLoading(false);
                }
            }
        };
        fetchStudents();

        return () => { cancelled = true; };
    }, [selectedSchoolYear]);

    // Clear selected student if no longer in list
    useEffect(() => {
        if (selectedStudent && !students.find(s => s.id === selectedStudent.id)) {
            setSelectedStudent(null);
            setPayments([]);
        }
    }, [students, selectedStudent]);

    // Sync payment filter from location state
    useEffect(() => {
        if (location.state?.paymentFilter) {
            setFilterPaymentStatus(location.state.paymentFilter);
        }
    }, [location.state]);

    // Fetch ledger for selected student with cleanup
    const handleSelectStudent = async (student) => {
        if (selectedStudent?.id === student.id) {
            setSelectedStudent(null);
            setPayments([]);
            setTotalTuition(25000);
            setBooksSummary({ total: 0, paid: 0, balance: 0, status: 'unpaid' });
            return;
        }

        setSelectedStudent(student);
        setLedgerLoading(true);
        try {
            const res = await API.get(`/admin/billing/student/${student.id}`, {
                params: { school_year: selectedSchoolYear }
            });
            setPayments(res.data.ledger || []);
            setTotalTuition(res.data.summary.total_tuition);
            setOriginalTotal(res.data.summary.original_total || res.data.summary.total_tuition);
            setDiscountAmount(res.data.summary.discount_amount || 0);
            setBooksSummary(res.data.summary.books);
            setDiscountPercent(student.discount_percent || 0);

            await logActivity('view_billing_ledger', {
                student_id: student.id,
                student_name: `${student.firstName} ${student.lastName}`,
                school_year: selectedSchoolYear,
            });
        } catch (err) {
            console.error("Error fetching ledger", err);
        } finally {
            setLedgerLoading(false);
        }
    };

    // Refresh ledger when school year changes
    useEffect(() => {
        if (selectedStudent) {
            handleSelectStudent(selectedStudent);
        }
    }, [selectedSchoolYear]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePaymentAdded = async () => {
        if (!selectedStudent) return;
        try {
            const res = await API.get(`/admin/billing/student/${selectedStudent.id}`);
            setPayments(res.data.ledger || []);
            setTotalTuition(res.data.summary.total_tuition);
            setBooksSummary(res.data.summary.books);
        } catch (err) {
            console.error("Error refreshing ledger", err);
        }
    };
    const handleSaveDiscount = async () => {
    if (!selectedStudent) return;
    setSavingDiscount(true);
    try {
        await API.put(`/students/${selectedStudent.id}/discount`, {
            discount_percent: parseFloat(discountPercent),
        });
        // Refresh ledger to show new totals
        const res = await API.get(`/admin/billing/student/${selectedStudent.id}`, {
            params: { school_year: selectedSchoolYear }
        });
        setPayments(res.data.ledger || []);
        setTotalTuition(res.data.summary.total_tuition);
        setOriginalTotal(res.data.summary.original_total || res.data.summary.total_tuition);
        setDiscountAmount(res.data.summary.discount_amount || 0);
        setBooksSummary(res.data.summary.books);
        } catch (err) {
            console.error('Failed to update discount', err);
            setErrorMessage('Failed to update discount');
            setTimeout(() => setErrorMessage(''), 3000);
        } finally {
            setSavingDiscount(false);
        }
    };


    const filteredStudents = students.filter(s => {
        const search = searchTerm.toLowerCase();
        const fName = s.firstName?.toLowerCase() || '';
        const lName = s.lastName?.toLowerCase() || '';
        const idNum = s.studentId?.toLowerCase() || '';

        const matchesSearch = fName.includes(search) || lName.includes(search) || idNum.includes(search);

        if (filterPaymentStatus === 'unpaid') {
            const tuitionAmount = rates[s.gradeLevel] || 25000;
            const totalPaidByStudent = s.payments?.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0) || 0;
            const hasBalance = (tuitionAmount - totalPaidByStudent) > 0;
            return matchesSearch && hasBalance;
        }

        return matchesSearch;
    });

    
    return (
        <div className="billing-content-body">
            {errorMessage && (
            <div className="message-toast" style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', marginBottom: '16px', borderRadius: '8px' }}>
                ❌ {errorMessage}
            </div>
            )}
            {yearLoading || !selectedSchoolYear ? (
                <div className="loading-school-year">Loading school year...</div>
            ) : (
                <div className="billing-grid">
                    {/* Student List Column */}
                    <div className="student-list-card">
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3>Enrolled Students</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {filterPaymentStatus === 'unpaid' && (
                                    <span style={{ padding: '4px 8px', backgroundColor: '#ff9800', color: 'white', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                        Unpaid Only
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Search Bar */}
                        <div className="student-search-wrapper">
                            <input 
                                type="text"
                                placeholder="Search student..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="student-search-input"
                            />
                            <i className="fas fa-search search-icon"></i>
                        </div>
                        
                        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                            <select
                                value={selectedSchoolYear}
                                onChange={(e) => setSelectedSchoolYear(e.target.value)}
                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                            >
                                {['2024-2025', '2025-2026', '2026-2027', '2027-2028'].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <select
                                value={filterPaymentStatus}
                                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                            >
                                <option value="all">All Students</option>
                                <option value="unpaid">Unpaid Balance Only</option>
                            </select>
                        </div>

                        <div className="student-scroll-area">
                            {studentsLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="student-item skeleton">
                                        <div className="skeleton-line" style={{ width: '70%', height: '16px', marginBottom: '6px' }}></div>
                                        <div className="skeleton-line" style={{ width: '40%', height: '14px' }}></div>
                                    </div>
                                ))
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map(s => (
                                    <div 
                                        key={s.id} 
                                        onClick={() => handleSelectStudent(s)}
                                        className={`student-item ${selectedStudent?.id === s.id ? 'selected' : ''}`}
                                    >
                                        <div className="student-name">{s.lastName}, {s.firstName}</div>
                                        <div className="student-id">ID: {s.studentId}</div>
                                    </div>
                                ))
                            ) : (
                                <p className="student-empty">No students found.</p>
                            )}
                        </div>
                    </div>

                    {/* Billing Ledger Column */}
                    <div className="ledger-display">
                        {selectedStudent ? (
                            <>
                                <div className="ledger-header" style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #eee' }}>
                                    <h2 style={{ margin: 0, color: '#2c3e50' }}>
                                        {selectedStudent.firstName} {selectedStudent.lastName}
                                    </h2>
                                    <p style={{ margin: 0, color: '#7f8c8d', fontSize: '0.9rem' }}>
                                        Student ID: {selectedStudent.studentId} | {selectedStudent.gradeLevel}
                                    </p>
                                </div>
                                {originalTotal > 0 && discountAmount > 0 && (
                                <div style={{ color: '#2e7d32', fontSize: '0.9rem', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 600 }}>Discount Applied:</span> ₱{discountAmount.toLocaleString()} ({discountPercent}% off)
                                </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <label style={{ fontWeight: 600 }}>Discount (%):</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={discountPercent}
                                        onChange={(e) => setDiscountPercent(e.target.value)}
                                        style={{ width: '70px', padding: '4px', borderRadius: '6px', border: '1px solid #ccc' }}
                                    />
                                    <button
                                        onClick={handleSaveDiscount}
                                        disabled={savingDiscount}
                                        style={{
                                        padding: '6px 14px',
                                        backgroundColor: '#b8860b',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        }}
                                    >
                                        {savingDiscount ? 'Saving...' : 'Apply Discount'}
                                    </button>
                                    </div>

                                {/* ⚠️ Late Payment / Outstanding Balance Notice */}
                                {!ledgerLoading && hasOutstandingBalance && (
                                    <div className="outstanding-notice" style={{
                                        backgroundColor: tuitionBalance > 0 ? '#fff3e0' : '#fce4ec',
                                        borderLeft: `4px solid ${tuitionBalance > 0 ? '#ff9800' : '#d32f2f'}`,
                                        borderRadius: '6px',
                                        padding: '12px 16px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        fontSize: '0.9rem',
                                        color: '#333',
                                    }}>
                                        <div>
                                            <strong>Remaining Balance</strong>
                                            <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>
                                                {tuitionBalance > 0 && (
                                                    <div>Tuition & Fees: <span style={{ fontWeight: 'bold', color: '#d32f2f' }}>₱{tuitionBalance.toLocaleString()}</span></div>
                                                )}
                                                {booksBalance > 0 && (
                                                    <div>Books: <span style={{ fontWeight: 'bold', color: '#d32f2f' }}>₱{booksBalance.toLocaleString()}</span></div>
                                                )}
                                                <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                                                    Please remind the parent/guardian to settle the remaining amount.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <StudentBilling 
                                    studentId={selectedStudent.id}
                                    studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
                                    payments={payments}
                                    onPaymentAdded={handlePaymentAdded}
                                    totalTuition={totalTuition}
                                    books={booksSummary}
                                    loading={ledgerLoading}
                                    selectedSchoolYear={selectedSchoolYear} 
                                />
                            </>
                        ) : (
                            <div className="ledger-empty-state">
                                <i className="fas fa-user-circle"></i>
                                <h3>No Student Selected</h3>
                                <p>Please select a student from the left panel to manage their billing records.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingManagement;