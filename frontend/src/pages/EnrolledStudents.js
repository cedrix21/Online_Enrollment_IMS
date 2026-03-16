// pages/EnrolledStudents.js
import React, { useState, useEffect, useMemo } from 'react';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import API from '../api/api';
import './EnrolledStudents.css';
import { FaSearch, FaFileExcel, FaPlus, FaTrash, FaEdit, FaPencilAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx';

const EnrolledStudents = () => {
  // Helper functions
  function getCurrentSchoolYear() {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  }

  const currentSchoolYear = getCurrentSchoolYear();

  const getPastSchoolYears = () => {
    const years = [];
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const currentStart = month >= 6 ? year : year - 1;
    for (let i = 1; i <= 10; i++) {
      const start = currentStart - i;
      years.push(`${start}-${start + 1}`);
    }
    return years;
  };

  const pastSchoolYears = getPastSchoolYears();

  const [user] = useState(() => JSON.parse(localStorage.getItem('user')));
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSchoolYear, setFilterSchoolYear] = useState(currentSchoolYear); // default to current

  // Modal state (for manual records only)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    studentId: '',     
    firstName: '',
    lastName: '',
    gradeLevel: '',
    lrn: '',
    contactNumber: '',
    schoolYear: pastSchoolYears[0],
  });

  // LRN modal state (for enrolled students)
  const [lrnModalOpen, setLrnModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [lrnInput, setLrnInput] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [filterSchoolYear]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/students/current-year?school_year=${filterSchoolYear}`);
      setStudents(res.data);
    } catch (err) {
      console.error('Error fetching student records', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete manual record
  const handleDeleteStudent = async (id, studentName) => {
    if (!window.confirm(`Are you sure you want to delete ${studentName}?`)) return;
    try {
      await API.delete(`/student-records/${id}`);
      fetchStudents();
    } catch (err) {
      console.error('Error deleting student record', err);
      alert('Failed to delete. ' + (err.response?.data?.message || ''));
    }
  };

  // Open edit modal for manual record
  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      student_id: record.student_id, 
      firstName: record.firstName,
      lastName: record.lastName,
      gradeLevel: record.gradeLevel,
      lrn: record.lrn || '',
      contactNumber: record.contactNumber,
      schoolYear: record.schoolYear,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    setFormData({
      studentId: '',
      firstName: '',
      lastName: '',
      gradeLevel: '',
      lrn: '',
      contactNumber: '',
      schoolYear: pastSchoolYears[0],
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await API.put(`/student-records/${editingRecord.id}`, formData);
        closeModal();
      } else {
        await API.post('/student-records', formData);
        alert('Record added successfully! You can add another one or close the form.');
        setFormData({
          firstName: '',
          lastName: '',
          gradeLevel: '',
          lrn: '',
          contactNumber: '',
          schoolYear: pastSchoolYears[0],
        });
      }
      fetchStudents(); // refresh after add/update
    } catch (err) {
      console.error('Error saving record', err);
      alert('Failed to save. ' + (err.response?.data?.message || ''));
    }
  };

  // LRN modal handlers
  const openLrnModal = (student) => {
    setSelectedStudent(student);
    setLrnInput(student.lrn || '');
    setLrnModalOpen(true);
  };

  const closeLrnModal = () => {
    setLrnModalOpen(false);
    setSelectedStudent(null);
    setLrnInput('');
  };

  const handleLrnUpdate = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await API.patch(`/students/${selectedStudent.id}/lrn`, { lrn: lrnInput });
      closeLrnModal();
      fetchStudents();
    } catch (err) {
      console.error('Error updating LRN', err);
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      alert('Failed to update LRN: ' + errorMsg);
    }
  };

  // Unique grade levels from current dataset
  const gradeLevels = useMemo(() => {
    const levels = [...new Set(students.map(s => s.gradeLevel))].filter(Boolean);
    const order = {
      'Nursery': 0,
      'Kindergarten 1': 1,
      'Kindergarten 2': 2,
      'Grade 1': 3,
      'Grade 2': 4,
      'Grade 3': 5,
      'Grade 4': 6,
      'Grade 5': 7,
      'Grade 6': 8,
    };
    return levels.sort((a, b) => (order[a] || 99) - (order[b] || 99));
  }, [students]);

  // All available school years (from records + past years list)
  const schoolYears = useMemo(() => {
    const yearsFromRecords = [...new Set(students.map(s => s.schoolYear))].filter(Boolean);
    const allYears = new Set([...yearsFromRecords, ...pastSchoolYears, currentSchoolYear]);
    return Array.from(allYears).sort().reverse(); // most recent first
  }, [students, pastSchoolYears, currentSchoolYear]);

  // Filtered and sorted students (already scoped to selected school year, but also by grade and search)
  const filteredStudents = useMemo(() => {
    let filtered = students;
    if (filterGrade !== 'all') {
      filtered = filtered.filter(s => s.gradeLevel === filterGrade);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
        (s.studentId && s.studentId.toLowerCase().includes(term))
      );
    }
    const order = {
      'Nursery': 0,
      'Kindergarten 1': 1,
      'Kindergarten 2': 2,
      'Grade 1': 3,
      'Grade 2': 4,
      'Grade 3': 5,
      'Grade 4': 6,
      'Grade 5': 7,
      'Grade 6': 8,
    };
    return filtered.sort((a, b) => {
      const gradeDiff = (order[a.gradeLevel] || 99) - (order[b.gradeLevel] || 99);
      if (gradeDiff !== 0) return gradeDiff;
      return (a.lastName || '').localeCompare(b.lastName || '');
    });
  }, [students, filterGrade, searchTerm]);

  const exportToExcel = () => {
    const data = filteredStudents.map(s => ({
      'Student ID': s.studentId || s.id,
      'Name': `${s.lastName}, ${s.firstName}`,
      'Grade Level': s.gradeLevel,
      'School Year': s.schoolYear,
      'LRN': s.lrn || '—',
      'Contact Number': s.contactNumber,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Records');
    XLSX.writeFile(wb, `Student_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />
        <div className="content-scroll-area" style={{ padding: '20px' }}>
          <div className="enrolled-container">
            <div className="enrolled-header">
              <h2>Student Records</h2>
              <div>
                <button className="btn-add" onClick={() => setModalOpen(true)}>
                  <FaPlus /> Add Record
                </button>
                <button className="btn-excel" onClick={exportToExcel}>
                  <FaFileExcel /> Export to Excel
                </button>
              </div>
            </div>

            <div className="filters-bar">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                <option value="all">All Grades</option>
                {gradeLevels.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select value={filterSchoolYear} onChange={(e) => setFilterSchoolYear(e.target.value)}>
                <option value="all">All School Years</option>
                {schoolYears.map(sy => (
                  <option key={sy} value={sy}>{sy}</option>
                ))}
              </select>
              <div className="student-count">
                {filteredStudents.length} record(s)
              </div>
            </div>

            {loading ? (
              <div className="loading-spinner">Loading records...</div>
            ) : (
              <div className="table-responsive">
                <table className="enrolled-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Grade Level</th>
                      <th>School Year</th>
                      <th>LRN</th>
                      <th>Contact Number</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(s => (
                        <tr key={`${s.source}-${s.id}`}>
                          <td>{s.studentId || s.id}</td>
                          <td>{s.lastName}, {s.firstName}</td>
                          <td>{s.gradeLevel}</td>
                          <td>{s.schoolYear}</td>
                          <td>{s.lrn || '—'}</td>
                          <td>{s.contactNumber}</td>
                          <td className="action-cell">
                            {s.source === 'manual' ? (
                              <>
                                <button
                                  className="btn-edit"
                                  onClick={() => openEditModal(s)}
                                  title="Edit record"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  className="btn-delete"
                                  onClick={() => handleDeleteStudent(s.id, `${s.lastName}, ${s.firstName}`)}
                                  title="Delete record"
                                >
                                  <FaTrash />
                                </button>
                              </>
                            ) : (
                              // Enrolled students: only LRN edit
                              <button
                                className="btn-lrn-edit"
                                onClick={() => openLrnModal(s)}
                                title="Edit LRN"
                              >
                                <FaPencilAlt />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="no-data">No records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Modal for Manual Records */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRecord ? 'Edit Student Record' : 'Add Student Record'}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
              <label>Student ID</label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                placeholder="e.g., REC-2026-0001"
                required
              />
            </div>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Grade Level</label>
                <select
                  name="gradeLevel"
                  value={formData.gradeLevel}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Grade</option>
                  <option value="Nursery">Nursery</option>
                  <option value="Kindergarten 1">Kindergarten 1</option>
                  <option value="Kindergarten 2">Kindergarten 2</option>
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={`Grade ${n}`}>Grade {n}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>LRN (Optional)</label>
                <input
                  type="text"
                  name="lrn"
                  value={formData.lrn}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="text"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>School Year</label>
                <select
                  name="schoolYear"
                  value={formData.schoolYear}
                  onChange={handleInputChange}
                  required
                >
                  {pastSchoolYears.map(sy => (
                    <option key={sy} value={sy}>{sy}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-submit">
                  {editingRecord ? 'Update Record' : 'Add Record'}
                </button>
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LRN Edit Modal for Enrolled Students */}
      {lrnModalOpen && selectedStudent && (
        <div className="modal-overlay" onClick={closeLrnModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit LRN</h3>
              <button className="modal-close" onClick={closeLrnModal}>×</button>
            </div>
            <form onSubmit={handleLrnUpdate}>
              <div className="form-group">
                <label>Student: {selectedStudent.lastName}, {selectedStudent.firstName}</label>
                <label>LRN</label>
                <input
                  type="text"
                  value={lrnInput}
                  onChange={(e) => setLrnInput(e.target.value)}
                  placeholder="Enter LRN (optional)"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-submit">Update LRN</button>
                <button type="button" className="btn-cancel" onClick={closeLrnModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrolledStudents;