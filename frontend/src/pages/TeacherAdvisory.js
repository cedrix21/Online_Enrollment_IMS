import React, { useState, useEffect, useMemo, useCallback } from "react";
import API from "../api/api";
import {
  FaSyncAlt,
  FaSave,
  FaSignOutAlt,
  FaCog,
  FaTimes,
} from "react-icons/fa";
import "./TeacherAdvisory.css";
import { useNavigate } from "react-router-dom";

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

  // ===== OPTIMIZED: Single API call with caching =====
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true);

      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < CACHE_DURATION) {
            const data = JSON.parse(cached);
            processData(data);
            setLoading(false);
            return;
          }
        }
      }

      const response = await API.get("/teacher/dashboard");
      const data = response.data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      processData(data);
      setError("");
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const processData = useCallback((data) => {
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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.email) setSettingsEmail(user.email);
    if (user && !user.password_changed) setShowMandatoryPasswordChange(true);
  }, []);

  const filteredStudents = useMemo(() => {
    if (filterGradeLevel === "all") return students;
    return students.filter((s) => s.gradeLevel === filterGradeLevel);
  }, [students, filterGradeLevel]);

  const gradeLevels = useMemo(() => teacherInfo?.gradeLevels || [], [teacherInfo]);

  const getSubjectsForStudent = useCallback(
    (student) => subjects.filter((sub) => sub.gradeLevel === student.gradeLevel),
    [subjects],
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
      const user = JSON.parse(localStorage.getItem("user"));
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
      const user = JSON.parse(localStorage.getItem("user"));
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
      await fetchData(true);
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
      alert("Please select a student first");
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
        alert("No grades to save");
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
          <button onClick={handleRefresh} disabled={refreshing} className="refresh-btn"><FaSyncAlt className={refreshing ? "spinning" : ""} /> {refreshing ? " Refreshing..." : " Refresh"}</button>
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
          </div>
          <div className="student-list">
            {filteredStudents.length === 0 ? <div className="no-students">No students found</div> : filteredStudents.map((student) => (
              <StudentItem key={student.id} student={student} active={selectedStudent?.id === student.id} onClick={() => setSelectedStudent(prev => prev?.id === student.id ? null : student)} />
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: Subjects & Grades */}
        <div className="grades-panel">
          {selectedStudent ? (
            <>
              <div className="panel-header">{selectedStudent.lastName}, {selectedStudent.firstName}</div>
              <div className="subjects-list">
                {getSubjectsForStudent(selectedStudent).length > 0 ? (
                  <>
                    <div className="subjects-table-header">
                      <div className="subject-col subject-name">Subject</div>
                      <div className="subject-col subject-code">Code</div>
                      <div className="subject-col subject-score">Score (0-100)</div>
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
                      <button onClick={handleSubmitAllGrades} className="submit-all-btn"><FaSave /> Save All for {selectedQuarter}</button>
                    </div>
                  </>
                ) : <div className="no-subjects">No subjects assigned for this grade level</div>}
              </div>
            </>
          ) : <div className="panel-empty"><p>Select a student to view and enter grades</p></div>}
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