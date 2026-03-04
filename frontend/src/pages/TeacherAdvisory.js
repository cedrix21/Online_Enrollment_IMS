import { useState, useEffect } from "react";
import API from "../api/api";
import { FaSyncAlt, FaSave, FaSignOutAlt, FaCog, FaTimes } from 'react-icons/fa';
import "./TeacherAdvisory.css";
import { useNavigate } from "react-router-dom";

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
  
  // Grade Level Filter
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.email) {
      setSettingsEmail(user.email);
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teacherRes, studentsRes, subjectsRes, gradesRes] = await Promise.all([
        API.get("/teacher/info"),
        API.get("/teacher/students"),
        API.get("/teacher/subjects"),
        API.get("/teacher/grades"),
      ]);

      setTeacherInfo(teacherRes.data);
      setStudents(studentsRes.data);
      setSubjects(subjectsRes.data);

      const gradesObj = {};
      gradesRes.data.forEach((grade) => {
        const key = `${grade.student_id}-${grade.subject_id}-${grade.quarter || 'Q1'}`;
        gradesObj[key] = {
          score: grade.score,
          remarks: grade.remarks,
        };
      });
      setGrades(gradesObj);
      setError("");
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        err.response?.data?.message || "Failed to load students and grades"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
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
      const payload = {
        current_password: currentPassword,
        email: settingsEmail,
      };

      if (newPassword) {
        payload.new_password = newPassword;
      }

      const res = await API.put("/user/update-credentials", payload);
      setSettingsSuccess(res.data.message || "Credentials updated successfully!");
      
      const user = JSON.parse(localStorage.getItem("user"));
      user.email = settingsEmail;
      localStorage.setItem("user", JSON.stringify(user));

      setTimeout(() => {
        handleCloseSettings();
      }, 2000);
    } catch (err) {
      console.error("Error updating credentials:", err);
      setSettingsError(err.response?.data?.message || "Failed to update credentials");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setSuccess("Refreshing data...");
      
      const [teacherRes, studentsRes, subjectsRes, gradesRes] = await Promise.all([
        API.get("/teacher/info"),
        API.get("/teacher/students"),
        API.get("/teacher/subjects"),
        API.get("/teacher/grades"),
      ]);

      setTeacherInfo(teacherRes.data);
      setStudents(studentsRes.data);
      setSubjects(subjectsRes.data);

      const gradesObj = {};
      gradesRes.data.forEach((grade) => {
        const key = `${grade.student_id}-${grade.subject_id}-${grade.quarter || 'Q1'}`;
        gradesObj[key] = {
          score: grade.score,
          remarks: grade.remarks,
        };
      });
      setGrades(gradesObj);

      setSuccess("Data refreshed successfully!");
      setTimeout(() => setSuccess(""), 2000);
      setError("");
    } catch (err) {
      console.error("Error refreshing data:", err);
      setError(err.response?.data?.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleGradeChange = (studentId, subjectId, field, value) => {
    const key = `${studentId}-${subjectId}-${selectedQuarter}`;
    setGrades((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleSubmitGrade = async (studentId, subjectId) => {
    const key = `${studentId}-${subjectId}-${selectedQuarter}`;
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
  };

  const handleSubmitAllGrades = async () => {
    if (!selectedStudent) {
      alert("Please select a student first");
      return;
    }

    try {
      const studentSubjects = getSubjectsForStudent(selectedStudent);
      const gradesToSubmit = studentSubjects
        .map(subject => {
          const key = `${selectedStudent.id}-${subject.id}-${selectedQuarter}`;
          const gradeData = grades[key];
          if (gradeData?.score) {
            return {
              student_id: selectedStudent.id,
              subject_id: subject.id,
              score: gradeData.score,
              remarks: gradeData.remarks || "",
              quarter: selectedQuarter,
            };
          }
          return null;
        })
        .filter(Boolean);

      if (gradesToSubmit.length === 0) {
        alert("No grades to save");
        return;
      }

      for (const gradeData of gradesToSubmit) {
        await API.post("/teacher/grades", gradeData);
      }

      setSuccess("All grades saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
      fetchData();
    } catch (err) {
      console.error("Error saving grades:", err);
      setError(err.response?.data?.message || "Failed to save grades");
    }
  };

  const filteredStudents = filterGradeLevel === "all" 
    ? students 
    : students.filter(s => s.gradeLevel === filterGradeLevel);

  const getSubjectsForStudent = (student) => {
    return subjects.filter(sub => sub.gradeLevel === student.gradeLevel);
  };

  const gradeLevels = teacherInfo?.gradeLevels || [];

  return (
    <div className="teacher-advisory-container">
      {/* Header */}
      <div className="advisory-header">
        <div>
          <h1>Grade Evaluation Portal</h1>
          <p className="teacher-subtitle">
            <strong>{teacherInfo?.firstName} {teacherInfo?.lastName}</strong> | 
            Advisory: <span className="advisory-badge">{teacherInfo?.advisory_grade || "N/A"}</span> | 
            Teaching: <span className="teaching-badge">{gradeLevels.join(", ")}</span>
          </p>
        </div>
        <div className="header-actions">
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="refresh-btn"
            title="Refresh student data"
          >
            <FaSyncAlt className={refreshing ? 'spinning' : ''} />
            {refreshing ? ' Refreshing...' : ' Refresh'}
          </button>
          <button 
            onClick={handleOpenSettings} 
            className="settings-btn"
            title="Change credentials"
          >
            <FaCog /> Settings
          </button>
          <button 
            onClick={handleLogout} 
            className="logout-btn"
            title="Logout"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Two-Column Layout */}
      <div className="advisory-content">
        {/* LEFT SIDE: Student List with Controls */}
        <div className="student-list-panel">
          <div className="panel-header">Students</div>
          
          {/* Controls inside left panel */}
          <div className="controls-row-compact">
            <div className="control-group-compact">
              <label>Quarter:</label>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="control-select-compact"
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>

            <div className="control-group-compact">
              <label>Grade:</label>
              <select
                value={filterGradeLevel}
                onChange={(e) => setFilterGradeLevel(e.target.value)}
                className="control-select-compact"
              >
                <option value="all">All</option>
                {gradeLevels.map(grade => (
                  <option key={grade} value={grade}>{grade.replace('Grade ', 'G')}</option>
                ))}
              </select>
            </div>

            <div className="student-count-compact">
              {filteredStudents.length} Students
            </div>
          </div>
          
          <div className="student-list">
            {filteredStudents.length === 0 ? (
              <div className="no-students">No students found</div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={`student-item ${selectedStudent?.id === student.id ? 'active' : ''}`}
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="student-item-row">
                    <div className="student-id">{student.studentId}</div>
                    <div className="student-details">
                      <div className="student-name">{student.lastName}, {student.firstName}</div>
                      <div className="student-meta">
                        <span className="grade-level">{student.gradeLevel}</span>
                        <span className="section">{student.section?.name || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT SIDE: Subjects & Grades */}
        <div className="grades-panel">
          {selectedStudent ? (
            <>
              <div className="panel-header">
                {selectedStudent.lastName}, {selectedStudent.firstName}
              </div>
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
                      {getSubjectsForStudent(selectedStudent).map((subject) => {
                        const key = `${selectedStudent.id}-${subject.id}-${selectedQuarter}`;
                        const gradeData = grades[key] || { score: "", remarks: "" };

                        return (
                          <div key={subject.id} className="subject-row">
                            <div className="subject-col subject-name">
                              {subject.subjectName}
                            </div>
                            <div className="subject-col subject-code">
                              <span className="code-badge">{subject.subjectCode}</span>
                            </div>
                            <div className="subject-col subject-score">
                              <select
                                value={gradeData.score}
                                onChange={(e) =>
                                  handleGradeChange(selectedStudent.id, subject.id, "score", e.target.value)
                                }
                                className="score-input"
                              >
                                <option value="">-- Select Grade --</option>
                                {Array.from({ length: 31 }, (_, i) => 100 - i).map(score => (
                                  <option key={score} value={score}>{score}</option>
                                ))}
                              </select>
                            </div>
                            <div className="subject-col subject-action">
                              <button
                                onClick={() => handleSubmitGrade(selectedStudent.id, subject.id)}
                                className="save-btn"
                                title="Save this grade"
                              >
                                <FaSave /> Save
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grades-panel-footer">
                      <button
                        onClick={handleSubmitAllGrades}
                        className="submit-all-btn"
                      >
                        <FaSave /> Save All for {selectedQuarter}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="no-subjects">
                    No subjects assigned for this grade level
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="panel-empty">
              <p>Select a student to view and enter grades</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={handleCloseSettings}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Credentials</h2>
              <button 
                className="modal-close-btn" 
                onClick={handleCloseSettings}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            {settingsError && <div className="alert alert-error">{settingsError}</div>}
            {settingsSuccess && <div className="alert alert-success">{settingsSuccess}</div>}

            <form onSubmit={handleSaveSettings} className="settings-form">
              <div className="form-group">
                <label htmlFor="email">Email Address:</label>
                <input
                  type="email"
                  id="email"
                  value={settingsEmail}
                  onChange={(e) => setSettingsEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="current-password">Current Password:</label>
                <input
                  type="password"
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="form-input"
                  required
                />
              </div>

              <hr className="form-divider" />

              <div className="form-group">
                <label htmlFor="new-password">New Password (Optional):</label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password:</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="form-input"
                  disabled={!newPassword}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseSettings}
                  disabled={settingsLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={settingsLoading}
                >
                  {settingsLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}