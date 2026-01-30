import { useState, useEffect } from "react";
import API from "../api/api";
import { FaSyncAlt, FaChevronUp, FaChevronDown, FaSave } from 'react-icons/fa';
import "./TeacherAdvisory.css";
export default function TeacherAdvisory() {
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

      // Build grades object from existing data
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

      setSuccess(`Grade saved successfully for student`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error saving grade:", err);
      setError(err.response?.data?.message || "Failed to save grade");
    }
  };

  const handleSubmitAllGrades = async () => {
    try {
      const gradesToSubmit = Object.entries(grades).map(([key, data]) => {
        const [studentId, subjectId, quarter] = key.split("-");
        return {
          student_id: parseInt(studentId),
          subject_id: parseInt(subjectId),
          score: data.score,
          remarks: data.remarks || "",
          quarter: quarter,
        };
      });

      for (const gradeData of gradesToSubmit) {
        if (gradeData.score) {
          await API.post("/teacher/grades", gradeData);
        }
      }

      setSuccess("All grades saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
      fetchData();
    } catch (err) {
      console.error("Error saving grades:", err);
      setError(err.response?.data?.message || "Failed to save grades");
    }
  };

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
      {/* Sticky Header Wrapper */}
      <div className="sticky-header-wrapper">
        <div className="advisory-header">
          <div>
            <h1>Teacher {teacherInfo?.firstName} {teacherInfo?.lastName} - {teacherInfo?.advisory_grade} Evaluation</h1>
            <p><strong>Input grades for Section {teacherInfo?.section} students</strong></p>
          </div>
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="refresh-btn"
            title="Refresh student data"
          >
            <FaSyncAlt className={refreshing ? 'spinning' : ''} />
            {refreshing ? ' Refreshing...' : ' Refresh'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="quarter-selector">
          <label>Select Quarter:</label>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="quarter-select"
          >
            <option value="Q1">Quarter 1</option>
            <option value="Q2">Quarter 2</option>
            <option value="Q3">Quarter 3</option>
            <option value="Q4">Quarter 4</option>
          </select>
        </div>
      </div>

      {/* Scrollable Content: Accordion Style */}
      <div className="scrollable-content">
        {students.length === 0 ? (
          <div className="no-students">
            <p>No students assigned to your advisory class</p>
          </div>
        ) : (
          <div className="student-accordion-list">
            {students.map((student) => (
              <div 
                key={student.id} 
                className={`student-card ${expandedStudentId === student.id ? 'active' : ''}`}
              >
                {/* Clickable Header for each Student */}
                <div className="student-card-header" onClick={() => toggleStudent(student.id)}>
                  <div className="student-info-main">
                    <span className="sid">{student.studentId}</span>
                    <span className="sname">{student.lastName}, {student.firstName}</span>
                    <span className="ssection">({student.section?.name || "N/A"})</span>
                  </div>
                  <div className="chevron">
                    {expandedStudentId === student.id ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </div>

                {/* Expanded Subject List */}
                {expandedStudentId === student.id && (
                  <div className="student-card-body">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => {
                        const key = `${student.id}-${subject.id}-${selectedQuarter}`;
                        const gradeData = grades[key] || { score: "", remarks: "" };
                        return (
                          <div key={subject.id} className="subject-row">
                            <span className="subject-name">{subject.subjectName}</span>
                            <div className="grade-inputs">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Score"
                                value={gradeData.score}
                                onChange={(e) =>
                                  handleGradeChange(student.id, subject.id, "score", e.target.value)
                                }
                                className="grade-input"
                              />
                              <button
                                onClick={() => handleSubmitGrade(student.id, subject.id)}
                                className="save-grade-btn"
                                title="Save this grade"
                              >
                                <FaSave />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-subjects">No subjects assigned</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="action-buttons">
          <button
            onClick={handleSubmitAllGrades}
            className="submit-all-btn"
            disabled={students.length === 0}
          >
            Save All Grades
          </button>
        </div>
      </div>
    </div>
  );
  
}
