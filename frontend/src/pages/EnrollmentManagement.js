import { useEffect, useState } from "react";
import API from "../api/api";
import { useNavigate, useLocation } from "react-router-dom";
import "./EnrollmentManagement.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logo from "../assets/sics-logo.png";
import { STORAGE_URL, API_BASE_URL } from "../config";


// Import the Layout Components
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";

export default function EnrollmentManagement() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [enrollments, setEnrollments] = useState([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState(
    location.state?.filter || "all"
  );

const [selectedEnrollment, setSelectedEnrollment] = useState(null);

const closeModal = () => setSelectedEnrollment(null);

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "registrar")) {
      navigate("/dashboard");
    } else {
      fetchEnrollments();
    }
  }, [user, navigate]);

  const fetchEnrollments = async () => {
    try {
      const res = await API.get("/enrollments");
      setEnrollments(res.data);
    } catch (err) {
      setMessage("Failed to load enrollments");
    }
  };

  const updateStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this as ${status}?`))
      return;
    try {
      await API.put(`/enrollment/${id}/status`, { status });
      setMessage(`Enrollment ${status} successfully`);
      fetchEnrollments();
    } catch (err) {
      setMessage("Action failed");
    }
  };

  const filteredData = enrollments.filter((e) => {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ? true : e.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (!user) return null;


  const generatePDF = (student) => {
  const doc = new jsPDF();

   doc.addImage(logo, 'PNG', 10, 10, 20, 20); 

  // 1. Add School Header
  doc.setFontSize(18);
  doc.setTextColor(184, 134, 11); // Gold Color (#b8860b)
  doc.text("SICS - Enrollment Record", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 28, { align: "center" });

  // 2. Student Basic Info Table
 autoTable(doc, {
    startY: 35,
    head: [['Field', 'Details']],
    body: [
      ['Registration ID', student.id],
      ['Full Name', `${student.lastName}, ${student.firstName} ${student.middleName || ''}`],
      ['Grade Level', student.gradeLevel],
      ['Registration Type', student.registrationType],
      ['Email', student.email],
      ['Gender', student.gender],
      ['Birth Date', student.dateOfBirth],
      ['Medical Conditions', student.medicalConditions || 'None'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [247, 225, 75] },
  });

  // 3. Parent Information Table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Guardian', 'Name', 'Contact', 'Email']],
    body: [
      ['Father', student.fatherName, student.fatherContact, student.fatherEmail],
      ['Mother', student.motherName, student.motherContact, student.motherEmail],
      ['Emergency', 'N/A', student.emergencyContact, 'N/A'],
    ],
  });

  // 4. Requirements Status
  const reqStatus = [
    ['1x1 Picture', student.id_picture_received ? 'Verified' : 'Missing'],
    ['Kid\'s Note App', student.kids_note_installed ? 'Installed' : 'Not Installed'],
    ['PSA Birth Cert', student.psa_received ? 'Verified' : 'Missing'],
  ];

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Requirement', 'Status']],
    body: reqStatus,
  });

  // 5. Save
  doc.save(`Enrollment_${student.lastName}.pdf`);
};

const exportToExcel = () => {
  // Create a clean version of the data for Excel
  const excelData = filteredData.map(e => ({
    "First Name": e.firstName,
    "Last Name": e.lastName,
    "Email": e.email,
    "Grade Level": e.gradeLevel,
    "Type": e.registrationType,
    "Status": e.status,
    "PSA Received": e.psa_received ? "Yes" : "No",
    "1x1 Photo": e.id_picture_received ? "Yes" : "No",
    "App Installed": e.kids_note_installed ? "Yes" : "No",
    "Date Enrolled": e.enrollmentDate
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollments");
  
  // Save the file
  XLSX.writeFile(workbook, `Enrollment_List_${filterStatus}_${new Date().toLocaleDateString()}.xlsx`);
};
  

  return (
    <div className="dashboard-layout">
      {/* LEFT SIDEBAR */}
      <SideBar user={user} />

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        <TopBar user={user} />

      <div className="content-scroll-area" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

        <div className="management-container">
          <div className="management-header">
            <h2>Enrollment Management</h2>
            {message && <p className="message-toast">{message}</p>}
          </div>

          <div className="admin-actions">
            <div className="search-filter-group">
              <input
                type="text"
                placeholder="Search name or email..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="button-group">
              <button className="btn-add" onClick={() => navigate("/admin/enroll")}>Add Student</button>
              <button 
              className="btn-excel" 
              onClick={exportToExcel}
              style={{ backgroundColor: '#1d6f42', color: 'white' }}
            >
              📊 Export to Excel
            </button>
              <button
                className="btn-qr"
                onClick={() => navigate("/enrollment-qr")}
              >
                Show QR
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Grade</th>
                  <th>Requirements</th> 
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                filteredData.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Name">
                      {e.firstName} {e.lastName}
                      <div style={{fontSize: '11px', color: '#8b7500'}}>{e.registrationType}</div>
                    </td>
                    <td data-label="Email">{e.email}</td>
                    <td data-label="Grade">{e.gradeLevel}</td>
                    
                    {/* NEW REQUIREMENTS COLUMN */}
                    <td data-label="Requirements">
                      <div className="req-icons" style={{ display: 'flex', gap: '8px', fontSize: '1.1rem' }}>
                        {/* 1x1 Photo & App (Required for All) */}
                        <span title="1x1 Picture" style={{ color: e.id_picture_received ? '#2e7d32' : '#b71c1c' }}>
                          {e.id_picture_received ? '🖼️' : '⭕'}
                        </span>
                        <span title="Kid's Note App" style={{ color: e.kids_note_installed ? '#2e7d32' : '#b71c1c' }}>
                          {e.kids_note_installed ? '📱' : '⭕'}
                        </span>

                        {/* PSA (New Students & Transferees) */}
                        {(e.registrationType === "New Student" || e.registrationType === "Transferee") && (
                          <span title="PSA Birth Certificate" style={{ color: e.psa_received ? '#2e7d32' : '#b71c1c' }}>
                            {e.psa_received ? '📜' : '⭕'}
                          </span>
                        )}

                        {/* Transferee Only Documents */}
                        {e.registrationType === "Transferee" && (
                          <>
                            <span title="Good Moral" style={{ color: e.good_moral_received ? '#2e7d32' : '#b71c1c' }}>
                              {e.good_moral_received ? '⭐' : '⭕'}
                            </span>
                            <span title="Report Card" style={{ color: e.report_card_received ? '#2e7d32' : '#b71c1c' }}>
                              {e.report_card_received ? '📊' : '⭕'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td data-label="Status">
                      <span className={`status-pill ${e.status}`}>
                        {e.status}
                      </span>
                    </td>
                    <td data-label="Action">
                    <div className="action-buttons">
                      <button 
                        className="view-btn" 
                        style={{backgroundColor: '#b8860b', color: 'white'}}
                        onClick={() => setSelectedEnrollment(e)}
                      >
                        View
                      </button>
                      {e.status === "pending" && (
                        <>
                          <button className="approve" onClick={() => updateStatus(e.id, "approved")}>Approve</button>
                          <button className="reject" onClick={() => updateStatus(e.id, "rejected")}>Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                  </tr>
                ))
              ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>

            {/* VIEW DETAILS MODAL */}
              {selectedEnrollment && (
                <div className="modal-overlay" onClick={closeModal}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>Student Profile: {selectedEnrollment.firstName} {selectedEnrollment.lastName}</h3>
                      <button className="close-btn" onClick={closeModal}>&times;</button>
                    </div>
                    
                    <div className="modal-body">
                      <div className="info-grid">
                        <section>
                          <h4>Personal Information</h4>
                          <p><strong>Nickname:</strong> {selectedEnrollment.nickname || 'N/A'}</p>
                          <p><strong>Gender:</strong> {selectedEnrollment.gender}</p>
                          <p><strong>Birthday:</strong> {selectedEnrollment.dateOfBirth}</p>
                          <p><strong>Handedness:</strong> {selectedEnrollment.handedness || 'N/A'}</p>
                          <p><strong>Medical:</strong> {selectedEnrollment.medicalConditions || 'None'}</p>
                        </section>

                        <section>
                          <h4>Parent/Guardian Info</h4>
                          <p><strong>Father:</strong> {selectedEnrollment.fatherName} ({selectedEnrollment.fatherContact})</p>
                          <p><strong>Mother:</strong> {selectedEnrollment.motherName} ({selectedEnrollment.motherContact})</p>
                          <p><strong>Emergency:</strong> {selectedEnrollment.emergencyContact}</p>
                        </section>
                      </div>

                      <div className="payment-display-box" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
                          <h3>💳 Payment Information</h3>
                            <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                
                                {/* 1. PAYMENT METHOD */}
                                <div className="detail-item">
                                    <label><strong>Method:</strong></label>
                                    <span style={{ 
                                        marginLeft: '10px', 
                                        padding: '4px 8px', 
                                        borderRadius: '4px', 
                                        backgroundColor: (selectedEnrollment.payments?.[0]?.paymentMethod === 'Cash') ? '#fff3e0' : '#e3f2fd', 
                                        color: (selectedEnrollment.payments?.[0]?.paymentMethod === 'Cash') ? '#e65100' : '#0d47a1', 
                                        fontWeight: 'bold' 
                                    }}>
                                        {selectedEnrollment.payments?.[0]?.paymentMethod || 'N/A'}
                                    </span>
                                </div>
                              {/* 2. AMOUNT PAID */}
                                <div className="detail-item">
                                    <label><strong>Amount:</strong></label>
                                    <span style={{ marginLeft: '10px' }}>
                                        ₱{selectedEnrollment.payments?.[0] 
                                            ? Number(selectedEnrollment.payments[0].amount_paid).toLocaleString() 
                                            : '0.00'}
                                    </span>
                                </div>
                              
                              {/* 3. REFERENCE / STATUS */}
                              <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                  <label><strong>Reference / Status:</strong></label>
                                  
                                  {selectedEnrollment.status === 'approved' ? (
                                      <span style={{ marginLeft: '10px', color: '#2e7d32', fontWeight: 'bold' }}>
                                          ✅ Down payment is processed {(selectedEnrollment.payments?.[0]?.paymentMethod === 'Cash') ? '(Cash)' : `(Ref: ${selectedEnrollment.payments?.[0]?.reference_number})`}
                                      </span>
                                  ) : (
                                      <>
                                          {selectedEnrollment.payments?.[0]?.paymentMethod === 'Cash' ? (
                                              <span style={{ marginLeft: '10px', color: '#d32f2f', fontWeight: 'bold' }}>
                                                  ⚠️ WALK-IN: Await physical payment at Registrar
                                              </span>
                                          ) : (
                                              <span className="ref-badge" style={{ marginLeft: '10px', backgroundColor: '#eee', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                                                  {selectedEnrollment.payments?.[0]?.reference_number || 'No Reference'}
                                              </span>
                                          )}
                                      </>
                                  )}
                              </div>
                          </div>

                         {/* Only show Receipt Image if it's NOT Cash and image exists */}
                          {selectedEnrollment.payments?.[0]?.paymentMethod !== 'Cash' && selectedEnrollment.payments?.[0]?.receipt_path && (
                              <div className="receipt-preview" style={{ marginTop: '15px' }}>
                                  <label><strong>Proof of Payment:</strong></label>
                                  <div style={{ marginTop: '10px' }}>
                                      <a 
                                          href={selectedEnrollment.payments?.[0]?.receipt_path} 
                                          target="_blank" 
                                          rel="noreferrer"
                                      >
                                          <img 
                                              src={selectedEnrollment.payments?.[0]?.receipt_path} 
                                              alt="Receipt" 
                                              style={{ 
                                                  width: '150px', 
                                                  height: '150px', 
                                                  objectFit: 'contain', 
                                                  borderRadius: '8px', 
                                                  border: '2px solid #b8860b', 
                                                  cursor: 'pointer',
                                                  backgroundColor: '#f9f9f9'
                                              }}
                                              onError={(e) => {
                                                  console.error('Failed to load receipt image:', selectedEnrollment.payments?.[0]?.receipt_path);
                                                  e.target.src = 'https://via.placeholder.com/150?text=Image+Unavailable';
                                                  e.target.style.border = '2px solid #d32f2f';
                                              }}
                                          />
                                      </a>
                                      <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
                                          📸 Click image to view full size
                                      </p>
                                  </div>
                              </div>
                          )}
                      </div>


                      {selectedEnrollment.siblings && selectedEnrollment.siblings.length > 0 && (
                        <section className="sibling-section" style={{ marginTop: '20px' }}>
                          <h4>Siblings Enrolled</h4>
                          <ul>
                            {selectedEnrollment.siblings.map((s, idx) => (
                              <li key={idx}>{s.full_name} - {s.birth_date}</li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>
                    
                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px' }}>
                      <button 
                        onClick={() => generatePDF(selectedEnrollment)} 
                        className="btn-pdf"
                        style={{ backgroundColor: '#2e7d32', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                      >
                        📥 Download PDF Record
                      </button>
                      <button onClick={closeModal} className="btn-close-modal" style={{ margin: 0 }}>Close</button>
                    </div>
                  </div>
                </div>
              )}

    </div>
  );
}
