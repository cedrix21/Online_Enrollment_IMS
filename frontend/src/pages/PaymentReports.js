import React, { useState, useEffect } from 'react';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import API from '../api/api';
import './PaymentReports.css';
import { FaFileExcel, FaFilePdf, FaSearch, FaSync } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PaymentReports = () => {
    const [payments, setPayments] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('all');
    const [selectedType, setSelectedType] = useState('all');

    // Fetch all payments
    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const res = await API.get('/admin/payments');
            setPayments(res.data);
            setFilteredPayments(res.data);
        } catch (err) {
            console.error('Error fetching payments:', err);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters
    useEffect(() => {
        let filtered = payments;

        if (dateRange.start && dateRange.end) {
            const start = new Date(dateRange.start);
            const end = new Date(dateRange.end);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(p => {
                const pDate = new Date(p.payment_date || p.created_at);
                return pDate >= start && pDate <= end;
            });
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.student?.firstName?.toLowerCase().includes(term) ||
                p.student?.lastName?.toLowerCase().includes(term) ||
                p.student?.studentId?.toLowerCase().includes(term) ||
                p.reference_number?.toLowerCase().includes(term)
            );
        }

        if (selectedGrade !== 'all') {
            filtered = filtered.filter(p => p.student?.gradeLevel === selectedGrade);
        }

        if (selectedType !== 'all') {
            filtered = filtered.filter(p => p.payment_type === selectedType);
        }

        setFilteredPayments(filtered);
    }, [payments, dateRange, searchTerm, selectedGrade, selectedType]);

    // Export to Excel
    const exportToExcel = () => {
        const data = filteredPayments.map(p => ({
            'Date': new Date(p.payment_date || p.created_at).toLocaleDateString(),
            'Student ID': p.student?.studentId,
            'Student Name': `${p.student?.lastName}, ${p.student?.firstName}`,
            'Grade': p.student?.gradeLevel,
            'Type': p.payment_type,
            'Method': p.paymentMethod,
            'Reference #': p.reference_number,
            'Amount': p.amount_paid,
            'Status': p.payment_status
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payments');
        XLSX.writeFile(wb, `Payment_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    // Export to PDF
    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Payment Transaction Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

        const tableColumn = ['Date', 'Student', 'Grade', 'Type', 'Method', 'Ref #', 'Amount', 'Status'];
        const tableRows = filteredPayments.map(p => [
            new Date(p.payment_date || p.created_at).toLocaleDateString(),
            `${p.student?.lastName}, ${p.student?.firstName}`,
            p.student?.gradeLevel || '',
            p.payment_type,
            p.paymentMethod,
            p.reference_number,
            `₱${parseFloat(p.amount_paid).toLocaleString()}`,
            p.payment_status
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [184, 134, 11] }
        });

        doc.save(`Payment_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    };

    // Get unique grade levels for filter
    const gradeLevels = [...new Set(payments.map(p => p.student?.gradeLevel).filter(Boolean))].sort();

    // Get unique payment types
    const paymentTypes = [...new Set(payments.map(p => p.payment_type).filter(Boolean))];

    return (
        <div className="dashboard-layout">
            <SideBar />
            <div className="main-content">
                <TopBar />
                <div className="content-scroll-area" style={{ padding: '20px' }}>
                    <div className="reports-container">
                        <div className="reports-header">
                            <h2>Payment Transaction History</h2>
                            <div className="reports-actions">
                                <button onClick={exportToExcel} className="btn-excel">
                                    <FaFileExcel /> Excel
                                </button>
                                <button onClick={exportToPDF} className="btn-pdf">
                                    <FaFilePdf /> PDF
                                </button>
                                <button onClick={fetchPayments} className="btn-refresh">
                                    <FaSync /> Refresh
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="filters-bar">
                            <div className="filter-group">
                                <label>Date Range</label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                                <span>to</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>

                            <div className="filter-group">
                                <label>Search</label>
                                <div className="search-box">
                                    <FaSearch className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Student name, ID, ref #"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="filter-group">
                                <label>Grade Level</label>
                                <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
                                    <option value="all">All Grades</option>
                                    {gradeLevels.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Payment Type</label>
                                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                                    <option value="all">All Types</option>
                                    {paymentTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="summary-stats">
                            <div className="stat-card">
                                <span>Total Payments</span>
                                <h3>{filteredPayments.length}</h3>
                            </div>
                            <div className="stat-card">
                                <span>Total Amount</span>
                                <h3>₱{filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0).toLocaleString()}</h3>
                            </div>
                        </div>

                        {/* Payments Table */}
                        <div className="table-container">
                            {loading ? (
                                <div className="loading">Loading transactions...</div>
                            ) : (
                                <table className="payments-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Student ID</th>
                                            <th>Student Name</th>
                                            <th>Grade</th>
                                            <th>Type</th>
                                            <th>Method</th>
                                            <th>Reference #</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.length > 0 ? (
                                            filteredPayments.map(p => (
                                                <tr key={p.id}>
                                                    <td>{new Date(p.payment_date || p.created_at).toLocaleDateString()}</td>
                                                    <td>{p.student?.studentId}</td>
                                                    <td>{p.student?.lastName}, {p.student?.firstName}</td>
                                                    <td>{p.student?.gradeLevel}</td>
                                                    <td>{p.payment_type}</td>
                                                    <td>{p.paymentMethod}</td>
                                                    <td>{p.reference_number}</td>
                                                    <td className="amount">₱{parseFloat(p.amount_paid).toLocaleString()}</td>
                                                    <td>
                                                        <span className={`status-badge ${p.payment_status}`}>
                                                            {p.payment_status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="9" className="no-data">No payments found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentReports;