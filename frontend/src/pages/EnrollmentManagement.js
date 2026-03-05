import { useEffect, useState, useMemo, useCallback, memo } from "react";
import API from "../api/api";
import { useNavigate, useLocation } from "react-router-dom";
import "./EnrollmentManagement.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logo from "../assets/sics-logo.png";
import { API_BASE_URL } from "../config"; 

// Import the Layout Components
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";

// Memoized table row component to prevent unnecessary re-renders
const EnrollmentRow = memo(({ enrollment, onView, onUpdateStatus }) => (
  <tr>
    <td data-label="Name">
      {enrollment.firstName} {enrollment.lastName}
      <div style={{fontSize: '11px', color: '#8b7500'}}>{enrollment.registrationType}</div>
    </td>
    <td data-label="Email">{enrollment.email}</td>
    <td data-label="Grade">{enrollment.gradeLevel}</td>
    
    <td data-label="Requirements">
      <div className="req-icons" style={{ display: 'flex', gap: '8px', fontSize: '1.1rem' }}>
        <span title="1x1 Picture" style={{ color: enrollment.id_picture_received ? '#2e7d32' : '#b71c1c' }}>
          {enrollment.id_picture_received ? '🖼️' : '⭕'}
        </span>
        <span title="Kid's Note App" style={{ color: enrollment.kids_note_installed ? '#2e7d32' : '#b71c1c' }}>
          {enrollment.kids_note_installed ? '📱' : '⭕'}
        </span>

        {(enrollment.registrationType === "New Student" || enrollment.registrationType === "Transferee") && (
          <span title="PSA Birth Certificate" style={{ color: enrollment.psa_received ? '#2e7d32' : '#b71c1c' }}>
            {enrollment.psa_received ? '📜' : '⭕'}
          </span>
        )}

        {enrollment.registrationType === "Transferee" && (
          <>
            <span title="Good Moral" style={{ color: enrollment.good_moral_received ? '#2e7d32' : '#b71c1c' }}>
              {enrollment.good_moral_received ? '⭐' : '⭕'}
            </span>
            <span title="Report Card" style={{ color: enrollment.report_card_received ? '#2e7d32' : '#b71c1c' }}>
              {enrollment.report_card_received ? '📊' : '⭕'}
            </span>
          </>
        )}
      </div>
    </td>

    <td data-label="Status">
      <span className={`status-pill ${enrollment.status}`}>
        {enrollment.status}
      </span>
    </td>
    <td data-label="Action">
      <div className="action-buttons">
        <button 
          className="view-btn" 
          style={{backgroundColor: '#b8860b', color: 'white'}}
          onClick={() => onView(enrollment)}
        >
          View
        </button>
        {enrollment.status === "pending" && (
          <>
            <button className="approve" onClick={() => onUpdateStatus(enrollment.id, "approved")}>Approve</button>
            <button className="reject" onClick={() => onUpdateStatus(enrollment.id, "rejected")}>Reject</button>
          </>
        )}
      </div>
    </td>
  </tr>
));

export default function EnrollmentManagement() {
  const [user] = useState(() => {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  });
  
  const [enrollments, setEnrollments] = useState([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use lazy initialization for filters
  const [filterStatus, setFilterStatus] = useState(() => location.state?.filter || "all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState(() => location.state?.paymentFilter || "all");
  
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [linkedStudent, setLinkedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Debounced search to prevent excessive filtering on each keystroke
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // Wait 300ms after last keystroke

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch linked student with loading state
  useEffect(() => {
    const fetchLinkedStudent = async () => {
      if (selectedEnrollment && selectedEnrollment.status === 'approved') {
        setIsModalLoading(true);
        try {
          const res = await API.get(`/students/search?email=${selectedEnrollment.email}`);
          setLinkedStudent(res.data);
        } catch (err) {
          console.error("Could not find linked student record");
          setLinkedStudent(null);
        } finally {
          setIsModalLoading(false);
        }
      } else {
        setLinkedStudent(null);
      }
    };
    
    fetchLinkedStudent();
  }, [selectedEnrollment]);

  // Memoized close modal function
  const closeModal = useCallback(() => {
    setSelectedEnrollment(null);
    setLinkedStudent(null);
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "registrar")) {
      navigate("/dashboard");
    } else {
      fetchEnrollments();
    }
  }, [user, navigate]);

  // Update filters from location state
  useEffect(() => {
    if (location.state?.filter) {
      setFilterStatus(location.state.filter);
    }
    if (location.state?.paymentFilter) {
      setFilterPaymentMethod(location.state.paymentFilter);
    }
  }, [location.state?.filter, location.state?.paymentFilter]);

  // Optimized fetch with loading state
  const fetchEnrollments = async () => {
    setIsLoading(true);
    try {
      const res = await API.get("/enrollments");
      setEnrollments(res.data);
    } catch (err) {
      setMessage("Failed to load enrollments");
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized update function
  const updateStatus = useCallback(async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this as ${status}?`))
      return;
    
    // Optimistic update
    setEnrollments(prev => 
      prev.map(e => e.id === id ? { ...e, status } : e)
    );
    
    try {
      await API.put(`/enrollment/${id}/status`, { status });
      setMessage(`Enrollment ${status} successfully`);
      
      // Refresh to ensure consistency
      fetchEnrollments();
    } catch (err) {
      setMessage("Action failed");
      // Revert optimistic update on error
      fetchEnrollments();
    }
  }, []);

  // Memoized filtered data - only recomputes when dependencies change
  const filteredData = useMemo(() => {
    const searchLower = debouncedSearchTerm.toLowerCase();
    
    return enrollments.filter((e) => {
      const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
      const matchesSearch = 
        debouncedSearchTerm === "" ||
        fullName.includes(searchLower) ||
        e.email.toLowerCase().includes(searchLower);
      
      const matchesFilter = filterStatus === "all" || e.status === filterStatus;
      
      const matchesPaymentMethod = 
        filterPaymentMethod === "all" || 
        e.payments?.[0]?.paymentMethod === filterPaymentMethod;

      return matchesSearch && matchesFilter && matchesPaymentMethod;
    });
  }, [enrollments, debouncedSearchTerm, filterStatus, filterPaymentMethod]);

  // Memoized view handler
  const handleViewEnrollment = useCallback((enrollment) => {
    setSelectedEnrollment(enrollment);
  }, []);

  // Optimized PDF generation
  const generatePDF = useCallback((student) => {
    // Use requestAnimationFrame to prevent UI blocking
    requestAnimationFrame(() => {
      const doc = new jsPDF();
      
      // Load image asynchronously
      const img = new Image();
      img.src = logo;
      img.onload = () => {
        doc.addImage(img, 'PNG', 10, 10, 20, 20);
        
        doc.setFontSize(18);
        doc.setTextColor(184, 134, 11);
        doc.text("SICS - Enrollment Record", 105, 20, { align: "center" });
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 28, { align: "center" });

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

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Guardian', 'Name', 'Contact', 'Email']],
          body: [
            ['Father', student.fatherName, student.fatherContact, student.fatherEmail],
            ['Mother', student.motherName, student.motherContact, student.motherEmail],
            ['Emergency', 'N/A', student.emergencyContact, 'N/A'],
          ],
        });

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

        doc.save(`Enrollment_${student.lastName}.pdf`);
      };
    });
  }, []);

  // Optimized Excel export
  const exportToExcel = useCallback(() => {
    // Use setTimeout to prevent UI blocking
    setTimeout(() => {
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
      XLSX.writeFile(workbook, `Enrollment_List_${filterStatus}_${new Date().toLocaleDateString()}.xlsx`);
    }, 0);
  }, [filteredData, filterStatus]);
  





if (!user) return null;

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
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
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="Cash">Cash (Walk-in)</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
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

            {isLoading ? (
              <div className="loading-spinner">Loading enrollments...</div>
            ) : (
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
                        <EnrollmentRow
                          key={e.id}
                          enrollment={e}
                          onView={handleViewEnrollment}
                          onUpdateStatus={updateStatus}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="no-data">
                          No students found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
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
            
            {isModalLoading ? (
              <div className="modal-loading">Loading student details...</div>
            ) : (
              <>
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
                      <div className="detail-item">
                        <label><strong>Method:</strong></label>
                        <span style={{ 
                          marginLeft: '10px', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: selectedEnrollment.payments?.[0]?.paymentMethod === 'Cash' ? '#fff3e0' : '#e3f2fd', 
                          color: selectedEnrollment.payments?.[0]?.paymentMethod === 'Cash' ? '#e65100' : '#0d47a1', 
                          fontWeight: 'bold' 
                        }}>
                          {selectedEnrollment.payments?.[0]?.paymentMethod || 'N/A'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <label><strong>Amount:</strong></label>
                        <span style={{ marginLeft: '10px' }}>
                          ₱{selectedEnrollment.payments?.[0] 
                            ? Number(selectedEnrollment.payments[0].amount_paid).toLocaleString() 
                            : '0.00'}
                        </span>
                      </div>
                      
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

                    {selectedEnrollment.status === 'approved' && linkedStudent && (
                      <div className="enrollment-details-card" style={{ gridColumn: 'span 2', marginBottom: '15px' }}>
                        <h4 style={{ color: '#1976d2', borderBottom: '2px solid #1976d2', paddingBottom: '5px' }}>
                          🎓 Official Enrollment Details
                        </h4>
                        <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                          <p><strong>Student ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{linkedStudent.studentId}</span></p>
                          <p><strong>School Year:</strong> <span className="school-year-badge">{linkedStudent.school_year}</span></p>
                          <p><strong>Grade Level:</strong> {linkedStudent.grade_level}</p>
                          <p><strong>Section:</strong> {linkedStudent.section?.name || "Unassigned"}</p>
                        </div>
                      </div>
                    )}

                    {selectedEnrollment.payments?.[0]?.paymentMethod !== 'Cash' && selectedEnrollment.payments?.[0]?.receipt_path && (
                      <div className="receipt-preview" style={{ marginTop: '15px' }}>
                        <label><strong>Proof of Payment:</strong></label>
                        <div style={{ marginTop: '10px' }}>
                          <a 
                            href={`${API_BASE_URL}/${selectedEnrollment.payments[0].receipt_path}`}
                            target="_blank" 
                            rel="noreferrer"
                          >
                            <img 
                              src={`${API_BASE_URL}/${selectedEnrollment.payments[0].receipt_path}`}
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
                              loading="lazy"
                              onError={(e) => {
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
