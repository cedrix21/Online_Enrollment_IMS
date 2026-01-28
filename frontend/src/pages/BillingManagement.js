import React, { useState, useEffect } from 'react';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import StudentBilling from '../components/StudentBilling';
import API from '../api/api';
import './BillingManagement.css';

const BillingManagement = ({ user }) => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalTuition, setTotalTuition] = useState(25000);

    useEffect(() => {
        fetchStudents();
    }, []);

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
        const fName = s.firstName ? s.firstName.toLowerCase() : '';
        const lName = s.lastName ? s.lastName.toLowerCase() : '';
        const idNum = s.studentId ? s.studentId.toLowerCase() : '';

        return fName.includes(search) || 
               lName.includes(search) || 
               idNum.includes(search);
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
                            <h3>Enrolled Students</h3>
                            
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
                                            <div className="student-name">
                                                {s.lastName}, {s.firstName}
                                            </div>
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
                                <StudentBilling 
                                    studentId={selectedStudent.id}
                                    payments={payments}
                                    onPaymentAdded={(newPayment) => setPayments([...payments, newPayment])}
                                    totalTuition={totalTuition}
                                />
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