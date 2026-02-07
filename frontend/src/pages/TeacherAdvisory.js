import { useState, useEffect } from "react";
import API from "../api/api";
import { FaSyncAlt, FaChevronUp, FaChevronDown, FaSave, FaSignOutAlt } from 'react-icons/fa';
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
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  
  // Grade Level Filter
  const [filterGradeLevel, setFilterGradeLevel] = useState("all");

  useEffect(() => {
    fetchData();
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

  const toggleStudent = (id) => {
    setExpandedStudentId(expandedStudentId === id ? null : id);
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
    try {
      const gradesToSubmit = Object.entries(grades)
        .filter(([key, data]) => data.score)
        .map(([key, data]) => {
          const [studentId, subjectId, quarter] = key.split("-");
          return {
            student_id: parseInt(studentId),
            subject_id: parseInt(subjectId),
            score: data.score,
            remarks: data.remarks || "",
            quarter: quarter,
          };
        });

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

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="teacher-advisory-container">
      {/* Sticky Header */}
      <div className="sticky-header-wrapper">
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
            className="refresh-bton"
            title="Refresh student data"
          >
            <FaSyncAlt className={refreshing ? 'spinning' : ''} />
            {refreshing ? ' Refreshing...' : ' Refresh'}
          </button>
          <button 
              onClick={handleLogout} 
              className="logout-btn"
              title="Logout"
              style={{ marginLeft: '10px' }} 
            >
              <FaSignOutAlt /> Logout
            </button>
        </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="controls-row">
          <div className="control-group">
            <label>Quarter:</label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="control-select"
            >
              <option value="Q1">Quarter 1</option>
              <option value="Q2">Quarter 2</option>
              <option value="Q3">Quarter 3</option>
              <option value="Q4">Quarter 4</option>
            </select>
          </div>

          <div className="control-group">
            <label>Grade Level:</label>
            <select
              value={filterGradeLevel}
              onChange={(e) => setFilterGradeLevel(e.target.value)}
              className="control-select"
            >
              <option value="all">All Grades</option>
              {gradeLevels.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          <div className="student-count">
            <span>{filteredStudents.length} Students</span>
          </div>
        </div>
      </div>

      {/* Student List with Table Header */}
      <div className="scrollable-content">
        {filteredStudents.length === 0 ? (
          <div className="no-students">
            <p>No students found for the selected filter</p>
          </div>
        ) : (
          <div className="student-list-container">
            {/* Table Header */}
            <div className="student-table-header">
              <div className="header-col col-student-id">Student ID</div>
              <div className="header-col col-student-name">Student Name</div>
              <div className="header-col col-grade">Grade</div>
              <div className="header-col col-section">Section</div>
              <div className="header-col col-action">Action</div>
            </div>

            {/* Student Cards */}
            <div className="student-accordion-list">
              {filteredStudents.map((student) => {
                const studentSubjects = getSubjectsForStudent(student);
                const isExpanded = expandedStudentId === student.id;
                
                return (
                  <div 
                    key={student.id} 
                    className={`student-card ${isExpanded ? 'expanded' : ''}`}
                  >
                    {/* Student Row */}
                    <div 
                      className="student-card-header" 
                      onClick={() => toggleStudent(student.id)}
                    >
                      <div className="header-col col-student-id">
                        <span className="student-id-badge">{student.studentId}</span>
                      </div>
                      <div className="header-col col-student-name">
                        <span className="student-name">{student.lastName}, {student.firstName}</span>
                      </div>
                      <div className="header-col col-grade">
                        <span className="grade-badge">{student.gradeLevel}</span>
                      </div>
                      <div className="header-col col-section">
                        <span className="teacher-advosry-section-badge">{student.section?.name || "N/A"}</span>
                      </div>
                      <div className="header-col col-action">
                        <button className="expand-btn">
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Subjects */}
                    {isExpanded && (
                      <div className="student-card-body">
                        {studentSubjects.length > 0 ? (
                          <div className="subjects-table">
                            <div className="subjects-table-header">
                              <div className="subject-col subject-name-col">Subject</div>
                              <div className="subject-col subject-code-col">Code</div>
                              <div className="subject-col subject-score-col">Score (0-100)</div>
                              <div className="subject-col subject-action-col">Action</div>
                            </div>
                            {studentSubjects.map((subject) => {
                              const key = `${student.id}-${subject.id}-${selectedQuarter}`;
                              const gradeData = grades[key] || { score: "", remarks: "" };
                              
                              return (
                                <div key={subject.id} className="subject-row">
                                  <div className="subject-col subject-name-col">
                                    <strong>{subject.subjectName}</strong>
                                  </div>
                                  <div className="subject-col subject-code-col">
                                    <span className="code-badge">{subject.subjectCode}</span>
                                  </div>
                                  <div className="subject-col subject-score-col">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      placeholder="Enter score"
                                      value={gradeData.score}
                                      onChange={(e) =>
                                        handleGradeChange(student.id, subject.id, "score", e.target.value)
                                      }
                                      className="score-input"
                                    />
                                  </div>
                                  <div className="subject-col subject-action-col">
                                    <button
                                      onClick={() => handleSubmitGrade(student.id, subject.id)}
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
                        ) : (
                          <div className="no-subjects">
                            No subjects assigned for this grade level
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="action-buttons">
          <button
            onClick={handleSubmitAllGrades}
            className="submit-all-btn"
            disabled={filteredStudents.length === 0}
          >
            <FaSave /> Save All Grades for {selectedQuarter}
          </button>
        </div>
      </div>
    </div>
  );
}