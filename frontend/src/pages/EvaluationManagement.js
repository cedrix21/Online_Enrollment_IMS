import { useState, useEffect } from 'react';
import API from '../api/api';
import './EvaluationManagement.css';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import { useNavigate } from 'react-router-dom';
import { FaSyncAlt } from 'react-icons/fa';

const EvaluationManagement = () => {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const navigate = useNavigate();
  const [allGrades, setAllGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter and modal states
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [gradeLevels, setGradeLevels] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [modalOpen, setModalOpen] = useState(false);
  const [studentGrades, setStudentGrades] = useState({});
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [editData, setEditData] = useState({});

  // Check user role on mount only
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    if (user.role !== "admin" && user.role !== "registrar") {
      navigate("/dashboard");
      return;
    }

    // User is valid, fetch data
    fetchAllGrades();
  }, []);


  const fetchAllGrades = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/grades');
      const gradesData = res.data.data || [];
      setAllGrades(gradesData);

      // Extract unique grade levels and sort
      const uniqueLevels = [...new Set(gradesData.map(g => g.student?.gradeLevel))].filter(Boolean).sort();
      setGradeLevels(uniqueLevels);
      
      // Set default grade level if available
      if (uniqueLevels.length > 0 && !selectedGradeLevel) {
        setSelectedGradeLevel(uniqueLevels[0]);
      }

      setError('');
    } catch (err) {
      console.error('Error fetching grades:', err);
      
      // ✅ FIXED: Don't show error for empty data
      if (err.response?.status === 404 || err.response?.data?.message?.includes('No grades found')) {
        setError('');
        setAllGrades([]);
      } else if (err.response?.status !== 401) {
        // Only show error if it's not an auth error (401 is handled by interceptor)
        setError('Failed to fetch grades: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setSuccess('Refreshing data...');
      
      const res = await API.get('/admin/grades');
      const gradesData = res.data.data || [];
      setAllGrades(gradesData);

      const uniqueLevels = [...new Set(gradesData.map(g => g.student?.gradeLevel))].filter(Boolean).sort();
      setGradeLevels(uniqueLevels);

      setSuccess('Data refreshed successfully!');
      setTimeout(() => setSuccess(''), 2000);
      setError('');
    } catch (err) {
      console.error('Error refreshing grades:', err);
      
      if (err.response?.status === 404 || err.response?.data?.message?.includes('No grades found')) {
        setAllGrades([]);
        setSuccess('No grades available yet');
        setTimeout(() => setSuccess(''), 2000);
      } else if (err.response?.status !== 401) {
        setError('Failed to refresh: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Filter students by selected grade level
  useEffect(() => {
    if (selectedGradeLevel) {
      const filteredStudents = allGrades
        .filter(g => g.student?.gradeLevel === selectedGradeLevel)
        .map(g => g.student)
        .filter((student, index, self) => self.findIndex(s => s.id === student.id) === index) // Remove duplicates
        .sort((a, b) => `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`));
      
      setStudents(filteredStudents);
    }
  }, [selectedGradeLevel, allGrades]);

  const openStudentModal = (student) => {
    setSelectedStudent(student);
    setSelectedQuarter('Q1');
    
    // Get all grades for this student
    const studentGradesData = {};
    allGrades
      .filter(g => g.student?.id === student.id)
      .forEach(grade => {
        if (!studentGradesData[grade.quarter]) {
          studentGradesData[grade.quarter] = [];
        }
        studentGradesData[grade.quarter].push(grade);
      });
    
    setStudentGrades(studentGradesData);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedStudent(null);
    setEditingGradeId(null);
    setEditData({});
  };

  const handleEditStart = (grade) => {
    setEditingGradeId(grade.id);
    setEditData({
      score: grade.score,
      remarks: grade.remarks
    });
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (gradeId) => {
    try {
      if (editData.score < 0 || editData.score > 100) {
        setError('Score must be between 0 and 100');
        return;
      }

      const res = await API.put(`/admin/grades/${gradeId}`, {
        score: editData.score,
        remarks: editData.remarks
      });

      // Update grades in state
      const updatedGrades = allGrades.map(g => g.id === gradeId ? res.data.grade : g);
      setAllGrades(updatedGrades);

      // Update student grades modal
      const updatedStudentGrades = { ...studentGrades };
      updatedStudentGrades[selectedQuarter] = updatedStudentGrades[selectedQuarter].map(g =>
        g.id === gradeId ? res.data.grade : g
      );
      setStudentGrades(updatedStudentGrades);

      setEditingGradeId(null);
      setSuccess('Grade updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update grade: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancel = () => {
    setEditingGradeId(null);
    setEditData({});
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <SideBar user={user} />
        <div className="main-content">
          <TopBar user={user} />
          <div className="content-scroll-area" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            <div className="evaluation-container">
              <div className="loading-spinner">Loading grades...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentQuarterGrades = studentGrades[selectedQuarter] || [];

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />
        <div className="content-scroll-area" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div className="evaluation-container">
            {/* ✅ UPDATED HEADER with Refresh Button */}
            <div className="evaluation-header">
              <div>
                <h1>Student Grade Evaluation</h1>
                <p>Select a grade level and student to manage grades</p>
              </div>
              <button 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="refresh-btn"
                title="Refresh grades data"
              >
                <FaSyncAlt className={refreshing ? 'spinning' : ''} />
                {refreshing ? ' Refreshing...' : ' Refresh'}
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {!loading && allGrades.length === 0 ? (
              <div className="no-data-state" style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#f9f9f9',
                borderRadius: '12px',
                marginTop: '40px'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📊</div>
                <h3>No Grades Available Yet</h3>
                <p style={{ color: '#666', marginTop: '10px' }}>
                  Grades will appear here once teachers start inputting student evaluations.
                </p>
                <button 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  className="refresh-btn-large"
                  style={{ marginTop: '20px' }}
                >
                  <FaSyncAlt className={refreshing ? 'spinning' : ''} />
                  {refreshing ? ' Checking...' : ' Check for Updates'}
                </button>
              </div>
            ) : (
              <></>
            )}

            {/* Grade Level Filter */}
            <div className="filters-section">
              <h3>Select Grade Level</h3>
              <div className="grade-level-buttons">
                {gradeLevels.map(level => (
                  <button
                    key={level}
                    className={`grade-level-btn ${selectedGradeLevel === level ? 'active' : ''}`}
                    onClick={() => setSelectedGradeLevel(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Students List */}
           <div className="students-section">
                  <h3>Students in {selectedGradeLevel || 'Selected Grade'}</h3>
                  <div className="students-grid">
                    {students.length > 0 ? (
                      students.map(student => (
                        <div
                          key={student.id}
                          className="student-card"
                          onClick={() => openStudentModal(student)}
                        >
                          <div className="student-card-header">
                            <h4>{student.firstName || student.firstname || ''} {student.lastName || student.lastname || ''}</h4>
                          </div>
                          <div className="student-card-body">
                            <p><strong>ID:</strong> {student.studentId || 'N/A'}</p>
                            <p><strong>Section:</strong> {student.section?.name || student.section?.sectionName || 'N/A'}</p>
                            <p className="click-hint">Click to view grades</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-students">
                        <p>No students found in {selectedGradeLevel}</p>
                      </div>
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Modal */}
      {modalOpen && selectedStudent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="grade-management-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Grade Management: {selectedStudent.firstName || selectedStudent.firstname || ''} {selectedStudent.lastName || selectedStudent.lastname || ''}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {/* Quarter Selector in Modal */}
            <div className="modal-quarter-selector">
              <label>Select Quarter:</label>
              <div className="quarter-buttons">
                {['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => (
                  <button
                    key={quarter}
                    className={`quarter-btn ${selectedQuarter === quarter ? 'active' : ''}`}
                    onClick={() => setSelectedQuarter(quarter)}
                  >
                    {quarter}
                  </button>
                ))}
              </div>
            </div>

            {/* Grades Table for Selected Quarter */}
            <div className="modal-grades-table">
              <table className="grades-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Score</th>
                    <th>Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentQuarterGrades.length > 0 ? (
                    currentQuarterGrades.map(grade => (
                      <tr key={grade.id} className={editingGradeId === grade.id ? 'editing' : ''}>
                        <td>{grade.subject?.subjectName}</td>
                        <td>{grade.subject?.teacher?.firstName || grade.subject?.teacher?.firstname || 'N/A'} {grade.subject?.teacher?.lastName || grade.subject?.teacher?.lastname || ''}</td>
                        <td className="center">
                          {editingGradeId === grade.id ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editData.score}
                              onChange={(e) => handleEditChange('score', e.target.value)}
                              className="edit-input"
                            />
                          ) : (
                            <span className={`score-badge ${getScoreBadgeClass(grade.score)}`}>
                              {grade.score}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingGradeId === grade.id ? (
                            <input
                              type="text"
                              value={editData.remarks}
                              onChange={(e) => handleEditChange('remarks', e.target.value)}
                              className="edit-input"
                              placeholder="Remarks"
                            />
                          ) : (
                            <span className="remarks-text">{grade.remarks || '-'}</span>
                          )}
                        </td>
                        <td className="action-cell">
                          {editingGradeId === grade.id ? (
                            <div className="action-buttons">
                              <button
                                className="btn-save"
                                onClick={() => handleSave(grade.id)}
                              >
                                Save
                              </button>
                              <button
                                className="btn-cancel"
                                onClick={handleCancel}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn-edit"
                              onClick={() => handleEditStart(grade)}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="no-data">
                      <td colSpan="5">No grades for {selectedQuarter}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button className="btn-close-modal" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getScoreBadgeClass = (score) => {
  if (score >= 90) return 'score-excellent';
  if (score >= 80) return 'score-good';
  if (score >= 70) return 'score-satisfactory';
  if (score >= 60) return 'score-passing';
  return 'score-failing';
};

export default EvaluationManagement;
