import { useState, useEffect, useMemo, useCallback, memo } from "react";
import API from "../api/api";
import "./EvaluationManagement.css";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt, FaSearch, FaPrint, FaTimes } from "react-icons/fa";
import printReportCard from "../components/printReportCard";
import { useCurrentSchoolYear } from "../hooks/useCurrentSchoolYear";

// ─── helpers ─── (unchanged)
const calculateGPA = (grades) => {
  if (!grades || grades.length === 0) return "N/A";
  let sum = 0, count = 0;
  grades.forEach(g => {
    const score = parseFloat(g.score);
    if (!isNaN(score)) { sum += score; count++; }
  });
  return count === 0 ? "N/A" : (sum / count).toFixed(2);
};

const isMapehComponent = (subjectCode) => {
  const code = subjectCode?.toUpperCase() || "";
  return code.includes("MUSIC") || code.includes("ARTS") || code.includes("PE") || code.includes("HEALTH");
};

const getComponentName = (subjectCode) => {
  const code = subjectCode?.toUpperCase() || "";
  if (code.includes("MUSIC")) return "Music";
  if (code.includes("ARTS")) return "Arts";
  if (code.includes("PE")) return "Physical Education";
  if (code.includes("HEALTH")) return "Health";
  return subjectCode;
};

const mapehComponentOrder = ['MUSIC', 'ARTS', 'PHYSICAL EDUCATION', 'HEALTH'];
const getMapehSortIndex = (subjectCode) => {
  const code = subjectCode?.toUpperCase() || '';
  const index = mapehComponentOrder.findIndex(m => code.includes(m));
  return index >= 0 ? index : mapehComponentOrder.length;
};

// ─── memoized sub‑components (unchanged) ───
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

const StudentCard = memo(({ student, isSelected, onClick }) => (
  <div
    id={`student-card-${student.id}`}  
    className={`student-card ${isSelected ? "selected" : ""}`}
    onClick={onClick}
  >
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

const StudentsList = memo(({ students, onSelectStudent, selectedStudentId }) => (
  <div className="students-section">
    <h3>Students</h3>
    <div className="students-grid">
      {students.length > 0 ? (
        students.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            isSelected={student.id === selectedStudentId}
            onClick={() => onSelectStudent(student)}
          />
        ))
      ) : (
        <div className="no-students"><p>No students found.</p></div>
      )}
    </div>
  </div>
));

// ─── Grades table (inlined from old GradeModal) ───
const GradesPanel = ({
  student,
  grades,
  quarter,
  onQuarterChange,
  onEditStart,
  onSave,
  onCancel,
  editingId,
  editData,
  onEditChange,
}) => {
  const [showGPA, setShowGPA] = useState(false);
  const [expandedMapeh, setExpandedMapeh] = useState(false);
  const currentGrades = grades[quarter] || [];

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
    components.sort((a, b) => {
      const indexA = getMapehSortIndex(a.subject?.subjectCode);
      const indexB = getMapehSortIndex(b.subject?.subjectCode);
      return indexA - indexB;
    });
    return { regularSubjects: regular, mapehComponents: components };
  }, [currentGrades]);

  const mapehAverage = useMemo(() => {
    const scores = mapehComponents.map(g => parseFloat(g.score)).filter(s => !isNaN(s));
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [mapehComponents]);

  const mapehRemark = useMemo(() => {
    const remarks = mapehComponents.map(g => g.remarks?.toLowerCase() || '');
    if (remarks.some(r => r.includes('pass') || r.includes('passed'))) return 'Passed';
    return '';
  }, [mapehComponents]);

  const quarterGPA = calculateGPA(currentGrades);
  const allGrades = useMemo(() => Object.values(grades).flat(), [grades]);
  const overallGPA = calculateGPA(allGrades);

  return (
    <div className="grades-panel">
      {/* Quarter selector */}
      <div className="quarter-selector">
        <label>Quarter:</label>
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

      {/* Grades table */}
      <div className="grades-table-wrapper">
        <table className="grades-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Grade</th>
              <th>Remarks</th>
              <th>Action</th>
            </tr>
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
                    <div className="action-buttons">
                      <button className="btn-save" onClick={() => onSave(grade.id)}>Save</button>
                      <button className="btn-cancel" onClick={onCancel}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn-edit" onClick={() => onEditStart(grade)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}

            {/* MAPEH group */}
            {mapehComponents.length > 0 && (
              <>
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
                  <td className="remarks-text">{mapehRemark || " "}</td>
                  <td className="action-cell">
                    <button className="btn-edit-disabled" disabled title="Edit components individually">Group</button>
                  </td>
                </tr>
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

      {/* GPA */}
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
    </div>
  );
};

// ─── Main Component ───
const EvaluationManagement = () => {
  const [user] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw && raw !== "undefined" && raw !== "null") return JSON.parse(raw);
    } catch {}
    return null;
  });
  const navigate = useNavigate();
  const { schoolYear: currentSchoolYear, loading: yearLoading } = useCurrentSchoolYear();
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
  const [attendanceMonths, setAttendanceMonths] = useState([]);
  const [observedValues, setObservedValues] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedGradeLevel, setSelectedGradeLevel] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [filterSection, setFilterSection] = useState("all");

  // Master‑detail
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentGrades, setStudentGrades] = useState({});
  const [gradesLoading, setGradesLoading] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [editData, setEditData] = useState({});
  const [teacherName, setTeacherName] = useState('');

  // Derived
  const selectedStudent = useMemo(() => {
    // search through the current grade students (or all grades)
    if (!selectedGradeLevel || !selectedStudentId) return null;
    const studentsMap = new Map();
    allGrades.forEach(g => {
      if (g.student && g.student.id === selectedStudentId && g.student.gradeLevel === selectedGradeLevel) {
        studentsMap.set(g.student.id, g.student);
      }
    });
    return studentsMap.get(selectedStudentId) || null;
  }, [allGrades, selectedGradeLevel, selectedStudentId]);

  useEffect(() => {
  if (selectedStudentId) {
    const el = document.getElementById(`student-card-${selectedStudentId}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedStudentId]);

  // ── School year init ──
  useEffect(() => {
    if (currentSchoolYear && !selectedSchoolYear) setSelectedSchoolYear(currentSchoolYear);
  }, [currentSchoolYear, selectedSchoolYear]);

  // ── Auth guard & initial data ──
  useEffect(() => {
    let cancelled = false;
    if (!user) { navigate("/login"); return; }
    if (user.role !== "admin" && user.role !== "registrar") { navigate("/dashboard"); return; }

    const loadInitialData = async () => {
      if (selectedSchoolYear) {
        await fetchAllGrades(false, { cancelled });
      }
      try {
        const res = await API.get("/admin/subjects");
        if (!cancelled) setAllSubjects(res.data || []);
      } catch (err) {
        if (!cancelled) console.error("Error fetching subjects:", err);
      }
    };
    loadInitialData();
    return () => { cancelled = true; };
  }, [user, navigate, selectedSchoolYear]);

  // ── Data fetching ──
  const fetchAllGrades = async (showRefreshing = false, signal = { cancelled: false }) => {
    if (!selectedSchoolYear) return;
    try {
      if (showRefreshing) {
        if (!signal.cancelled) setRefreshing(true);
        if (!signal.cancelled) setSuccess("Refreshing data...");
      } else {
        if (!signal.cancelled) setLoading(true);
      }
      const res = await API.get("/admin/grades", { params: { school_year: selectedSchoolYear } });
      const gradesData = res.data.data || [];
      if (!signal.cancelled) {
        setAllGrades(gradesData);
        setError("");
        if (showRefreshing) {
          setSuccess("Data refreshed successfully!");
          setTimeout(() => setSuccess(""), 2000);
        }
      }
    } catch (err) {
      if (!signal.cancelled) {
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
      }
    } finally {
      if (!signal.cancelled) {
        if (showRefreshing) setRefreshing(false);
        else setLoading(false);
      }
    }
  };

  // // ── Re‑fetch on filter change ──
  // useEffect(() => {
  //   if (!selectedSchoolYear) return;
  //   let cancelled = false;
  //   const load = async () => {
  //     setLoading(true);
  //     try {
  //       const res = await API.get("/admin/grades", { params: { school_year: selectedSchoolYear } });
  //       if (!cancelled) {
  //         setAllGrades(res.data.data || []);
  //         setFilterSection("all");
  //       }
  //     } catch (err) {
  //       if (!cancelled) {
  //         console.error("Error fetching grades:", err);
  //         setError("Failed to fetch grades");
  //       }
  //     } finally {
  //       if (!cancelled) setLoading(false);
  //     }
  //   };
  //   load();
  //   return () => { cancelled = true; };
  // }, [selectedSchoolYear, selectedGradeLevel]);

  const handleRefresh = () => fetchAllGrades(true);

  // ── Derived grade levels ──
  const gradeLevels = useMemo(() => {
    const levels = new Set(allGrades.map(g => g.student?.gradeLevel).filter(Boolean));
    return [...levels].sort();
  }, [allGrades]);

  useEffect(() => {
    if (gradeLevels.length > 0 && !selectedGradeLevel) setSelectedGradeLevel(gradeLevels[0]);
  }, [gradeLevels, selectedGradeLevel]);

  const studentsInGrade = useMemo(() => {
    if (!selectedGradeLevel) return [];
    const studentsMap = new Map();
    allGrades.filter(g => g.student?.gradeLevel === selectedGradeLevel)
      .forEach(g => {
        const student = g.student;
        if (student && !studentsMap.has(student.id)) studentsMap.set(student.id, student);
      });
    return Array.from(studentsMap.values()).sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    );
  }, [allGrades, selectedGradeLevel]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch && filterSection === "all") return studentsInGrade;
    let result = studentsInGrade;
    if (studentSearch) {
      const term = studentSearch.toLowerCase();
      result = result.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) || s.studentId?.toLowerCase().includes(term)
      );
    }
    if (filterSection !== "all") result = result.filter(s => s.section?.name === filterSection);
    return result;
  }, [studentsInGrade, studentSearch, filterSection]);

  const availableSections = useMemo(() => {
    if (!selectedGradeLevel) return [];
    const sectionsSet = new Set(studentsInGrade.map(s => s.section?.name).filter(Boolean));
    return Array.from(sectionsSet).sort();
  }, [studentsInGrade, selectedGradeLevel]);

  // ── Open / close detail ──
  const closeDetail = useCallback(() => {
    setSelectedStudentId(null);
    setEditingGradeId(null);
    setEditData({});
  }, []);

  const openStudentDetail = useCallback(async (student) => {
    if (student.id === selectedStudentId) {
      closeDetail();
      return;
    }

    setSelectedStudentId(student.id);
    setSelectedQuarter("Q1");
    setGradesLoading(true);
    setEditingGradeId(null);
    setEditData({});
   

    try {
      const existingGrades = allGrades.filter(g => g.student?.id === student.id);
      const quarters = ["Q1", "Q2", "Q3", "Q4"];
      const completeGradesByQuarter = {};
      const gradeMap = {
      'Grade 1': 'I', 'Grade 2': 'II', 'Grade 3': 'III',
      'Grade 4': 'IV', 'Grade 5': 'V', 'Grade 6': 'VI',
    };
    const gradeRoman = gradeMap[student.gradeLevel] || 'I';
    fetchAttendanceMonths(student.id, gradeRoman,selectedSchoolYear);
    fetchObservedValues(student.id, gradeRoman, selectedSchoolYear);

      // Try to fetch section subjects first
      try {
        const res = await API.get(`/sections/${student.section_id}/subjects`, {
          params: { school_year: selectedSchoolYear }
        });
        const sectionSubjects = res.data;
        const subjectsMap = new Map();
        sectionSubjects.forEach(sub => subjectsMap.set(sub.id, sub));
        existingGrades.forEach(grade => {
          if (grade.subject && !subjectsMap.has(grade.subject.id)) {
            subjectsMap.set(grade.subject.id, grade.subject);
          }
        });
        const allRelevantSubjects = Array.from(subjectsMap.values());
        quarters.forEach(quarter => {
          completeGradesByQuarter[quarter] = allRelevantSubjects.map(subject => {
            const existing = existingGrades.find(g => g.subject_id === subject.id && g.quarter === quarter);
            if (existing) return existing;
            return {
              id: `placeholder-${subject.id}-${quarter}`,
              student_id: student.id, subject_id: subject.id, quarter,
              score: '', remarks: '', subject, teacher: null, isPlaceholder: true,
            };
          });
        });
      } catch (err) {
        console.error('Failed to load section subjects, falling back', err);
        const gradeLevelSubjects = allSubjects.filter(
          sub => sub.gradeLevel === student.gradeLevel && sub.school_year === selectedSchoolYear
        );
        quarters.forEach(quarter => {
          completeGradesByQuarter[quarter] = gradeLevelSubjects.map(subject => {
            const existing = existingGrades.find(g => g.subject_id === subject.id && g.quarter === quarter);
            if (existing) return existing;
            return {
              id: `placeholder-${subject.id}-${quarter}`,
              student_id: student.id, subject_id: subject.id, quarter,
              score: '', remarks: '', subject, teacher: null, isPlaceholder: true,
            };
          });
        });
      }

      setStudentGrades(completeGradesByQuarter);
      setTeacherName(student.section?.advisor ? `${student.section.advisor.firstName} ${student.section.advisor.lastName}` : 'TBA');
    } catch (err) {
      setError("Failed to load student grades");
    } finally {
      setGradesLoading(false);
    }
  }, [allGrades, allSubjects, selectedSchoolYear, selectedStudentId, closeDetail]);

  // click on card
  const handleSelectStudent = (student) => {
    openStudentDetail(student);
  };

  // ── Grade edit handlers ──
  const handleEditStart = (grade) => {
    setEditingGradeId(grade.id);
    setEditData({ score: grade.score, remarks: grade.remarks });
  };
  const handleEditChange = (field, value) => setEditData(prev => ({ ...prev, [field]: value }));
  const handleCancel = () => { setEditingGradeId(null); setEditData({}); };

  const handleSave = async (gradeId) => {
    if (typeof gradeId === 'string' && gradeId.startsWith('placeholder-')) {
      setError("Cannot save placeholder grade. Please contact administrator.");
      return;
    }
    if (editData.score < 0 || editData.score > 100) {
      setError("Score must be between 0 and 100");
      return;
    }
    try {
      const res = await API.put(`/admin/grades/${gradeId}`, { score: editData.score, remarks: editData.remarks });
      setAllGrades(prev => prev.map(g => g.id === gradeId ? res.data.grade : g));
      setStudentGrades(prev => {
        const updated = { ...prev };
        if (updated[selectedQuarter]) {
          updated[selectedQuarter] = updated[selectedQuarter].map(g => g.id === gradeId ? res.data.grade : g);
        }
        return updated;
      });
      setEditingGradeId(null);
      setSuccess("Grade updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to update grade: " + (err.response?.data?.message || err.message));
    }
  };

  const fetchAttendanceMonths = async (studentId, gradeRoman, schoolYear) => {
  try {
    const { data } = await API.get(`/students/${studentId}/attendance-months`, {
      params: { school_year: schoolYear },
    });
    // Still filter by grade, but now the server only returns that school year
    setAttendanceMonths(data.filter(m => m.grade === gradeRoman));
  } catch (err) {
    console.error('Could not fetch attendance months:', err);
    setAttendanceMonths([]);
  }
};

const fetchObservedValues = async (studentId, gradeRoman, schoolYear) => {
  try {
    const { data } = await API.get(`/students/${studentId}/observed-values`);
    // 1. Keep only the correct grade and school year
    const filtered = data.filter(
      o => o.grade === gradeRoman && o.school_year === schoolYear
    );

    // 2. Merge old keys (makabansa1, makabansa2) into 'makabansa'
    const merged = {};
    filtered.forEach(o => {
      let newKey = o.core_value_key;
      if (newKey === 'makabansa1' || newKey === 'makabansa2') newKey = 'makabansa';
      if (!merged[newKey]) merged[newKey] = { q1: '', q2: '', q3: '', q4: '' };
      const target = merged[newKey];
      // For each quarter, take the first non‑empty value found
      target.q1 = target.q1 || o.q1 || '';
      target.q2 = target.q2 || o.q2 || '';
      target.q3 = target.q3 || o.q3 || '';
      target.q4 = target.q4 || o.q4 || '';
    });

    // 3. Convert to array of { core_value_key, q1, q2, q3, q4 }
    const result = Object.keys(merged).map(key => ({
      core_value_key: key,
      ...merged[key]
    }));
    setObservedValues(result);
  } catch (err) {
    console.error('Could not fetch observed values:', err);
    setObservedValues([]);
  }
};

  const handlePrintReportCard = () => {
    printReportCard({
      student: selectedStudent,
      teacherName,
      principalName: "GERRY C. DAYON",
      schoolYear: selectedStudent?.school_year || selectedSchoolYear,
      gradesData: studentGrades,
      subjects: allSubjects,
      attendanceMonths,   
      observedValues,  
    });
  };

  // ── Render ──
  if (loading && !selectedStudentId) { // only show full-page loader initially
    return (
      <div className="content-scroll-area" style={{ padding: "20px" }}>
        <div className="evaluation-container">
          <div className="loading-spinner">Loading grades...</div>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="evaluation-management-page">
      <div className="content-scroll-area" style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
        {yearLoading || !selectedSchoolYear ? (
          <div className="loading-school-year">Loading school year...</div>
        ) : (
          <div className="evaluation-container split-layout">
            {/* ── LEFT: Filters + Student Grid ── */}
            <div className="evaluation-list-panel">
              <div className="evaluation-header">
                <div>
                  <h1>Student Grade Evaluation</h1>
                  <p>Select a grade level and student to manage grades</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <select value={selectedSchoolYear} onChange={e => setSelectedSchoolYear(e.target.value)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #b8860b', background: '#fff', fontSize: '0.9rem', cursor: 'pointer' }}>
                    {['2024-2025','2025-2026','2026-2027','2027-2028'].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <button onClick={handleRefresh} disabled={refreshing} className="refresh-btn">
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
                <GradeLevelFilter gradeLevels={gradeLevels} selected={selectedGradeLevel} onSelect={setSelectedGradeLevel} />
              )}

              {selectedGradeLevel && (
                <div className="students-section">
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "15px", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, whiteSpace: "nowrap" }}>Students in {selectedGradeLevel}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                      {availableSections.length > 0 && (
                        <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
                          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #b8860b", background: "#fff", fontSize: "0.9rem", cursor: "pointer", minWidth: "140px" }}>
                          <option value="all">All Sections</option>
                          {availableSections.map(section => <option key={section} value={section}>{section}</option>)}
                        </select>
                      )}
                      <div className="student-search" style={{ marginLeft: "auto" }}>
                        <FaSearch className="search-icon" />
                        <input type="text" placeholder="Search by name or ID..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="student-search-input" />
                      </div>
                    </div>
                  </div>

                  <StudentsList students={filteredStudents} onSelectStudent={handleSelectStudent} selectedStudentId={selectedStudentId} />
                </div>
              )}
            </div>

            {/* ── RIGHT: Detail Panel ── */}
            {selectedStudent && (
              <div className="detail-panel-wrapper evaluation-detail-panel">
                <div className="detail-actions">
                  <button className="close-detail-btn" onClick={closeDetail}><FaTimes /></button>
                </div>
                <div className="detail-body">
                  {gradesLoading ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Loading grades...</p>
                  ) : (
                    <>
                      <h3 style={{ marginBottom: '1rem' }}>
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </h3>
                      <GradesPanel
                        student={selectedStudent}
                        grades={studentGrades}
                        quarter={selectedQuarter}
                        onQuarterChange={setSelectedQuarter}
                        onEditStart={handleEditStart}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        editingId={editingGradeId}
                        editData={editData}
                        onEditChange={handleEditChange}
                      />
                      <div className="detail-footer">
                        <button className="btn-print" onClick={handlePrintReportCard}><FaPrint /> Report Card</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
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