import React, { useState, useEffect } from 'react';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import StudentBilling from '../components/StudentBilling';
import API from '../api/api';
import './BillingManagement.css';
import { useLocation } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';

const BillingManagement = ({ user }) => {
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
    const [selectedSchoolYear, setSelectedSchoolYear] = useState(() => {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
});

    // Define tuition rates
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

    useEffect(() => {
        fetchStudents();
    }, [selectedSchoolYear]);

    useEffect(() => {
    if (selectedStudent && !students.find(s => s.id === selectedStudent.id)) {
        setSelectedStudent(null);
        setPayments([]);
    }
}, [students, selectedStudent]);

    useEffect(() => {
        if (location.state?.paymentFilter) {
            setFilterPaymentStatus(location.state.paymentFilter);
        }
    }, [location.state]);

    const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
        const res = await API.get('/students', {
            params: { school_year: selectedSchoolYear }
        });
        setStudents(res.data);
    } catch (err) {
        console.error("Error fetching students", err);
    } finally {
        setStudentsLoading(false);
        setLoading(false); // turn off initial loading after first fetch
    }
};

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
    setBooksSummary(res.data.summary.books);
  } catch (err) {
    console.error("Error fetching ledger", err);
  } finally {
    setLedgerLoading(false);
  }
};

useEffect(() => {
  if (selectedStudent) {
    handleSelectStudent(selectedStudent);
  }
}, [selectedSchoolYear]);

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

    const filteredStudents = students.filter(s => {
        const search = searchTerm.toLowerCase();
        const fName = s.firstName?.toLowerCase() || '';
        const lName = s.lastName?.toLowerCase() || '';
        const idNum = s.studentId?.toLowerCase() || '';

        const matchesSearch = fName.includes(search) || lName.includes(search) || idNum.includes(search);

        if (filterPaymentStatus === 'unpaid') {
            const tuitionAmount = rates[s.gradeLevel] || 25000;
            const totalPaid = s.payments?.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0) || 0;
            const hasBalance = (tuitionAmount - totalPaid) > 0;
            return matchesSearch && hasBalance;
        }

        return matchesSearch;
    });

    return (
        <div className="dashboard-layout">
            <SideBar user={user} />
            <div className="main-content">
                <TopBar user={user} />
                
                <div className="billing-content-body">
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
                                    // Skeleton rows while loading
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

                                    <StudentBilling 
                                        studentId={selectedStudent.id}
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
                </div>
            </div>
        </div>
    );
};

export default BillingManagement;