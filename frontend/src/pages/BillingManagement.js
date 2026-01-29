import React, { useState, useEffect } from 'react';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import StudentBilling from '../components/StudentBilling';
import API from '../api/api';
import './BillingManagement.css';
import { useLocation } from 'react-router-dom';

const BillingManagement = ({ user }) => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalTuition, setTotalTuition] = useState(25000);
    const location = useLocation();
    const [filterPaymentStatus, setFilterPaymentStatus] = useState(
        location.state?.paymentFilter || 'all'
    );

    // Define tuition rates (Keep this outside or useMemo for performance)
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
    }, []);

    useEffect(() => {
        if (location.state?.paymentFilter) {
            setFilterPaymentStatus(location.state.paymentFilter);
        }
    }, [location.state]);

    const fetchStudents = async () => {
        try {
            const res = await API.get('/students');
            setStudents(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching students", err);
        }
    };

    const handleSelectStudent = async (student) => {
        setSelectedStudent(student);
        try {
            const res = await API.get(`/admin/billing/student/${student.id}`);
            setPayments(res.data.ledger || []);
            setTotalTuition(res.data.summary.total_tuition);
        } catch (err) {
            console.error("Error fetching ledger", err);
        }
    };

    const filteredStudents = students.filter(s => {
        const search = searchTerm.toLowerCase();
        const fName = s.firstName?.toLowerCase() || '';
        const lName = s.lastName?.toLowerCase() || '';
        const idNum = s.studentId?.toLowerCase() || '';

        const matchesSearch = fName.includes(search) || lName.includes(search) || idNum.includes(search);

        // STRICTOR UNPAID FILTER LOGIC
        if (filterPaymentStatus === 'unpaid') {
            const tuitionAmount = rates[s.gradeLevel] || 25000;
            const totalPaid = s.payments?.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0) || 0;
            const hasBalance = (tuitionAmount - totalPaid) > 0;
            
            // If it matches search BUT has no balance, we return false to hide them
            return matchesSearch && hasBalance;
        }else {
            return matchesSearch;
        }
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
                                {filterPaymentStatus === 'unpaid' && (
                                    <span style={{ padding: '4px 8px', backgroundColor: '#ff9800', color: 'white', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                        Unpaid Only
                                    </span>
                                )}
                            </div>
                            
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

                            <div style={{ marginBottom: '15px' }}>
                                <select
                                    value={filterPaymentStatus}
                                    onChange={(e) => setFilterPaymentStatus(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                >
                                    <option value="all">All Students</option>
                                    <option value="unpaid">Unpaid Balance Only</option>
                                </select>
                            </div>

                            <div className="student-scroll-area">
                                {loading ? (
                                    <p className="student-loading">Loading...</p>
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
                                    {/* ADDED STUDENT NAME HEADER HERE */}
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
                                        onPaymentAdded={(newPayment) => setPayments([...payments, newPayment])}
                                        totalTuition={totalTuition}
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