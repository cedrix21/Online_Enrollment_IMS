import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import API from "../api/api";
import {
  FaSyncAlt,
  FaSave,
  FaSignOutAlt,
  FaCog,
  FaTimes,
  FaCalendarAlt 
} from "react-icons/fa";
import "./TeacherAdvisory.css";
import { useNavigate } from "react-router-dom";
import { useCurrentSchoolYear } from '../hooks/useCurrentSchoolYear';

// Cache keys & duration
const CACHE_KEY = "teacher_dashboard_cache";
const CACHE_TIME_KEY = "teacher_dashboard_cache_time";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// score range
const MIN_SCORE = 70;
const MAX_SCORE = 100;
const SCORE_OPTIONS = Array.from(
  { length: MAX_SCORE - MIN_SCORE + 1 },
  (_, i) => MAX_SCORE - i,
).map(String);

// utils/gradeKey.js
export const gradeKey = (sId, subId, q) => `${sId}-${subId}-${q || "Q1"}`;

export default function TeacherAdvisory() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterGradeLevel, setFilterGradeLevel] = useState("all");
  const [dashboardData, setDashboardData] = useState(null);
  const [filterSection, setFilterSection] = useState("all");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const { schoolYear: currentSchoolYear } = useCurrentSchoolYear();

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [settingsEmail, setSettingsEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");

  // Mandatory password change on first login
  const [showMandatoryPasswordChange, setShowMandatoryPasswordChange] = useState(false);
  const [mandatoryCurrentPassword, setMandatoryCurrentPassword] = useState("");
  const [mandatoryNewPassword, setMandatoryNewPassword] = useState("");
  const [mandatoryConfirmPassword, setMandatoryConfirmPassword] = useState("");
  const [mandatoryLoading, setMandatoryLoading] = useState(false);
  const [mandatoryError, setMandatoryError] = useState("");

  const [activeRightTab, setActiveRightTab] = useState('grades'); // 'grades' | 'attendance' | 'observed'
  const [attendanceData, setAttendanceData] = useState(null);
  const [observedData, setObservedData] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingObserved, setSavingObserved] = useState(false);

  const fetchAttendance = async (studentId) => {
  try {
    const res = await API.get(`/teacher/attendance/${studentId}`);
    setAttendanceData(res.data);
  } catch (err) {
    console.error('Error fetching attendance', err);
  }
};

const fetchObservedValues = async (studentId) => {
  try {
    const res = await API.get(`/teacher/observed-values/${studentId}`);
    const raw = res.data || {};
    // raw is an object keyed by core_value_key (e.g., { makaDiyos: {...}, makabansa1: {...}, ... })
    const grouped = {
      makaDiyos: {},
      makatao: {},
      makakalikasan: {},
      makabansa: {}
    };
    // Merge old keys into the new grouped keys
    Object.keys(raw).forEach(key => {
      let newKey = key;
      if (key === 'makabansa1' || key === 'makabansa2') newKey = 'makabansa';
      if (grouped.hasOwnProperty(newKey)) {
        // take the first non‑empty quarter from the old data (if both old rows exist, pick the one with data)
        const item = raw[key];
        if (!grouped[newKey].q1 && item.q1) grouped[newKey].q1 = item.q1;
        if (!grouped[newKey].q2 && item.q2) grouped[newKey].q2 = item.q2;
        if (!grouped[newKey].q3 && item.q3) grouped[newKey].q3 = item.q3;
        if (!grouped[newKey].q4 && item.q4) grouped[newKey].q4 = item.q4;
      }
    });
    setObservedData(grouped);
  } catch (err) {
    console.error('Error fetching observed values', err);
  }
};

useEffect(() => {
  if (selectedStudent) {
    if (activeRightTab === 'attendance') fetchAttendance(selectedStudent.id);
    if (activeRightTab === 'observed') fetchObservedValues(selectedStudent.id);
  }
}, [selectedStudent, activeRightTab]);
  
  // Safe user retrieval helper
  const getUser = () => {
    try {
      const raw = localStorage.getItem("user");
      if (raw && raw !== "undefined" && raw !== "null") {
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  };

  // ===== OPTIMIZED: Single API call with caching and cleanup =====
  useEffect(() => {
    let cancelled = false;

    const fetchData = async (forceRefresh = false) => {
      try {
        if (!forceRefresh) setLoading(true);

        if (!forceRefresh) {
          const cached = localStorage.getItem(CACHE_KEY);
          const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
          if (cached && cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age < CACHE_DURATION) {
              if (!cancelled) processData(JSON.parse(cached));
              setLoading(false);
              return;
            }
          }
        }

        const response = await API.get("/teacher/dashboard");
        const data = response.data;
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        if (!cancelled) {
          processData(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching data:", err);
          setError(err.response?.data?.message || "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []); // run once on mount

  const processData = useCallback((data) => {
     setDashboardData(data);
    setTeacherInfo(data.teacher);
    setStudents(data.students);
    setSubjects(data.subjects);

    const gradesObj = {};
    if (data.grades && Array.isArray(data.grades)) {
      data.grades.forEach((grade) => {
        const key = gradeKey(grade.student_id, grade.subject_id, grade.quarter);
        gradesObj[key] = {
          score: grade.score !== null && grade.score !== undefined ? String(grade.score) : "",
          remarks: grade.remarks || "",
        };
      });
    }
    setGrades(gradesObj);
  }, []);

  

  useEffect(() => {
    const user = getUser();
    if (user?.email) setSettingsEmail(user.email);
    if (user && !user.password_changed) setShowMandatoryPasswordChange(true);
  }, []);


  const filteredStudents = useMemo(() => {
  let result = students;
  if (filterGradeLevel !== "all") {
    result = result.filter(s => s.gradeLevel === filterGradeLevel);
  }
  if (filterSection !== "all") {
    result = result.filter(s => s.section?.name === filterSection);
  }
  return result;
}, [students, filterGradeLevel, filterSection]);

  const availableSections = useMemo(() => {
  if (filterGradeLevel === "all") {
    // When "All Grades" is selected, collect sections from all students
    const sectionsSet = new Set(students.map(s => s.section?.name).filter(Boolean));
    return Array.from(sectionsSet).sort();
  }
  // Only sections within the selected grade
  const sectionsSet = new Set(
    students
      .filter(s => s.gradeLevel === filterGradeLevel)
      .map(s => s.section?.name)
      .filter(Boolean)
  );
  return Array.from(sectionsSet).sort();
}, [students, filterGradeLevel]);

  const gradeLevels = useMemo(() => teacherInfo?.gradeLevels || [], [teacherInfo]);

  const getSubjectsForStudent = useCallback(
  (student) => {
    // Use the new section-based map if available
    if (dashboardData?.subjectsBySection) {
      return dashboardData.subjectsBySection[student.section_id] || [];
    }
    // Fallback to grade-level filtering (for backward compatibility)
    return subjects.filter((sub) => sub.gradeLevel === student.gradeLevel);
  },
  [subjects, dashboardData]
);

  const handleLogout = () => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
    setSettingsError("");
    setSettingsSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    setSettingsError("");
    setSettingsSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsError("");
    setSettingsSuccess("");

    if (!currentPassword) {
      setSettingsError("Current password is required");
      return;
    }

    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setSettingsError("New passwords do not match");
        return;
      }
      if (newPassword.length < 6) {
        setSettingsError("New password must be at least 6 characters");
        return;
      }
    }

    try {
      setSettingsLoading(true);
      const payload = { current_password: currentPassword, email: settingsEmail };
      if (newPassword) payload.new_password = newPassword;
      const res = await API.put("/user/update-credentials", payload);
      setSettingsSuccess(res.data.message || "Credentials updated successfully!");
      const user = getUser();
      user.email = settingsEmail;
      localStorage.setItem("user", JSON.stringify(user));
      setTimeout(() => handleCloseSettings(), 2000);
    } catch (err) {
      console.error("Error updating credentials:", err);
      setSettingsError(err.response?.data?.message || "Failed to update credentials");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveMandatoryPassword = async (e) => {
    e.preventDefault();
    setMandatoryError("");

    if (!mandatoryCurrentPassword) {
      setMandatoryError("Current password is required");
      return;
    }
    if (!mandatoryNewPassword || !mandatoryConfirmPassword) {
      setMandatoryError("New password fields are required");
      return;
    }
    if (mandatoryNewPassword !== mandatoryConfirmPassword) {
      setMandatoryError("New passwords do not match");
      return;
    }
    if (mandatoryNewPassword.length < 6) {
      setMandatoryError("New password must be at least 6 characters");
      return;
    }

    try {
      setMandatoryLoading(true);
      const user = getUser();
      if (!user) {
        setMandatoryError("User session not found. Please log in again.");
        return;
      }
      const payload = {
        current_password: mandatoryCurrentPassword,
        email: user.email,
        new_password: mandatoryNewPassword,
      };
      await API.put("/user/update-credentials", payload);
      user.password_changed = true;
      localStorage.setItem("user", JSON.stringify(user));
      setShowMandatoryPasswordChange(false);
    } catch (err) {
      console.error("Error updating password:", err);
      setMandatoryError(err.response?.data?.message || "Failed to update password");
    } finally {
      setMandatoryLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setSuccess("Refreshing data...");
      // Force refresh with a new API call (we'll just call the fetch function again)
      const response = await API.get("/teacher/dashboard");
      const data = response.data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      processData(data);
      setSuccess("Data refreshed successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError(err.response?.data?.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleGradeChange = useCallback(
    (studentId, subjectId, field, value) => {
      const key = gradeKey(studentId, subjectId, selectedQuarter);
      setGrades((prev) => {
        const existing = prev[key] || { score: "", remarks: "" };
        return { ...prev, [key]: { ...existing, [field]: value } };
      });
    },
    [selectedQuarter],
  );

  const handleSubmitGrade = useCallback(
    async (studentId, subjectId, subject) => {
      const key = gradeKey(studentId, subjectId, selectedQuarter);
      const gradeData = grades[key];

      if (!gradeData || !gradeData.score) {
        setError("Please enter a score");
        return;
      }

      try {
        await API.post("/teacher/grades", {
          student_id: studentId,
          subject_id: subjectId,
          score: gradeData.score,
          remarks: gradeData.remarks || "",
          quarter: selectedQuarter,
        });
        setSuccess(`Grade saved successfully!`);
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        console.error("Error saving grade:", err);
        setError(err.response?.data?.message || "Failed to save grade");
      }
    },
    [selectedQuarter, grades],
  );

  const handleSubmitAllGrades = useCallback(async () => {
    if (!selectedStudent) {
       setError("Please select a student first");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const studentSubjects = getSubjectsForStudent(selectedStudent);
      const gradesToSubmit = studentSubjects
        .map((subject) => {
          const key = gradeKey(selectedStudent.id, subject.id, selectedQuarter);
          const gradeData = grades[key];
          if (!gradeData?.score) return null;
          return {
            student_id: selectedStudent.id,
            subject_id: subject.id,
            score: gradeData.score,
            remarks: gradeData.remarks || "",
            quarter: selectedQuarter,
          };
        })
        .filter(Boolean);

      if (gradesToSubmit.length === 0) {
        setError("No grades to save");
        setTimeout(() => setError(""), 3000);
        return;
      }

      const response = await API.post("/teacher/grades/bulk", { grades: gradesToSubmit });
      setSuccess(response.data.message || "All grades saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error saving grades:", err);
      setError(err.response?.data?.message || "Failed to save grades");
    }
  }, [selectedStudent, grades, selectedQuarter, getSubjectsForStudent]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="teacher-advisory-container">
        <div className="loading-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-content">
            <div className="skeleton-sidebar"></div>
            <div className="skeleton-main"></div>
          </div>
        </div>
      </div>
    );
  }

  if (showMandatoryPasswordChange) {
    return (
      <div className="teacher-advisory-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999, padding: "20px" }}>
          <div className="modal-content" style={{ maxWidth: "450px", width: "100%", margin: "0 auto", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#b8860b" }}>⚠️ Change Your Password</h2>
              <p style={{ fontSize: "14px", color: "#666", marginTop: "8px", marginBottom: 0 }}>This is your first login. You are required to change your password to continue.</p>
            </div>
            {mandatoryError && <div className="alert alert-error" style={{ margin: "15px 20px" }}>{mandatoryError}</div>}
            <form onSubmit={handleSaveMandatoryPassword} className="settings-form" style={{ padding: "20px" }}>
              <div className="form-group">
                <label htmlFor="current-pwd">Current Password:</label>
                <input type="password" id="current-pwd" value={mandatoryCurrentPassword} onChange={(e) => setMandatoryCurrentPassword(e.target.value)} placeholder="Enter your current password" className="form-input" required autoFocus />
              </div>
              <hr className="form-divider" />
              <div className="form-group">
                <label htmlFor="new-pwd">New Password:</label>
                <input type="password" id="new-pwd" value={mandatoryNewPassword} onChange={(e) => setMandatoryNewPassword(e.target.value)} placeholder="Enter new password (min 6 characters)" className="form-input" required />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-pwd">Confirm New Password:</label>
                <input type="password" id="confirm-pwd" value={mandatoryConfirmPassword} onChange={(e) => setMandatoryConfirmPassword(e.target.value)} placeholder="Confirm new password" className="form-input" required />
              </div>
              <div className="form-actions" style={{ marginTop: "24px" }}>
                <button type="submit" className="btn-submit" disabled={mandatoryLoading} style={{ width: "100%", padding: "12px", fontSize: "16px" }}>{mandatoryLoading ? "Changing Password..." : "Change Password & Continue"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-advisory-container">
      {/* Header */}
      <div className="advisory-header">
        <div>
          <h1>Grade Evaluation Portal</h1>
          <p className="teacher-subtitle">
            <strong>{teacherInfo?.firstName} {teacherInfo?.lastName}</strong> | Advisory:{" "}
            <span className="advisory-badge">{teacherInfo?.advisory_grade || "N/A"}</span> | Teaching:{" "}
            <span className="teaching-badge">{subjects.map((s) => s.subjectCode).join(", ")}</span>
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowScheduleModal(true)} className="schedule-btn">
            <FaCalendarAlt /> My Schedule
          </button>
          <button onClick={handleRefresh} disabled={refreshing} className="refresh-advisory-btn"><FaSyncAlt className={refreshing ? "spinning" : ""} /> {refreshing ? " Refreshing..." : " Refresh"}</button>
          <button onClick={handleOpenSettings} className="settings-btn"><FaCog /> Settings</button>
          <button onClick={handleLogout} className="logout-btn"><FaSignOutAlt /> Logout</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Two-Column Layout */}
      <div className="advisory-content">
        {/* LEFT SIDE: Student List */}
        <div className="student-list-panel">
          <div className="panel-header">Students</div>
          <div className="controls-row-compact">
            <div className="control-group-compact">
              <label>Quarter:</label>
              <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="control-select-compact">
                <option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option>
              </select>
            </div>
            <div className="control-group-compact">
              <label>Grade:</label>
              <select value={filterGradeLevel} onChange={(e) => setFilterGradeLevel(e.target.value)} className="control-select-compact">
                <option value="all">All</option>
                {gradeLevels.map((grade) => (<option key={grade} value={grade}>{grade.replace("Grade ", "G")}</option>))}
              </select>
            </div>
            <div className="student-count-compact">{filteredStudents.length} Students</div>
            {availableSections.length > 0 && (
              <div className="control-group-compact">
                <label>Section:</label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="control-select-compact"
                >
                  <option value="all">All</option>
                  {availableSections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="student-list">
            {filteredStudents.length === 0 ? <div className="no-students">No students found</div> : filteredStudents.map((student) => (
              <StudentItem key={student.id} student={student} active={selectedStudent?.id === student.id} onClick={() => setSelectedStudent(prev => prev?.id === student.id ? null : student)} />
            ))}
          </div>
        </div>

  
        {/* RIGHT SIDE: Dynamic content based on activeRightTab */}
          <div className="grades-panel">
            {selectedStudent ? (
              <>
                <div className="panel-header">
                  {selectedStudent.lastName}, {selectedStudent.firstName}
                </div>

                {/* Tab bar for Grades / Attendance / Observed Values */}
                <div className="sub-tabs" style={{ display: 'flex', gap: '10px', margin: '10px 0' }}>
                  {['grades', 'attendance', 'observed'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveRightTab(tab)}
                      style={{
                        padding: '8px 16px',
                        background: activeRightTab === tab ? '#b8860b' : '#f0f0f0',
                        color: activeRightTab === tab ? '#fff' : '#333',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* ─── GRADES TAB ─── (existing code) ─── */}
                {activeRightTab === 'grades' && (
              <div className="subjects-list">
                {getSubjectsForStudent(selectedStudent).length > 0 ? (
                  <>
                    <div className="subjects-table-header">
                      <div className="subject-col subject-name">Subject</div>
                      <div className="subject-col subject-code">Code</div>
                      <div className="subject-col subject-score">Grade (0-100)</div>
                      <div className="subject-col subject-action">Action</div>
                    </div>
                    <div className="subjects-table-body">
                      {getSubjectsForStudent(selectedStudent).map((subject) => (
                        <SubjectRow
                          key={subject.id}
                          studentId={selectedStudent.id}
                          subject={subject}
                          gradeData={grades[gradeKey(selectedStudent.id, subject.id, selectedQuarter)] || { score: "", remarks: "" }}
                          onGradeChange={handleGradeChange}
                          onSubmit={handleSubmitGrade}
                        />
                      ))}
                    </div>
                    <div className="grades-panel-footer">
                      <button onClick={handleSubmitAllGrades} className="submit-all-btn">
                        <FaSave /> Save All for {selectedQuarter}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="no-subjects">No subjects assigned for this grade level</div>
                )}
              </div>
            )}

                {/* ─── ATTENDANCE TAB ─── */}
                {activeRightTab === 'attendance' && (
                  
                  <AttendanceForm
                    student={selectedStudent}
                    data={attendanceData}
                    onSave={async (formData) => {
                      setSavingAttendance(true);
                      try {
                        await API.post('/teacher/attendance', {
                          student_id: selectedStudent.id,
                           months: formData,  
                        });
                        setSuccess('Attendance saved!');
                        setTimeout(() => setSuccess(''), 3000);
                      } catch (err) {
                        setError('Failed to save attendance');
                      } finally {
                        setSavingAttendance(false);
                      }
                    }}
                    saving={savingAttendance}
                  />
                  
                )}

                {/* ─── OBSERVED VALUES TAB ─── */}
                {activeRightTab === 'observed' && (
                   <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
                  <ObservedValuesForm
                    student={selectedStudent}
                    data={observedData}
                    onSave={async (values) => {
                      setSavingObserved(true);
                      try {
                        await API.post('/teacher/observed-values', {
                          student_id: selectedStudent.id,
                          values: values,
                        });
                        setSuccess('Observed values saved!');
                        setTimeout(() => setSuccess(''), 3000);
                      } catch (err) {
                        setError('Failed to save observed values');
                      } finally {
                        setSavingObserved(false);
                      }
                    }}
                    saving={savingObserved}
                  />
                  </div>
                )}
              </>
            ) : (
              <div className="panel-empty"><p>Select a student to view details</p></div>
            )}
          </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={handleCloseSettings}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Change Credentials</h2><button className="modal-close-btn" onClick={handleCloseSettings}><FaTimes /></button></div>
            {settingsError && <div className="alert alert-error">{settingsError}</div>}
            {settingsSuccess && <div className="alert alert-success">{settingsSuccess}</div>}
            <form onSubmit={handleSaveSettings} className="settings-form">
              <div className="form-group"><label htmlFor="email">Email Address:</label><input type="email" id="email" value={settingsEmail} onChange={(e) => setSettingsEmail(e.target.value)} className="form-input" required /></div>
              <div className="form-group"><label htmlFor="current-password">Current Password:</label><input type="password" id="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter your current password" className="form-input" required /></div>
              <hr className="form-divider" />
              <div className="form-group"><label htmlFor="new-password">New Password (Optional):</label><input type="password" id="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current password" className="form-input" /></div>
              <div className="form-group"><label htmlFor="confirm-password">Confirm New Password:</label><input type="password" id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="form-input" disabled={!newPassword} /></div>
              <div className="form-actions"><button type="button" className="btn-cancel" onClick={handleCloseSettings} disabled={settingsLoading}>Cancel</button><button type="submit" className="btn-submit" disabled={settingsLoading}>{settingsLoading ? "Saving..." : "Save Changes"}</button></div>
            </form>
          </div>
        </div>
      )}
      {/* 🆕 Teacher Schedule Modal */}
        {showScheduleModal && teacherInfo && (
          <TeacherScheduleModal
            teacher={teacherInfo}
            schoolYear={currentSchoolYear}
            onClose={() => setShowScheduleModal(false)}
          />
        )}
    </div>
  );
}

// ===== MEMOIZED: StudentItem =====
const StudentItem = React.memo(({ student, active, onClick }) => (
  <div className={`student-item ${active ? "active" : ""}`} onClick={onClick}>
    <div className="student-item-row">
      <div className="student-id">{student.studentId}</div>
      <div className="student-details">
        <div className="student-name">{student.lastName}, {student.firstName}</div>
        <div className="student-meta"><span className="grade-level">{student.gradeLevel}</span><span className="section">{student.section?.name || "N/A"}</span></div>
      </div>
    </div>
  </div>
));
StudentItem.displayName = "StudentItem";

// ===== MEMOIZED: SubjectRow (simplified) =====
const SubjectRow = React.memo(({ studentId, subject, gradeData = { score: "", remarks: "" }, onGradeChange, onSubmit }) => {
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    await onSubmit(studentId, subject.id, subject);
    setSaving(false);
  };
  const currentScore = gradeData.score || "";
  const needsCustomOption = currentScore !== "" && !SCORE_OPTIONS.includes(currentScore);
  return (
    <div className="subject-row">
      <div className="subject-col subject-name">{subject.subjectName}</div>
      <div className="subject-col subject-code"><span className="code-badge">{subject.subjectCode}</span></div>
      <div className="subject-col subject-score">
        <select value={currentScore} onChange={(e) => onGradeChange(studentId, subject.id, "score", e.target.value)} className="score-input">
          <option value="">-- Select Grade --</option>
          {SCORE_OPTIONS.map((score) => (<option key={score} value={score}>{score}</option>))}
          {needsCustomOption && <option key="current" value={currentScore}>{currentScore}</option>}
        </select>
      </div>
      <div className="subject-col subject-action">
        <button onClick={handleSave} className="save-btn" disabled={saving}><FaSave /> {saving ? "Saving..." : "Save"}</button>
      </div>
    </div>
  );
});
SubjectRow.displayName = "SubjectRow";

const TeacherScheduleModal = memo(({ teacher, onClose, schoolYear }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper: convert 24-hour time (e.g., "14:00:00") to 12-hour format (e.g., "2:00 PM")
  const formatTime12 = (time24) => {
    if (!time24) return '';
    let [hour, minute] = time24.split(':');
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
  };

  useEffect(() => {
  if (!teacher) return;
  let cancelled = false;
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/teachers/${teacher.id}/schedule`, {
        params: { school_year: schoolYear },
      });
      if (!cancelled) setSchedules(res.data);
    } catch (err) {
      if (!cancelled) {
        console.error("Failed to fetch schedules", err);
        setError("Could not load schedule data.");
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  };
  fetchSchedules();
  return () => { cancelled = true; };
}, [teacher, schoolYear]);

  if (!teacher) return null;

  const dayOrder = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7,
  };

  const schedulesByDay = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: [],
  };

  schedules.forEach(sched => {
    const day = sched.day;
    if (schedulesByDay[day]) {
      schedulesByDay[day].push(sched);
    }
  });

  Object.keys(schedulesByDay).forEach(day => {
    schedulesByDay[day].sort((a, b) => {
      const timeA = a.time_slot?.start_time || '';
      const timeB = b.time_slot?.start_time || '';
      return timeA.localeCompare(timeB);
    });
  });

  // Unique time slots for table rows (keep original 24h string for grouping)
  const allTimeSlots = [...new Set(
    schedules.flatMap(s => s.time_slot ? `${s.time_slot.start_time}-${s.time_slot.end_time}` : '')
  )].sort();

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '80vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h3>
            📅 Weekly Schedule - {teacher.firstName} {teacher.lastName}
          </h3>
          <FaTimes className="close-icon" onClick={onClose} />
        </div>

        <div style={{ padding: '0 10px 10px 10px' }}>
          {loading && <p style={{ textAlign: 'center' }}>Loading schedule...</p>}
          {error && <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>}

          {!loading && schedules.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666' }}>No scheduled classes found for this teacher.</p>
          )}

          {!loading && schedules.length > 0 && (
            <>
              <div className="schedule-table-wrapper">
                <table className="teacher-schedule-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Monday</th>
                      <th>Tuesday</th>
                      <th>Wednesday</th>
                      <th>Thursday</th>
                      <th>Friday</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTimeSlots.map(timeSlot => {
                      const [start24, end24] = timeSlot.split('-');
                      return (
                        <tr key={timeSlot}>
                          <td className="schedule-time">
                            {formatTime12(start24)} – {formatTime12(end24)}
                          </td>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                            const schedule = schedulesByDay[day]?.find(
                              s => s.time_slot && `${s.time_slot.start_time}-${s.time_slot.end_time}` === timeSlot
                            );
                            return (
                              <td key={day}>
                                {schedule ? (
                                  <div className="schedule-subject">
                                    <strong>{schedule.subject?.subjectCode}</strong>
                                    <div className="schedule-subject-name">{schedule.subject?.subjectName}</div>
                                    <div className="schedule-grade">
                                      {schedule.section?.name} ({schedule.section?.gradeLevel})
                                    </div>
                                    <div className="schedule-room">
                                      Room: {schedule.room?.room_name || '?'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="schedule-empty">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <button className="submit-btn" onClick={onClose} style={{ marginTop: '20px' }}>
          Close
        </button>
      </div>
    </div>
  );
});

const CORE_VALUES_GROUPED = [
  {
    key: 'makaDiyos',
    label: '1. Maka-Diyos',
    statements: [
      "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others.",
      "Shows adherence to ethical principles by upholding truth."
    ]
  },
  {
    key: 'makatao',
    label: '2. Makatao',
    statements: [
      "Is sensitive to individual, social and cultural differences.",
      "Demonstrates contributions toward solidarity."
    ]
  },
  {
    key: 'makakalikasan',
    label: '3. Maka-kalikasan',
    statements: [
      "Cares for the environment and utilizes resources wisely, judiciously, and economically."
    ]
  },
  {
    key: 'makabansa',
    label: '4. Makabansa',
    statements: [
      "Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen.",
      "Demonstrates appropriate behavior in carrying out activities in the school, community, and country."
    ]
  }
];

const ObservedValuesForm = memo(({ student, data, onSave, saving }) => {
  // data is now expected as an object keyed by core value key, e.g. { makaDiyos: { q1: 'SO', ... }, ... }
  const initialValues = CORE_VALUES_GROUPED.map(cv => ({
    core_value_key: cv.key,
    q1: data?.[cv.key]?.q1 || '',
    q2: data?.[cv.key]?.q2 || '',
    q3: data?.[cv.key]?.q3 || '',
    q4: data?.[cv.key]?.q4 || '',
  }));

  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    if (data) {
      const updated = CORE_VALUES_GROUPED.map(cv => ({
        core_value_key: cv.key,
        q1: data?.[cv.key]?.q1 || '',
        q2: data?.[cv.key]?.q2 || '',
        q3: data?.[cv.key]?.q3 || '',
        q4: data?.[cv.key]?.q4 || '',
      }));
      setValues(updated);
    }
  }, [data]);

  const handleChange = (index, quarter, value) => {
    const newValues = [...values];
    newValues[index][quarter] = value;
    setValues(newValues);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(values);
  };

  return (
    <div style={{ padding: '10px' }}>
      <h4>Observed Values for {student.gradeLevel}</h4>
      <form onSubmit={handleSubmit}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Core Value</th>
              <th style={{ width: '45%' }}>Behavior Statements</th>
              <th style={{ width: '10%' }}>Q1</th>
              <th style={{ width: '10%' }}>Q2</th>
              <th style={{ width: '10%' }}>Q3</th>
              <th style={{ width: '10%' }}>Q4</th>
            </tr>
          </thead>
          <tbody>
            {CORE_VALUES_GROUPED.map((cv, i) => (
              <tr key={cv.key}>
                <td style={{ fontWeight: 600, verticalAlign: 'top', paddingTop: '8px' }}>{cv.label}</td>
                <td style={{ fontSize: '0.85rem', verticalAlign: 'top', paddingTop: '8px' }}>
                  {cv.statements.map((stmt, idx) => (
                    <div key={idx} style={{ marginBottom: idx < cv.statements.length - 1 ? '6px' : 0 }}>{stmt}</div>
                  ))}
                </td>
                {['q1','q2','q3','q4'].map(q => (
                  <td key={q} style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '8px' }}>
                    <input
                      type="text"
                      value={values[i]?.[q] || ''}
                      onChange={(e) => handleChange(i, q, e.target.value)}
                      style={{ width: '50px' }}
                      placeholder="—"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button type="submit" disabled={saving} className="save-btn" style={{ marginTop: '15px' }}>
          {saving ? 'Saving...' : 'Save Observed Values'}
        </button>
      </form>
    </div>
  );
});
ObservedValuesForm.displayName = 'ObservedValuesForm';


const Field2 = ({ label, name, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: '150px' }}>
    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>{label}</label>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
    />
  </div>
);

const MONTHS = ['July','August','September','October','November','December',
                'January','February','March','April'];

const AttendanceForm = memo(({ student, data, onSave, saving }) => {
  // Build a flat state object: { July: { school_days, present, absent }, ... }
  const emptyMonths = MONTHS.reduce((acc, m) => {
    acc[m] = { school_days: '', present: '', absent: '' };
    return acc;
  }, {});

  const buildFromData = (arr) => {
    const result = { ...emptyMonths };
    (arr || []).forEach(({ month, school_days, present, absent }) => {
      if (result[month]) {
        result[month] = {
          school_days: school_days ?? '',
          present: present ?? '',
          absent: absent ?? '',
        };
      }
    });
    return result;
  };

  const [formValues, setFormValues] = useState(() => buildFromData(data));

  useEffect(() => {
    if (data) setFormValues(buildFromData(data));
  }, [data]);

  const handleChange = (month, field, value) => {
    setFormValues(prev => ({
      ...prev,
      [month]: { ...prev[month], [field]: value }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert back to array of objects
    const monthsArray = MONTHS.map(month => ({
      month,
      school_days: formValues[month].school_days,
      present:     formValues[month].present,
      absent:      formValues[month].absent,
    }));
    onSave(monthsArray);
  };

  return (
    <div style={{ padding: '10px' }}>
      <h4>Monthly Attendance for {student.gradeLevel}</h4>
      <form onSubmit={handleSubmit}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.85rem', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '80px', textAlign: 'left' }}></th>
                {MONTHS.map(month => (
                  <th key={month} style={{ minWidth: '60px', textAlign: 'center' }}>
                    {month.substring(0,3)} {/* Shortened month label */}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* School Days row */}
              <tr>
                <td style={{ fontWeight: 600, textAlign: 'left' }}>School Days</td>
                {MONTHS.map(month => (
                  <td key={month} style={{ textAlign: 'center' }}>
                    <input
                      type="number" min="0"
                      value={formValues[month].school_days}
                      onChange={e => handleChange(month, 'school_days', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center' }}
                    />
                  </td>
                ))}
              </tr>
              {/* Present row */}
              <tr>
                <td style={{ fontWeight: 600, textAlign: 'left' }}>Present</td>
                {MONTHS.map(month => (
                  <td key={month} style={{ textAlign: 'center' }}>
                    <input
                      type="number" min="0"
                      value={formValues[month].present}
                      onChange={e => handleChange(month, 'present', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center' }}
                    />
                  </td>
                ))}
              </tr>
              {/* Absent row */}
              <tr>
                <td style={{ fontWeight: 600, textAlign: 'left' }}>Absent</td>
                {MONTHS.map(month => (
                  <td key={month} style={{ textAlign: 'center' }}>
                    <input
                      type="number" min="0"
                      value={formValues[month].absent}
                      onChange={e => handleChange(month, 'absent', e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center' }}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <button type="submit" disabled={saving} className="save-btn" style={{ marginTop: '15px' }}>
          {saving ? 'Saving...' : 'Save Monthly Attendance'}
        </button>
      </form>
    </div>
  );
});
AttendanceForm.displayName = 'AttendanceForm';