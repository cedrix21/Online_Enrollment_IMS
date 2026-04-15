import { useState, useEffect, useMemo, useCallback, memo } from "react";
import API from "../api/api";
import "./EvaluationManagement.css";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt, FaSearch, FaPrint } from "react-icons/fa";
import printReportCard from "../components/printReportCard";

// GPA calculation – simple average of all grades
const calculateGPA = (grades) => {
  if (!grades || grades.length === 0) return "N/A";
  let sum = 0, count = 0;
  grades.forEach(g => {
    const score = parseFloat(g.score);
    if (!isNaN(score)) {
      sum += score;
      count++;
    }
  });
  return count === 0 ? "N/A" : (sum / count).toFixed(2);
};

// Helper to check if a subject is a MAPEH component
const isMapehComponent = (subjectCode) => {
  const code = subjectCode?.toUpperCase() || "";
  return code.includes("MUSIC") || code.includes("ARTS") || code.includes("PE") || code.includes("HEALTH");
};

// Extract base component name from subject code (e.g., "G4-MUSIC" -> "Music")
const getComponentName = (subjectCode) => {
  const code = subjectCode?.toUpperCase() || "";
  if (code.includes("MUSIC")) return "Music";
  if (code.includes("ARTS")) return "Arts";
  if (code.includes("PE")) return "Physical Education";
  if (code.includes("HEALTH")) return "Health";
  return subjectCode;
};


// MAPEH component sort order
const mapehComponentOrder = ['MUSIC', 'ARTS', 'PHYSICAL EDUCATION', 'HEALTH'];
const getMapehSortIndex = (subjectCode) => {
  const code = subjectCode?.toUpperCase() || '';
  const index = mapehComponentOrder.findIndex(m => code.includes(m));
  return index >= 0 ? index : mapehComponentOrder.length;
};

// ──────────────────────────────────────────────────────────────
// Helper Components (memoized)
// ──────────────────────────────────────────────────────────────
const GradeLevelFilter = memo(({ gradeLevels, selected, onSelect }) => (
  <div className="filters-section">
    <h3>Select Grade Level</h3>
    <div className="grade-level-buttons">
      {gradeLevels.map((level) => (
        <button
          key={level}
          className={`grade-level-btn ${selected === level ? "active" : ""}`}
          onClick={() => onSelect(level)}
        >
          {level}
        </button>
      ))}
    </div>
  </div>
));

const StudentCard = memo(({ student, onClick }) => (
  <div className="student-card" onClick={onClick}>
    <div className="student-card-header">
      <h4>{student.firstName} {student.lastName}</h4>
    </div>
    <div className="student-card-body">
      <p><strong>ID:</strong> {student.studentId || "N/A"}</p>
      <p><strong>Section:</strong> {student.section?.name || "N/A"}</p>
      <p className="click-hint">Click to view grades</p>
    </div>
  </div>
));

const StudentsList = memo(({ students, onSelectStudent }) => (
  <div className="students-section">
    <h3>Students</h3>
    <div className="students-grid">
      {students.length > 0 ? (
        students.map((student) => (
          <StudentCard key={student.id} student={student} onClick={() => onSelectStudent(student)} />
        ))
      ) : (
        <div className="no-students"><p>No students found.</p></div>
      )}
    </div>
  </div>
));

const GradeModal = memo(({
  student,
  grades,
  quarter,
  onQuarterChange,
  onClose,
  onEditStart,
  onSave,
  onCancel,
  editingId,
  editData,
  onEditChange,
  onPrintReportCard,
}) => {
  const [showGPA, setShowGPA] = useState(false);
  const [expandedMapeh, setExpandedMapeh] = useState(false);
  const currentGrades = grades[quarter] || [];

  // Group grades: separate MAPEH components from regular subjects
  const { regularSubjects, mapehComponents } = useMemo(() => {
    const regular = [];
    const components = [];
    currentGrades.forEach(grade => {
      if (isMapehComponent(grade.subject?.subjectCode)) {
        components.push(grade);
      } else {
        regular.push(grade);
      }
    });
    // Sort MAPEH components by custom order: Music, Arts, PE, Health
    components.sort((a, b) => {
      const indexA = getMapehSortIndex(a.subject?.subjectCode);
      const indexB = getMapehSortIndex(b.subject?.subjectCode);
      return indexA - indexB;
    });
    return { regularSubjects: regular, mapehComponents: components };
  }, [currentGrades]);

  // Calculate MAPEH average from component scores (only those with scores)
  const mapehAverage = useMemo(() => {
    const scores = mapehComponents
      .map(g => parseFloat(g.score))
      .filter(s => !isNaN(s));
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [mapehComponents]);

  // Calculate consolidated remark for MAPEH
  const mapehRemark = useMemo(() => {
    const remarks = mapehComponents.map(g => g.remarks?.toLowerCase() || '');
    // Check if any component remark contains "pass" or "passed"
    if (remarks.some(r => r.includes('pass') || r.includes('passed'))) {
      return 'Passed';
    }
    return ''; // or 'Pending' / 'Incomplete'
  }, [mapehComponents]);

  const quarterGPA = calculateGPA(currentGrades);
  const allGrades = useMemo(() => Object.values(grades).flat(), [grades]);
  const overallGPA = calculateGPA(allGrades);

  // Synthetic grade object for MAPEH row
  const mapehSyntheticGrade = mapehComponents.length > 0 ? {
    id: 'mapeh-synthetic',
    subject: { subjectName: 'MAPEH', subjectCode: 'MAPEH' },
    score: mapehAverage,
    teacher: { firstName: 'Multiple', lastName: 'Teachers' },
    remarks: mapehRemark,
  } : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="grade-management-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Grade Management: {student.firstName} {student.lastName}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-quarter-selector">
          <label>Select Quarter:</label>
          <div className="quarter-buttons">
            {["Q1", "Q2", "Q3", "Q4"].map((q) => (
              <button
                key={q}
                className={`quarter-btn ${quarter === q ? "active" : ""}`}
                onClick={() => onQuarterChange(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-grades-table">
          <table className="grades-table">
            <thead>
              <tr><th>Subject</th><th>Teacher</th><th>Score</th><th>Remarks</th><th>Action</th></tr>
            </thead>
            <tbody>
              {/* Regular subjects */}
              {regularSubjects.map((grade) => (
                <tr key={grade.id} className={editingId === grade.id ? "editing" : ""}>
                  <td>{grade.subject?.subjectName}</td>
                  <td>{grade.teacher ? `${grade.teacher.firstName} ${grade.teacher.lastName}` : "N/A"}</td>
                  <td className="center">
                    {editingId === grade.id ? (
                      <input type="number" min="0" max="100" value={editData.score} onChange={(e) => onEditChange("score", e.target.value)} className="edit-input" />
                    ) : (
                      <span className={`score-badge ${getScoreBadgeClass(grade.score)}`}>{grade.score}</span>
                    )}
                  </td>
                  <td>
                    {editingId === grade.id ? (
                      <input type="text" value={editData.remarks} onChange={(e) => onEditChange("remarks", e.target.value)} className="edit-input" placeholder="Remarks" />
                    ) : (
                      <span className="remarks-text">{grade.remarks || "-"}</span>
                    )}
                  </td>
                  <td className="action-cell">
                    {editingId === grade.id ? (
                      <div className="action-buttons"><button className="btn-save" onClick={() => onSave(grade.id)}>Save</button><button className="btn-cancel" onClick={onCancel}>Cancel</button></div>
                    ) : (
                      <button className="btn-edit" onClick={() => onEditStart(grade)}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}

              {/* MAPEH group */}
              {mapehComponents.length > 0 && (
                <>
                  {/* Main MAPEH row */}
                  <tr className="mapeh-main-row">
                    <td>
                      <div className="subject-name-container">
                        <span>MAPEH</span>
                        <button className="mapeh-expand-btn" onClick={() => setExpandedMapeh(!expandedMapeh)} title={expandedMapeh ? "Collapse" : "Expand"}>
                          {expandedMapeh ? "▼" : "▶"}
                        </button>
                      </div>
                      {!expandedMapeh && (
                        <div className="mapeh-components-label">
                          {mapehComponents.map(g => getComponentName(g.subject?.subjectCode)).join(" • ")}
                        </div>
                      )}
                    </td>
                    <td>Multiple Teachers</td>
                    <td className="center">
                      <span className={`score-badge ${getScoreBadgeClass(mapehAverage)}`}>
                        {mapehAverage !== null ? mapehAverage : "--"}
                      </span>
                    </td>
                    <td className="remarks-text">
                      {mapehRemark || " "}
                    </td>
                    <td className="action-cell">
                      <button className="btn-edit-disabled" disabled title="Edit components individually">Group</button>
                    </td>
                  </tr>

                  {/* Expanded component rows */}
                  {expandedMapeh && mapehComponents.map((grade) => (
                    <tr key={grade.id} className="mapeh-component-row">
                      <td className="mapeh-component-indent">
                        <div className="component-name">{getComponentName(grade.subject?.subjectCode)}</div>
                      </td>
                      <td>{grade.teacher ? `${grade.teacher.firstName} ${grade.teacher.lastName}` : "N/A"}</td>
                      <td className="center">
                        {editingId === grade.id ? (
                          <input type="number" min="0" max="100" value={editData.score} onChange={(e) => onEditChange("score", e.target.value)} className="edit-input" />
                        ) : (
                          <span className={`score-badge ${getScoreBadgeClass(grade.score)}`}>{grade.score}</span>
                        )}
                       </td>
                      <td>
                        {editingId === grade.id ? (
                          <input type="text" value={editData.remarks} onChange={(e) => onEditChange("remarks", e.target.value)} className="edit-input" placeholder="Remarks" />
                        ) : (
                          <span className="remarks-text">{grade.remarks || "-"}</span>
                        )}
                       </td>
                      <td className="action-cell">
                        {editingId === grade.id ? (
                          <div className="action-buttons"><button className="btn-save" onClick={() => onSave(grade.id)}>Save</button><button className="btn-cancel" onClick={onCancel}>Cancel</button></div>
                        ) : (
                          <button className="btn-edit" onClick={() => onEditStart(grade)}>Edit</button>
                        )}
                       </td>
                    </tr>
                  ))}
                </>
              )}

              {currentGrades.length === 0 && (
                <tr className="no-data"><td colSpan="5">No grades for {quarter}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="gpa-section">
          <button className="btn-gpa-toggle" onClick={() => setShowGPA(!showGPA)}>
            {showGPA ? "Hide GPA" : "Show GPA"}
          </button>
          {showGPA && (
            <div className="gpa-summary">
              <div className="gpa-box"><span className="gpa-label">Quarter GPA:</span><span className="gpa-value">{quarterGPA}</span></div>
              <div className="gpa-box"><span className="gpa-label">Overall GPA:</span><span className="gpa-value">{overallGPA}</span></div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-print" onClick={onPrintReportCard}><FaPrint /> Report Card</button>
          <button className="btn-close-modal" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
});


// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
const EvaluationManagement = () => {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const navigate = useNavigate();

  // Data states
  const [allGrades, setAllGrades] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter states
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [studentGrades, setStudentGrades] = useState({});
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [editData, setEditData] = useState({});

  
  // Teacher name state (dynamic)
  const [teacherName, setTeacherName] = useState('');

  // 🆕 School year filter
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(() => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  });
  // ────────────────────────────────────────────────────────────
  // Data fetching
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "admin" && user.role !== "registrar") {
      navigate("/dashboard");
      return;
    }
    fetchAllGrades();
    fetchAllSubjects();
  }, []);

  const fetchAllGrades = async (showRefreshing = false) => {
  try {
    if (showRefreshing) {
      setRefreshing(true);
      setSuccess("Refreshing data...");
    } else {
      setLoading(true);
    }

    const res = await API.get("/admin/grades", {
      params: { school_year: selectedSchoolYear }
    });
    const gradesData = res.data.data || [];
    setAllGrades(gradesData);

    setError("");
    if (showRefreshing) {
      setSuccess("Data refreshed successfully!");
      setTimeout(() => setSuccess(""), 2000);
    }
  } catch (err) {
    console.error("Error fetching grades:", err);
    if (err.response?.status === 404 || err.response?.data?.message?.includes("No grades found")) {
      setAllGrades([]);
      if (showRefreshing) {
        setSuccess("No grades available yet");
        setTimeout(() => setSuccess(""), 2000);
      }
    } else if (err.response?.status !== 401) {
      setError("Failed to fetch grades: " + (err.response?.data?.message || err.message));
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
useEffect(() => {
  fetchAllGrades();
}, [selectedSchoolYear]);

  const handleRefresh = () => fetchAllGrades(true);

  const fetchAllSubjects = async () => {
    try {
      const res = await API.get("/admin/subjects");
      const subjectsData = res.data || [];
      setAllSubjects(subjectsData);
      console.log('✅ Subjects fetched:', subjectsData);
    } catch (err) {
      console.error("Error fetching subjects:", err);
      setAllSubjects([]);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Memoized derived data
  // ────────────────────────────────────────────────────────────
  const gradeLevels = useMemo(() => {
    const levels = new Set(allGrades.map(g => g.student?.gradeLevel).filter(Boolean));
    return [...levels].sort();
  }, [allGrades]);

  useEffect(() => {
    if (gradeLevels.length > 0 && !selectedGradeLevel) {
      setSelectedGradeLevel(gradeLevels[0]);
    }
  }, [gradeLevels, selectedGradeLevel]);

  const studentsInGrade = useMemo(() => {
    if (!selectedGradeLevel) return [];
    const studentsMap = new Map();
    allGrades
      .filter(g => g.student?.gradeLevel === selectedGradeLevel)
      .forEach(g => {
        const student = g.student;
        if (student && !studentsMap.has(student.id)) {
          studentsMap.set(student.id, student);
        }
      });
    return Array.from(studentsMap.values()).sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    );
  }, [allGrades, selectedGradeLevel]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return studentsInGrade;
    const term = studentSearch.toLowerCase();
    return studentsInGrade.filter(s =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
      s.studentId?.toLowerCase().includes(term)
    );
  }, [studentsInGrade, studentSearch]);

  // ────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────
  const openStudentModal = useCallback((student) => {
  setSelectedStudent(student);
  setSelectedQuarter("Q1");

  // 1. Get existing grades for this student
  const existingGrades = allGrades.filter(g => g.student?.id === student.id);

  // 2. Get subjects for the student's grade level
  const gradeLevelSubjects = allSubjects.filter(
    sub => sub.gradeLevel === student.gradeLevel
  );

  // 3. Build a complete map for all quarters and subjects
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const completeGradesByQuarter = {};

  quarters.forEach(quarter => {
    completeGradesByQuarter[quarter] = gradeLevelSubjects.map(subject => {
      // Find existing grade for this subject and quarter
      const existing = existingGrades.find(
        g => g.subject_id === subject.id && g.quarter === quarter
      );
      
      if (existing) {
        return existing;
      }
      
      // Create placeholder with empty score and remarks
      return {
        id: `placeholder-${subject.id}-${quarter}`,
        student_id: student.id,
        subject_id: subject.id,
        quarter: quarter,
        score: '',
        remarks: '',
        subject: subject,
        teacher: null,
        isPlaceholder: true,
      };
    });
  });

  setStudentGrades(completeGradesByQuarter);

  // Extract adviser name from section advisor
  if (student.section?.advisor) {
    const advisor = student.section.advisor;
    setTeacherName(`${advisor.firstName} ${advisor.lastName}`);
  } else {
    setTeacherName('TBA');
  }

  setModalOpen(true);
  setEditingGradeId(null);
  setEditData({});
}, [allGrades, allSubjects]);




  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedStudent(null);
    setEditingGradeId(null);
    setEditData({});
  }, []);

  const handleEditStart = useCallback((grade) => {
    setEditingGradeId(grade.id);
    setEditData({
      score: grade.score,
      remarks: grade.remarks,
    });
  }, []);

  const handleEditChange = useCallback((field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCancel = useCallback(() => {
    setEditingGradeId(null);
    setEditData({});
  }, []);

  const handleSave = useCallback(async (gradeId) => {
  // Prevent saving placeholder entries
  if (typeof gradeId === 'string' && gradeId.startsWith('placeholder-')) {
    setError("Cannot save placeholder grade. Please contact administrator.");
    return;
  }

  if (editData.score < 0 || editData.score > 100) {
    setError("Score must be between 0 and 100");
    return;
  }

  try {
    const res = await API.put(`/admin/grades/${gradeId}`, {
      score: editData.score,
      remarks: editData.remarks,
    });

    setAllGrades(prev => prev.map(g => g.id === gradeId ? res.data.grade : g));
    setStudentGrades(prev => {
      const updated = { ...prev };
      if (updated[selectedQuarter]) {
        updated[selectedQuarter] = updated[selectedQuarter].map(g =>
          g.id === gradeId ? res.data.grade : g
        );
      }
      return updated;
    });

    setEditingGradeId(null);
    setSuccess("Grade updated successfully!");
    setTimeout(() => setSuccess(""), 3000);
  } catch (err) {
    setError("Failed to update grade: " + (err.response?.data?.message || err.message));
  }
}, [editData, selectedQuarter]);

  const handlePrintReportCard = useCallback(() => {
    printReportCard({
      student: selectedStudent,
      teacherName: teacherName,
      principalName: "GERRY C. DAYON",
      schoolYear: selectedStudent?.school_year || "2025-2026",
      gradesData: studentGrades,
      subjects: allSubjects
    });
  }, [selectedStudent, teacherName, studentGrades, allSubjects]);

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dashboard-layout">
        <SideBar user={user} />
        <div className="main-content">
          <TopBar user={user} />
          <div className="content-scroll-area" style={{ padding: "20px" }}>
            <div className="evaluation-container">
              <div className="loading-spinner">Loading grades...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />
        <div className="content-scroll-area" style={{ padding: "20px" }}>
          <div className="evaluation-container">
            <div className="evaluation-header">
  <div>
    <h1>Student Grade Evaluation</h1>
    <p>Select a grade level and student to manage grades</p>
  </div>
  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
    <select
      value={selectedSchoolYear}
      onChange={(e) => setSelectedSchoolYear(e.target.value)}
      style={{
        padding: '8px 16px',
        borderRadius: '6px',
        border: '1px solid #b8860b',
        background: '#fff',
        fontSize: '0.9rem',
        cursor: 'pointer'
      }}
    >
      {['2024-2025', '2025-2026', '2026-2027', '2027-2028'].map(y => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="refresh-btn"
    >
      <FaSyncAlt className={refreshing ? "spinning" : ""} />
      {refreshing ? " Refreshing..." : " Refresh"}
    </button>
  </div>
</div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {!loading && allGrades.length === 0 && (
              <div className="no-data-state">
                <div style={{ fontSize: "4rem", marginBottom: "20px" }}>📊</div>
                <h3>No Grades Available Yet</h3>
                <p>Grades will appear here once teachers start inputting evaluations.</p>
                <button onClick={handleRefresh} disabled={refreshing} className="refresh-btn-large">
                  <FaSyncAlt className={refreshing ? "spinning" : ""} />
                  {refreshing ? " Checking..." : " Check for Updates"}
                </button>
              </div>
            )}

            {gradeLevels.length > 0 && (
              <GradeLevelFilter
                gradeLevels={gradeLevels}
                selected={selectedGradeLevel}
                onSelect={setSelectedGradeLevel}
              />
            )}

            {selectedGradeLevel && (
              <div className="students-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3>Students in {selectedGradeLevel}</h3>
                  <div className="student-search">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search by name or ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="student-search-input"
                    />
                  </div>
                </div>

                <StudentsList
                  students={filteredStudents}
                  onSelectStudent={openStudentModal}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && selectedStudent && (
        <GradeModal
          student={selectedStudent}
          grades={studentGrades}
          quarter={selectedQuarter}
          onQuarterChange={setSelectedQuarter}
          onClose={closeModal}
          onEditStart={handleEditStart}
          onSave={handleSave}
          onCancel={handleCancel}
          editingId={editingGradeId}
          editData={editData}
          onEditChange={handleEditChange}
          onPrintReportCard={handlePrintReportCard}
          
        />
      )}
    </div>
  );
};

const getScoreBadgeClass = (score) => {
  if (score >= 90) return "score-excellent";
  if (score >= 80) return "score-good";
  if (score >= 70) return "score-satisfactory";
  if (score >= 60) return "score-passing";
  return "score-failing";
};

export default EvaluationManagement;