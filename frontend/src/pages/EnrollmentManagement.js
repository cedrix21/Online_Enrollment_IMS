import { useEffect, useState, useMemo, useCallback, memo } from "react";
import API from "../api/api";
import { useNavigate, useLocation } from "react-router-dom";
import "./EnrollmentManagement.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logo from "../assets/sics-logo.png";
import { API_BASE_URL } from "../config";

import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";

// ── Requirements Checklist Component ─────────────────────────────────────────
const RequirementsChecklist = ({ enrollmentId, onStatusUpdated }) => {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Map backend type to display label
  const getDisplayLabel = (type) => {
    const labels = {
      'id_picture': 'ID Pictures (1x1 & 2x2)',
      '1x1_picture': 'ID Pictures (1x1 & 2x2)',
      '2x2_picture': 'ID Pictures (1x1 & 2x2)',
      'kids_note': "Kid's Note App Installed",
      'psa_birth_certificate': 'PSA Birth Certificate',
      'good_moral': 'Good Moral',
      'report_card': 'Report Card',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  useEffect(() => {
    API.get(`/enrollments/${enrollmentId}/requirements`)
      .then(res => setRequirements(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [enrollmentId]);

  const handleStatusChange = async (req, status) => {
    const type = req.type;
    const displayLabel = getDisplayLabel(type);
    
    console.log('Changing status:', { type, displayLabel, status });

    try {
      await API.put(`/requirements/${req.id}/status`, { status });
      setRequirements(prev =>
        prev.map(r => r.id === req.id ? { ...r, status } : r)
      );
      if (onStatusUpdated) {
        // Pass both the raw type and display label for flexibility
        onStatusUpdated(type, displayLabel, status);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const statusColor = (status) => ({
    pending:  { background: '#fff3e0', color: '#e65100' },
    verified: { background: '#e8f5e9', color: '#2e7d32' },
    rejected: { background: '#ffebee', color: '#c62828' },
  }[status] || {});

  if (loading) return <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading documents...</p>;

  if (requirements.length === 0) return (
    <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
      No documents uploaded by applicant.
    </p>
  );

  return (
    <div style={{ marginTop: '16px' }}>
      <h4 style={{ color: '#b8860b', marginBottom: '10px', fontSize: '0.95rem' }}>
        📎 Uploaded Requirements
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {requirements.map(req => (
          <div key={req.id} style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '12px 14px', background: '#f8fafc', borderRadius: '8px',
            border: '1px solid #e2e8f0', gap: '12px', flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div>
                <a href={req.url} target="_blank" rel="noreferrer">
                  <img
                    src={req.url}
                    alt={getDisplayLabel(req.type)}
                    style={{
                      width: '72px', height: '72px', objectFit: 'cover',
                      borderRadius: '6px', border: '2px solid #e2e8f0',
                      cursor: 'pointer', backgroundColor: '#f1f5f9',
                      display: 'block'
                    }}
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement?.nextSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                </a>
                <div style={{
                  display: 'none', width: '72px', height: '72px',
                  border: '2px solid #e2e8f0', borderRadius: '6px',
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#f1f5f9', fontSize: '2rem',
                }}>
                  <a href={req.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    📄
                  </a>
                </div>
                <a href={req.url} target="_blank" rel="noreferrer"
                  style={{ display: 'block', marginTop: '4px', fontSize: '0.72rem', color: '#b8860b', textDecoration: 'none', textAlign: 'center' }}
                >
                  👁 Full size
                </a>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{getDisplayLabel(req.type)}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', wordBreak: 'break-all', maxWidth: '200px' }}>
                  {req.original_name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#b0b8c1', marginTop: '2px' }}>Uploaded: {req.created_at}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
              <span style={{ ...statusColor(req.status), padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                {req.status}
              </span>
              <select
                value={req.status}
                onChange={e => handleStatusChange(req, e.target.value)}
                style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: 'pointer', backgroundColor: '#fff' }}
              >
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Memoized table row ────────────────────────────────────────────────────────
const EnrollmentRow = memo(
  ({ enrollment, onView, onUpdateStatus, onUpdateRequirement }) => (
    <tr>
      <td data-label="Name">
        {enrollment.firstName} {enrollment.lastName}
        <div style={{ fontSize: "11px", color: "#8b7500" }}>
          {enrollment.registrationType}
        </div>
      </td>
      <td data-label="Email">{enrollment.email}</td>
      <td data-label="Grade">{enrollment.gradeLevel}</td>

      <td data-label="Requirements">
        <div
          className="req-icons"
          style={{ display: "flex", gap: "8px", fontSize: "1.1rem" }}
        >
          <button
            title="ID Pictures (1x1 & 2x2)"
            onClick={() =>
              onUpdateRequirement(
                enrollment.id,
                "id_picture_received",
                !enrollment.id_picture_received,
              )
            }
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.1rem",
              padding: "4px 8px",
              borderRadius: "4px",
              backgroundColor: enrollment.id_picture_received
                ? "#e8f5e9"
                : "#ffebee",
              transition: "all 0.2s",
            }}
          >
            {enrollment.id_picture_received ? "🖼️" : "⭕"}
          </button>
          <button
            title="Kid's Note App"
            onClick={() =>
              onUpdateRequirement(
                enrollment.id,
                "kids_note_installed",
                !enrollment.kids_note_installed,
              )
            }
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.1rem",
              padding: "4px 8px",
              borderRadius: "4px",
              backgroundColor: enrollment.kids_note_installed
                ? "#e8f5e9"
                : "#ffebee",
              transition: "all 0.2s",
            }}
          >
            {enrollment.kids_note_installed ? "📱" : "⭕"}
          </button>

          {(enrollment.registrationType === "New Student" ||
            enrollment.registrationType === "Transferee") && (
            <button
              title="PSA Birth Certificate"
              onClick={() =>
                onUpdateRequirement(
                  enrollment.id,
                  "psa_received",
                  !enrollment.psa_received,
                )
              }
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.1rem",
                padding: "4px 8px",
                borderRadius: "4px",
                backgroundColor: enrollment.psa_received
                  ? "#e8f5e9"
                  : "#ffebee",
                transition: "all 0.2s",
              }}
            >
              {enrollment.psa_received ? "📜" : "⭕"}
            </button>
          )}

          {enrollment.registrationType === "Transferee" && (
            <>
              <button
                title="Good Moral"
                onClick={() =>
                  onUpdateRequirement(
                    enrollment.id,
                    "good_moral_received",
                    !enrollment.good_moral_received,
                  )
                }
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  backgroundColor: enrollment.good_moral_received
                    ? "#e8f5e9"
                    : "#ffebee",
                  transition: "all 0.2s",
                }}
              >
                {enrollment.good_moral_received ? "⭐" : "⭕"}
              </button>
              <button
                title="Report Card"
                onClick={() =>
                  onUpdateRequirement(
                    enrollment.id,
                    "report_card_received",
                    !enrollment.report_card_received,
                  )
                }
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  backgroundColor: enrollment.report_card_received
                    ? "#e8f5e9"
                    : "#ffebee",
                  transition: "all 0.2s",
                }}
              >
                {enrollment.report_card_received ? "📊" : "⭕"}
              </button>
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
            style={{ backgroundColor: "#b8860b", color: "white" }}
            onClick={() => onView(enrollment)}
          >
            View
          </button>
          {enrollment.status === "pending" && (
            <>
              <button
                className="approve"
                onClick={() => onUpdateStatus(enrollment.id, "approved")}
              >
                Approve
              </button>
              <button
                className="reject"
                onClick={() => onUpdateStatus(enrollment.id, "rejected")}
              >
                Reject
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  ),
);

// ── Main Component ────────────────────────────────────────────────────────────
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

  const [filterStatus, setFilterStatus] = useState(
    () => location.state?.filter || "all",
  );
  const [filterPaymentMethod, setFilterPaymentMethod] = useState(
    () => location.state?.paymentFilter || "all",
  );
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterRequirements, setFilterRequirements] = useState("all");

  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterSchoolYear, setFilterSchoolYear] = useState('all');
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const closeModal = useCallback(() => {
    setSelectedEnrollment(null);
  }, []);

  // Auth guard + initial fetch
  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "registrar")) {
      navigate("/dashboard");
    } else {
      fetchEnrollments();
    }
  }, [user, navigate]);

  // Sync location state filters
  useEffect(() => {
    if (location.state?.filter) setFilterStatus(location.state.filter);
    if (location.state?.paymentFilter)
      setFilterPaymentMethod(location.state.paymentFilter);
  }, [location.state?.filter, location.state?.paymentFilter]);

  const fetchEnrollments = async () => {
  setIsLoading(true);
  try {
    const res = await API.get("/enrollments", {
      params: { school_year: filterSchoolYear }
    });
    setEnrollments(res.data);
  } catch {
    setMessage("Failed to load enrollments");
  } finally {
    setIsLoading(false);
  }
};


useEffect(() => {
  fetchEnrollments();
}, [filterSchoolYear]);


  const updateStatus = useCallback(
    async (id, status) => {
      if (!window.confirm(`Are you sure you want to mark this as ${status}?`))
        return;
      setEnrollments((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e)),
      );
      try {
        const enrollment = enrollments.find((e) => e.id === id);
        if (
          status === "approved" &&
          enrollment?.payments?.[0]?.paymentMethod === "Cash"
        ) {
          const payment = enrollment.payments[0];
          await API.put(
            `/admin/billing/payment/${payment.id}`,
            { amount_paid: 5000 },
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        await API.put(`/enrollment/${id}/status`, { status });
        setMessage(`Enrollment ${status} successfully`);
        fetchEnrollments();
      } catch {
        setMessage("Action failed");
        fetchEnrollments();
      }
    },
    [enrollments],
  );

  const handleUpdateRequirement = useCallback(
    async (enrollmentId, requirementField, value) => {
      try {
        setEnrollments((prev) =>
          prev.map((e) =>
            e.id === enrollmentId ? { ...e, [requirementField]: value } : e,
          ),
        );
        await API.put(`/enrollment/${enrollmentId}/requirement`, {
          field: requirementField,
          value,
        });
        setMessage("Requirement updated successfully");
      } catch {
        setMessage("Failed to update requirement");
        fetchEnrollments();
      }
    },
    [],
  );

  // Sync requirement status from modal to table row
 const handleRequirementStatusChange = useCallback(
  (enrollmentId, type, displayLabel, status) => {
    if (!type) {
      console.warn('handleRequirementStatusChange: type is undefined');
      return;
    }

    console.log('🔔 Requirement status changed:', { enrollmentId, type, status });

    setEnrollments(prev =>
      prev.map(e => {
        if (e.id !== enrollmentId) return e;
        const updated = { ...e };
        const isVerified = status === 'verified';
        const typeLower = type.toLowerCase();

        // Picture requirement (1x1, 2x2, or combined)
        if (
          typeLower.includes('picture') ||
          typeLower.includes('photo') ||
          typeLower.includes('1x1') ||
          typeLower.includes('2x2') ||
          typeLower === 'id_picture'
        ) {
          updated.id_picture_received = isVerified;
        }
        // Kid's Note App
        else if (
          typeLower.includes('kids_note') ||
          typeLower.includes('kid_note') ||
          typeLower.includes('app') ||
          typeLower === 'kids_note_installed'
        ) {
          updated.kids_note_installed = isVerified;
        }
        // PSA Birth Certificate
        else if (
          typeLower.includes('psa') ||
          typeLower.includes('birth') ||
          typeLower === 'psa_birth_certificate'
        ) {
          updated.psa_received = isVerified;
        }
        // Good Moral
        else if (
          typeLower.includes('good_moral') ||
          typeLower === 'good_moral'
        ) {
          updated.good_moral_received = isVerified;
        }
        // Report Card
        else if (
          typeLower.includes('report_card') ||
          typeLower.includes('form138') ||
          typeLower === 'report_card'
        ) {
          updated.report_card_received = isVerified;
        }
        else {
          console.warn('Unknown requirement type:', type);
        }

        return updated;
      })
    );
  },
  []
);

  const isRequirementsComplete = useCallback((enrollment) => {
    if (!enrollment.id_picture_received) return false;
    if (!enrollment.kids_note_installed) return false;
    if (
      enrollment.registrationType === "New Student" ||
      enrollment.registrationType === "Transferee"
    ) {
      if (!enrollment.psa_received) return false;
    }
    if (enrollment.registrationType === "Transferee") {
      if (!enrollment.good_moral_received) return false;
      if (!enrollment.report_card_received) return false;
    }
    return true;
  }, []);

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
      const matchesGrade =
        filterGrade === "all" || e.gradeLevel === filterGrade;
      let matchesRequirements = true;
      if (filterRequirements !== "all") {
        const complete = isRequirementsComplete(e);
        matchesRequirements =
          filterRequirements === "complete" ? complete : !complete;
      }
      return (
        matchesSearch &&
        matchesFilter &&
        matchesPaymentMethod &&
        matchesGrade &&
        matchesRequirements
      );
    });
  }, [
    enrollments,
    debouncedSearchTerm,
    filterStatus,
    filterPaymentMethod,
    filterGrade,
    filterRequirements,
    isRequirementsComplete,
  ]);

  const handleViewEnrollment = useCallback((enrollment) => {
    setSelectedEnrollment(enrollment);
  }, []);

  const generatePDF = useCallback((enrollment) => {
    requestAnimationFrame(() => {
      const doc = new jsPDF();
      const img = new Image();
      img.src = logo;
      img.onload = () => {
        doc.addImage(img, "PNG", 10, 10, 20, 20);
        doc.setFontSize(18);
        doc.setTextColor(184, 134, 11);
        doc.text("SICS - Enrollment Record", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 28, {
          align: "center",
        });

        autoTable(doc, {
          startY: 35,
          head: [["Field", "Details"]],
          body: [
            ["Registration ID", enrollment.id],
            [
              "Full Name",
              `${enrollment.lastName}, ${enrollment.firstName} ${
                enrollment.middleName || ""
              }`,
            ],
            ["Grade Level", enrollment.gradeLevel],
            ["Registration Type", enrollment.registrationType],
            ["Email", enrollment.email],
            ["Gender", enrollment.gender],
            ["Birth Date", enrollment.dateOfBirth],
            ["Medical Conditions", enrollment.medicalConditions || "None"],
            ...(enrollment.student
              ? [
                  ["Student ID", enrollment.student.studentId || ""],
                  ["School Year", enrollment.student.school_year || ""],
                  ["Section", enrollment.student.section?.name || "Unassigned"],
                ]
              : []),
          ],
          theme: "striped",
          headStyles: { fillColor: [247, 225, 75] },
        });

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [["Guardian", "Name", "Contact", "Email"]],
          body: [
            [
              "Father",
              enrollment.fatherName,
              enrollment.fatherContact,
              enrollment.fatherEmail,
            ],
            [
              "Mother",
              enrollment.motherName,
              enrollment.motherContact,
              enrollment.motherEmail,
            ],
            ["Emergency", "N/A", enrollment.emergencyContact, "N/A"],
          ],
        });

        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [["Requirement", "Status"]],
          body: [
            [
              "ID Pictures (1x1 & 2x2)",
              enrollment.id_picture_received ? "Verified" : "Missing",
            ],
            [
              "Kid's Note App",
              enrollment.kids_note_installed ? "Installed" : "Not Installed",
            ],
            [
              "PSA Birth Cert",
              enrollment.psa_received ? "Verified" : "Missing",
            ],
          ],
        });

        doc.save(`Enrollment_${enrollment.lastName}.pdf`);
      };
    });
  }, []);

  const exportToExcel = useCallback(() => {
    setTimeout(() => {
      const excelData = filteredData.map((e) => ({
        "First Name": e.firstName,
        "Last Name": e.lastName,
        Email: e.email,
        "Grade Level": e.gradeLevel,
        Type: e.registrationType,
        Status: e.status,
        "PSA Received": e.psa_received ? "Yes" : "No",
        "ID Pictures (1x1 & 2x2)": e.id_picture_received ? "Yes" : "No",
        "App Installed": e.kids_note_installed ? "Yes" : "No",
        "Date Enrolled": e.enrollmentDate,
      }));
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollments");
      XLSX.writeFile(
        workbook,
        `Enrollment_List_${filterStatus}_${new Date().toLocaleDateString()}.xlsx`,
      );
    }, 0);
  }, [filteredData, filterStatus]);

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

        <div
          className="content-scroll-area"
          style={{ padding: "20px", overflowY: "auto", flex: 1 }}
        >
          <div className="management-container">
            <div className="management-header">
              <h2>Enrollment Management</h2>
              {message && <p className="message-toast">{message}</p>}
            </div>

            {/* ── Filters ── */}
            <div className="admin-actions">
              <div
                className="search-filter-group"
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  placeholder="Search name or email..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "13px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    minWidth: "180px",
                  }}
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "13px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    minWidth: "140px",
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "13px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    minWidth: "150px",
                  }}
                >
                  <option value="all">All Payment Methods</option>
                  <option value="Cash">Cash (Walk-in)</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "13px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    minWidth: "140px",
                  }}
                >
                  <option value="all">All Grades</option>
                  <option value="Nursery">Nursery</option>
                  <option value="Kindergarten 1">Kindergarten 1</option>
                  <option value="Kindergarten 2">Kindergarten 2</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                </select>
                <select
                  value={filterRequirements}
                  onChange={(e) => setFilterRequirements(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "13px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    minWidth: "140px",
                  }}
                >
                  
                  <option value="all">All Requirements</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                  </select>

                   {/* 🆕 School Year Dropdown */}
                  <select
                    value={filterSchoolYear}
                    onChange={(e) => setFilterSchoolYear(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      fontSize: "13px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      minWidth: "140px",
                      backgroundColor: "#fff",
                    }}
                  >
                    <option value="all">All School Years</option>
                    {['2024-2025', '2025-2026', '2026-2027', '2027-2028'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                </select>
              </div>
              <div className="enrollment-btn-group">
                <button
                  className="enrollment-btn-add"
                  onClick={() => navigate("/admin/enroll")}
                >
                  Add Student
                </button>
                <button
                  className="enrollment-btn-excel"
                  onClick={exportToExcel}
                >
                  📊 Export to Excel
                </button>
                <button
                  className="enrollment-btn-qr"
                  onClick={() => navigate("/enrollment-qr")}
                >
                  Show QR
                </button>
              </div>
            </div>

            {/* ── Table ── */}
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
                          onUpdateRequirement={handleUpdateRequirement}
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

      {/* ── View Details Modal ── */}
      {selectedEnrollment && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Student Profile: {selectedEnrollment.firstName}{" "}
                {selectedEnrollment.lastName}
              </h3>
              <button className="close-btn" onClick={closeModal}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* ── Personal + Guardian ── */}
              <div className="info-grid">
                <section>
                  <h4>Personal Information</h4>
                  <p>
                    <strong>Nickname:</strong>{" "}
                    {selectedEnrollment.nickname || "N/A"}
                  </p>
                  <p>
                    <strong>Gender:</strong> {selectedEnrollment.gender}
                  </p>
                  <p>
                    <strong>Birthday:</strong> {selectedEnrollment.dateOfBirth}
                  </p>
                  <p>
                    <strong>Grade Level:</strong>{" "}
                    {selectedEnrollment.gradeLevel}
                  </p>
                  <p>
                    <strong>Handedness:</strong>{" "}
                    {selectedEnrollment.handedness || "N/A"}
                  </p>
                  <p>
                    <strong>Medical:</strong>{" "}
                    {selectedEnrollment.medicalConditions || "None"}
                  </p>
                </section>
                <section>
                  <h4>Parent/Guardian Info</h4>
                  <p>
                    <strong>Father:</strong> {selectedEnrollment.fatherName} (
                    {selectedEnrollment.fatherContact})
                  </p>
                  <p>
                    <strong>Mother:</strong> {selectedEnrollment.motherName} (
                    {selectedEnrollment.motherContact})
                  </p>
                  <p>
                    <strong>Emergency:</strong>{" "}
                    {selectedEnrollment.emergencyContact}
                  </p>
                </section>
              </div>

              {/* ── Official Enrollment Details (approved only) ── */}
              {selectedEnrollment.status === "approved" &&
                selectedEnrollment.student && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "15px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "8px",
                      border: "1px solid #90caf9",
                    }}
                  >
                    <h4
                      style={{
                        color: "#1976d2",
                        marginTop: 0,
                        borderBottom: "2px solid #1976d2",
                        paddingBottom: "5px",
                      }}
                    >
                      🎓 Official Enrollment Details
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                        marginTop: "10px",
                      }}
                    >
                      <p>
                        <strong>Student ID:</strong>{" "}
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: "bold",
                          }}
                        >
                          {selectedEnrollment.student.studentId}
                        </span>
                      </p>
                      <p>
                        <strong>School Year:</strong>{" "}
                        {selectedEnrollment.student.school_year}
                      </p>
                      <p>
                        <strong>Grade Level:</strong>{" "}
                        {selectedEnrollment.gradeLevel}
                      </p>
                      <p>
                        <strong>Section:</strong>{" "}
                        {selectedEnrollment.student.section?.name ||
                          "Unassigned"}
                      </p>
                    </div>
                  </div>
                )}

              {/* ── Payment Info ── */}
              <div
                className="payment-display-box"
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              >
                <h3>💳 Payment Information</h3>
                <div
                  className="details-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "15px",
                  }}
                >
                  <div className="detail-item">
                    <label>
                      <strong>Method:</strong>
                    </label>
                    <span
                      style={{
                        marginLeft: "10px",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          selectedEnrollment.payments?.[0]?.paymentMethod ===
                          "Cash"
                            ? "#fff3e0"
                            : "#e3f2fd",
                        color:
                          selectedEnrollment.payments?.[0]?.paymentMethod ===
                          "Cash"
                            ? "#e65100"
                            : "#0d47a1",
                        fontWeight: "bold",
                      }}
                    >
                      {selectedEnrollment.payments?.[0]?.paymentMethod || "N/A"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>
                      <strong>Amount:</strong>
                    </label>
                    <span style={{ marginLeft: "10px" }}>
                      ₱
                      {selectedEnrollment.payments?.[0]
                        ? Number(
                            selectedEnrollment.payments[0].amount_paid,
                          ).toLocaleString()
                        : "0.00"}
                    </span>
                  </div>

                  <div className="detail-item" style={{ gridColumn: "span 2" }}>
                    <label>
                      <strong>Reference / Status:</strong>
                    </label>
                    {selectedEnrollment.status === "approved" ? (
                      <span
                        style={{
                          marginLeft: "10px",
                          color: "#2e7d32",
                          fontWeight: "bold",
                        }}
                      >
                        ✅ Down payment is processed{" "}
                        {selectedEnrollment.payments?.[0]?.paymentMethod ===
                        "Cash"
                          ? "(Cash)"
                          : `(Ref: ${
                              selectedEnrollment.payments?.[0]?.reference_number
                            })`}
                      </span>
                    ) : selectedEnrollment.payments?.[0]?.paymentMethod ===
                      "Cash" ? (
                      <span
                        style={{
                          marginLeft: "10px",
                          color: "#d32f2f",
                          fontWeight: "bold",
                        }}
                      >
                        ⚠️ WALK-IN: Await physical payment at Registrar
                      </span>
                    ) : (
                      <span
                        className="ref-badge"
                        style={{
                          marginLeft: "10px",
                          backgroundColor: "#eee",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                        }}
                      >
                        {selectedEnrollment.payments?.[0]?.reference_number ||
                          "No Reference"}
                      </span>
                    )}
                  </div>
                </div>

                {selectedEnrollment.payments?.[0]?.receipt_path && (
                  <div className="receipt-preview" style={{ marginTop: '15px' }}>
                    <label><strong>Proof of Payment:</strong></label>
                    <div style={{ marginTop: '10px' }}>
                      <a
                        href={selectedEnrollment.payments[0].receipt_path}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={selectedEnrollment.payments[0].receipt_path}
                          alt="Receipt"
                          style={{
                            width: '150px',
                            height: '150px',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            border: '2px solid #b8860b',
                            cursor: 'pointer',
                            backgroundColor: '#f9f9f9',
                          }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/150?text=Image+Unavailable';
                            e.target.style.border = '2px solid #d32f2f';
                          }}
                        />
                      </a>
                      <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
                        📸 Click image to view full receipt
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Uploaded Requirements ── */}
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                }}
              >
                <h3>📁 Submitted Documents</h3>
                <RequirementsChecklist
                  enrollmentId={selectedEnrollment.id}
                  onStatusUpdated={(type, displayLabel, newStatus) =>
                    handleRequirementStatusChange(selectedEnrollment.id, type, displayLabel, newStatus)
                  }
                />
              </div>

              {/* ── Siblings ── */}
              {selectedEnrollment.siblings &&
                selectedEnrollment.siblings.length > 0 && (
                  <section
                    className="sibling-section"
                    style={{ marginTop: "20px" }}
                  >
                    <h4>Siblings Enrolled</h4>
                    <ul>
                      {selectedEnrollment.siblings.map((s, idx) => (
                        <li key={idx}>
                          {s.full_name} - {s.birth_date}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
            </div>

            <div
              className="modal-footer"
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 20px",
              }}
            >
              <button
                onClick={() => generatePDF(selectedEnrollment)}
                className="btn-pdf"
                style={{
                  backgroundColor: "#2e7d32",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                📥 Download PDF Record
              </button>
              <button
                onClick={closeModal}
                className="btn-close-modal"
                style={{ margin: 0 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}