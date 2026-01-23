import React, { useState, useEffect } from 'react';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import StudentBilling from '../components/StudentBilling';
import API from '../api/api';

const BillingManagement = ({ user }) => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // New state for search
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalTuition, setTotalTuition] = useState(25000); // Default

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

    // Filter students based on search term (First Name, Last Name, or ID)
    // Filter students with safety checks (ensures values exist before calling toLowerCase)
const filteredStudents = students.filter(s => {
    const search = searchTerm.toLowerCase();
    
    // Check if fields exist, otherwise default to an empty string
    const fName = s.firstName ? s.firstName.toLowerCase() : '';
    const lName = s.lastName ? s.lastName.toLowerCase() : '';
    const idNum = s.student_id_number ? s.student_id_number.toLowerCase() : '';

    return fName.includes(search) || 
           lName.includes(search) || 
           idNum.includes(search);
});

    return (
        <div className="dashboard-layout">
            <SideBar user={user} />
            <div className="main-content">
                <TopBar user={user} />

                
                
                <div className="content-body" style={{ padding: '20px' }}>
                    <div className="billing-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                        
                        {/* Student List Column */}
                        <div className="student-list-card" style={{ background: '#fff', borderRadius: '8px', padding: '15px', height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Enrolled Students</h3>
                            
                            {/* SEARCH BAR INPUT */}
                            <div style={{ marginBottom: '15px', position: 'relative' }}>
                                <input 
                                    type="text"
                                    placeholder="Search student..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 10px 10px 35px',
                                        borderRadius: '20px',
                                        border: '1px solid #ddd',
                                        fontSize: '0.9rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '12px', color: '#aaa' }}></i>
                            </div>

                            <div className="scroll-area" style={{ flex: 1, overflowY: 'auto' }}>
                                {loading ? (
                                    <p style={{ textAlign: 'center', color: '#888' }}>Loading...</p>
                                ) : filteredStudents.length > 0 ? (
                                    filteredStudents.map(s => (
                                        <div 
                                            key={s.id} 
                                            onClick={() => handleSelectStudent(s)}
                                            style={{ 
                                                padding: '12px', 
                                                cursor: 'pointer', 
                                                borderRadius: '8px',
                                                marginBottom: '8px',
                                                transition: 'all 0.2s',
                                                background: selectedStudent?.id === s.id ? '#eef6ff' : 'transparent',
                                                border: selectedStudent?.id === s.id ? '1px solid #007bff' : '1px solid #f0f0f0'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold', color: selectedStudent?.id === s.id ? '#007bff' : '#333' }}>
                                                {s.lastName}, {s.firstName}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#777' }}>ID: {s.student_id_number}</div>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ textAlign: 'center', color: '#999', fontSize: '0.9rem', marginTop: '20px' }}>No students found.</p>
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
                                <div style={{ textAlign: 'center', marginTop: '100px', color: '#ccc', background: '#fff', padding: '50px', borderRadius: '12px' }}>
                                    <i className="fas fa-user-circle" style={{ fontSize: '4rem', marginBottom: '15px', display: 'block' }}></i>
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