import { useEffect, useState, useCallback, useMemo, memo } from "react";
import API from "../api/api";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import {
  FaChalkboardTeacher,
  FaUserPlus,
  FaBookOpen,
  FaEnvelope,
  FaTimes,
  FaPlus,
  FaTrash,
  FaEdit,
  FaSyncAlt,
} from "react-icons/fa";
import "./TeacherDirectory.css";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GRADE_LEVELS = [
  "Nursery",
  "Kindergarten 1",
  "Kindergarten 2",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

const CACHE_KEY = 'teacher_directory_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const INITIAL_TEACHER_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  specialization: "",
  advisory_grade: "",
  phone: "",
  status: "active",
};

const INITIAL_ASSIGNMENT_FORM = {
  subject_id: "",
  gradeLevel: "",
  schedule: "",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Sort teachers by advisory grade
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const sortTeachersByAdvisory = (teachers) => {
  const gradeOrder = GRADE_LEVELS.reduce((acc, grade, index) => {
    acc[grade] = index;
    return acc;
  }, {});

  return [...teachers].sort((a, b) => {
    const aGrade = a.advisory_grade;
    const bGrade = b.advisory_grade;
    if (aGrade && bGrade) {
      return (gradeOrder[aGrade] ?? Infinity) - (gradeOrder[bGrade] ?? Infinity);
    }
    if (aGrade && !bGrade) return -1;
    if (!aGrade && bGrade) return 1;
    return (a.lastName || '').localeCompare(b.lastName || '');
  });
};


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMOIZED COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TeacherCard = memo(({ 
  teacher, 
  isExpanded, 
  onToggleExpand, 
  onAssign, 
  onEdit, 
  onRemoveAssignment 
}) => {
  return (
    <div className="teacher-card">
      <div className="card-top">
        <div className="teacher-avatar">
          {teacher.firstName[0]}
          {teacher.lastName[0]}
        </div>
        <div className="teacher-info">
          <h3>
            {teacher.firstName} {teacher.lastName}
          </h3>
          <span className="teacher-id">{teacher.teacherId}</span>
        </div>
      </div>

      <div className="card-body">
        <div className="info-row">
          <FaEnvelope className="icon" />
          <span>{teacher.email}</span>
        </div>
        <div className="info-row">
          <FaBookOpen className="icon" />
          <strong>Adviser of: </strong>
          <span className="advisory-tag">
            {teacher.advisory_grade || "None"}
          </span>
        </div>
        <p style={{ fontSize: "0.9rem", marginTop: "10px" }}>
          Specialization: <strong>{teacher.specialization}</strong>
        </p>

        {isExpanded && (
          <div className="teacher-load-dropdown">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h4>Assigned Subjects:</h4>
              <button
                className="mini-add-btn"
                onClick={() => onAssign(teacher)}
                title="Assign new subject"
              >
                <FaPlus /> Assign
              </button>
            </div>

            {teacher.assignments && teacher.assignments.length > 0 ? (
              <ul className="assignment-list">
                {teacher.assignments.map((assignment) => (
                  <li key={assignment.id} className="assignment-item">
                    <div className="assignment-info">
                      <strong>{assignment.subject?.subjectCode}:</strong>
                      {assignment.subject?.subjectName}
                      <span className="grade-pill">
                        {assignment.gradeLevel}
                      </span>
                      {assignment.schedule && (
                        <div className="schedule-text">
                          {assignment.schedule}
                        </div>
                      )}
                    </div>
                    <button
                      className="remove-assignment-btn"
                      onClick={() => onRemoveAssignment(assignment.id)}
                      title="Remove assignment"
                    >
                      <FaTrash />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-data-text">No subjects assigned yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="card-actions">
        <button className="edit-link" onClick={() => onEdit(teacher)}>
          <FaEdit /> Edit
        </button>
        <button
          className="assign-link"
          onClick={() => onToggleExpand(teacher.id)}
        >
          {isExpanded ? "Hide Load" : "View Load"}
        </button>
      </div>
    </div>
  );
});

export default function TeacherDirectory() {
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  
  const [teachers, setTeachers] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [teacherLoad, setTeacherLoad] = useState([]);
  const [expandedTeacher, setExpandedTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState(null);
  const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState(null);
  
  const [newTeacher, setNewTeacher] = useState(INITIAL_TEACHER_FORM);
  const [editTeacherForm, setEditTeacherForm] = useState(INITIAL_TEACHER_FORM);
  const [assignmentForm, setAssignmentForm] = useState(INITIAL_ASSIGNMENT_FORM);
  const [selectedSubjectsForBulk, setSelectedSubjectsForBulk] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(() => {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
});

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Cache helpers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(`${CACHE_KEY}_time`);
  }, []);

  const fetchData = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setTeacherLoad([]);

      if (!force) {
        const cached = localStorage.getItem(CACHE_KEY);
        const cacheTime = localStorage.getItem(`${CACHE_KEY}_time`);
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < CACHE_DURATION) {
            const data = JSON.parse(cached);
            setTeachers(sortTeachersByAdvisory(data.teachers));
            setAvailableSubjects(data.subjects);
            setTeacherLoad(data.load);
            setLoading(false);
            return;
          }
        }
      }

      const [teacherRes, subjectRes, loadRes] = await Promise.all([
      API.get("/teachers", { params: { school_year: selectedSchoolYear } }),
      API.get("/subjects", { params: { school_year: selectedSchoolYear } }),
      API.get("/teacher-load", { params: { school_year: selectedSchoolYear } }),
    ]);

      const sortedTeachers = sortTeachersByAdvisory(teacherRes.data);
      const data = {
        teachers: sortedTeachers,
        subjects: subjectRes.data,
        load: loadRes.data,
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());

      setTeachers(sortedTeachers);
      setAvailableSubjects(data.subjects);
      setTeacherLoad(data.load);
      
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolYear,invalidateCache]);

  useEffect(() => {
     invalidateCache();     
  fetchData(true); 
}, [selectedSchoolYear]);

  // Memoized Maps
  const advisoryMap = useMemo(() => {
    const map = new Map();
    teachers.forEach((t) => {
      if (t.advisory_grade) {
        map.set(t.advisory_grade, t);
      }
    });
    return map;
  }, [teachers]);

  const assignedSubjectIds = useMemo(() => {
    return new Set(teacherLoad.map(a => Number(a.subject_id)));
  }, [teacherLoad]);

  const availableSubjectsForAssignment = useMemo(() => {
    return availableSubjects.filter(
      (subject) => !assignedSubjectIds.has(subject.id)
    );
  }, [availableSubjects, assignedSubjectIds]);

  const getTeacherWithAdvisory = useCallback((gradeLevel) => {
    return advisoryMap.get(gradeLevel);
  }, [advisoryMap]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Event Handlers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleAddTeacher = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await API.post("/teachers", newTeacher);
      setTeachers(prev => sortTeachersByAdvisory([...prev, res.data.teacher]));
      invalidateCache();
      setNewTeacher(INITIAL_TEACHER_FORM);
      setShowModal(false);
      alert("Teacher added successfully!");
    } catch (err) {
      console.error("Backend Error:", err.response?.data);
      alert(err.response?.data?.message || "Failed to add teacher");
    } finally {
      setIsSubmitting(false);
    }
  }, [newTeacher, invalidateCache]);

  const openAssignModal = useCallback((teacher) => {
    setSelectedTeacherForAssign(teacher);
    setAssignmentForm(INITIAL_ASSIGNMENT_FORM);
    setSelectedSubjectsForBulk([]);
    setShowAssignModal(true);
  }, []);

  const handleAssignSubject = useCallback(async (e) => {
    e.preventDefault();
    const subjectsToAssign = selectedSubjectsForBulk.length > 0 
      ? selectedSubjectsForBulk 
      : (assignmentForm.subject_id ? [assignmentForm.subject_id] : []);

    if (subjectsToAssign.length === 0) {
      alert("Please select at least one subject");
      return;
    }

    setIsSubmitting(true);

    try {
      const assignmentPromises = subjectsToAssign.map((subjectId) => {
        const subject = availableSubjects.find(s => s.id === parseInt(subjectId));
        return API.post(
          `/teachers/${selectedTeacherForAssign.id}/assign-subject`,
          {
            subject_id: subjectId,
            gradeLevel: subject?.gradeLevel || "",
            schedule: "",
             school_year: selectedSchoolYear, 
          }
        );
      });

      const responses = await Promise.all(assignmentPromises);
      
      setTeachers(prev => prev.map(teacher => {
        if (teacher.id === selectedTeacherForAssign.id) {
          const newAssignments = responses.map(res => res.data.assignment);
          return {
            ...teacher,
            assignments: [...(teacher.assignments || []), ...newAssignments]
          };
        }
        return teacher;
      }));
      
      setTeacherLoad(prev => [...prev, ...responses.map(res => res.data.assignment)]);
      invalidateCache();
      setAssignmentForm(INITIAL_ASSIGNMENT_FORM);
      setSelectedSubjectsForBulk([]);
      alert(`✅ ${subjectsToAssign.length} subject(s) assigned successfully!`);
    } catch (err) {
      console.error("Assignment Error:", err.response?.data);
      alert(err.response?.data?.message || "Failed to assign subjects");
    } finally {
      setIsSubmitting(false);
    }
  }, [assignmentForm, selectedSubjectsForBulk, selectedTeacherForAssign, availableSubjects, invalidateCache]);

  const handleRemoveAssignment = useCallback(async (assignmentId) => {
    if (!window.confirm("Remove this subject assignment?")) return;

    try {
      await API.delete(`/teachers/subject-assignments/${assignmentId}`); 
      setTeachers(prev => prev.map(teacher => {
        if (teacher.assignments) {
          return {
            ...teacher,
            assignments: teacher.assignments.filter(a => a.id !== assignmentId)
          };
        }
        return teacher;
      }));
      setTeacherLoad(prev => prev.filter(a => a.id !== assignmentId));
      invalidateCache();
      alert("Assignment removed successfully!");
    } catch (err) {
      console.error("Remove Error:", err.response?.data);
      alert("Failed to remove assignment");
    }
  }, [invalidateCache]);

  const handleSubjectChange = useCallback((subjectId) => {
    const selectedSub = availableSubjects.find((s) => s.id === parseInt(subjectId));
    setAssignmentForm(prev => ({
      ...prev,
      subject_id: subjectId,
      gradeLevel: selectedSub?.gradeLevel || "",
    }));
  }, [availableSubjects]);

  const openEditModal = useCallback((teacher) => {
    setSelectedTeacherForEdit(teacher);
    setEditTeacherForm({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      specialization: teacher.specialization,
      advisory_grade: teacher.advisory_grade || "",
      phone: teacher.phone || "",
      status: teacher.status,
    });
    setShowEditModal(true);
  }, []);

  const handleEditTeacher = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await API.put(`/teachers/${selectedTeacherForEdit.id}`, editTeacherForm);
      setTeachers(prev => {
        const updated = prev.map((teacher) => 
          teacher.id === selectedTeacherForEdit.id 
            ? { ...teacher, ...res.data.teacher }
            : teacher
        );
        return sortTeachersByAdvisory(updated);
      });
      invalidateCache();
      setShowEditModal(false);
      alert("Teacher updated successfully!");
    } catch (err) {
      console.error("Edit Error:", err.response?.data);
      alert(err.response?.data?.message || "Failed to update teacher");
    } finally {
      setIsSubmitting(false);
    }
  }, [editTeacherForm, selectedTeacherForEdit, invalidateCache]);

  const toggleExpandTeacher = useCallback((teacherId) => {
    setExpandedTeacher(prev => prev === teacherId ? null : teacherId);
  }, []);

  const refreshSubjects = useCallback(async () => {
  try {
    const [subjectRes, loadRes] = await Promise.all([
      API.get("/subjects", { params: { school_year: selectedSchoolYear } }),
      API.get("/teacher-load", { params: { school_year: selectedSchoolYear } }),
    ]);
    setAvailableSubjects(subjectRes.data);
    setTeacherLoad(loadRes.data);
    // Update cache
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      data.subjects = subjectRes.data;
      data.load = loadRes.data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());
    }
    alert("✅ Subject list refreshed!");
  } catch (err) {
    console.error("Refresh failed", err);
    alert("Failed to refresh subjects. Please try again.");
  }
}, [selectedSchoolYear]);

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

        <div className="content-scroll-area" style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          <div className="directory-container">
            <div className="directory-header">
                <div className="title-group">
                  <FaChalkboardTeacher
                    className="title-icon"
                    style={{ color: "#b8860b", fontSize: "2rem", marginRight: "15px" }}
                  />
                  <div>
                    <h2>Faculty Directory</h2>
                    <p>Manage advisory roles and subject assignments</p>
                  </div>
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
                  <button className="add-teacher-btn" onClick={() => setShowModal(true)}>
                    <FaUserPlus /> Add Teacher
                  </button>
                </div>
              </div>

            {loading ? (
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center",
                minHeight: "400px",
                textAlign: "center"
              }}>
                <div>
                  <div style={{ fontSize: "3rem", marginBottom: "20px", color: "#b8860b" }}>⏳</div>
                  <h3 style={{ color: "#333", fontWeight: 600, marginBottom: "10px" }}>Loading Faculty</h3>
                  <p style={{ color: "#666", fontSize: "0.95rem" }}>Fetching faculty directory...</p>
                </div>
              </div>
            ) : (
              <div className="teacher-grid">
                {teachers.map((teacher) => (
                  <TeacherCard
                    key={teacher.id}
                    teacher={teacher}
                    isExpanded={expandedTeacher === teacher.id}
                    onToggleExpand={toggleExpandTeacher}
                    onAssign={openAssignModal}
                    onEdit={openEditModal}
                    onRemoveAssignment={handleRemoveAssignment}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <AddTeacherModal
            newTeacher={newTeacher}
            setNewTeacher={setNewTeacher}
            onSubmit={handleAddTeacher}
            onClose={() => setShowModal(false)}
            isSubmitting={isSubmitting}
            getTeacherWithAdvisory={getTeacherWithAdvisory}
          />
        )}

        {showEditModal && (
          <EditTeacherModal
            editTeacherForm={editTeacherForm}
            setEditTeacherForm={setEditTeacherForm}
            onSubmit={handleEditTeacher}
            onClose={() => setShowEditModal(false)}
            isSubmitting={isSubmitting}
            selectedTeacher={selectedTeacherForEdit}
            getTeacherWithAdvisory={getTeacherWithAdvisory}
          />
        )}

        {showAssignModal && (
          <AssignSubjectModal
            assignmentForm={assignmentForm}
            onSubjectChange={handleSubjectChange}
            onSubmit={handleAssignSubject}
            onClose={() => {
              setShowAssignModal(false);
              setSelectedSubjectsForBulk([]);
            }}
            isSubmitting={isSubmitting}
            selectedTeacher={selectedTeacherForAssign}
            availableSubjects={availableSubjectsForAssignment}
            selectedSubjectsForBulk={selectedSubjectsForBulk}
            setSelectedSubjectsForBulk={setSelectedSubjectsForBulk}
            onRefreshSubjects={refreshSubjects}
          />
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODAL COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AddTeacherModal = memo(({ 
  newTeacher, 
  setNewTeacher, 
  onSubmit, 
  onClose, 
  isSubmitting,
  getTeacherWithAdvisory 
}) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h3>Register New Faculty</h3>
        <FaTimes className="close-icon" onClick={onClose} />
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <input
            type="text"
            placeholder="First Name"
            required
            value={newTeacher.firstName}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, firstName: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Last Name"
            required
            value={newTeacher.lastName}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, lastName: e.target.value })
            }
          />
        </div>

        <div className="form-grid">
          <input
            type="email"
            placeholder="Email Address"
            required
            value={newTeacher.email}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, email: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Phone Number"
            required
            value={newTeacher.phone}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, phone: e.target.value })
            }
          />
        </div>

        <input
          type="text"
          placeholder="Specialization (e.g., Mathematics)"
          required
          value={newTeacher.specialization}
          onChange={(e) =>
            setNewTeacher({ ...newTeacher, specialization: e.target.value })
          }
        />

        <div className="form-grid">
          <select
            value={newTeacher.advisory_grade}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, advisory_grade: e.target.value })
            }
          >
            <option value="">No Advisory (N/A)</option>
            {GRADE_LEVELS.map((grade) => {
              const assignedTeacher = getTeacherWithAdvisory(grade);
              return (
                <option 
                  key={grade} 
                  value={grade}
                  disabled={!!assignedTeacher}
                >
                  {grade}
                  {assignedTeacher ? ` (Assigned to ${assignedTeacher.firstName} ${assignedTeacher.lastName})` : ''}
                </option>
              );
            })}
          </select>

          <select
            value={newTeacher.status}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, status: e.target.value })
            }
          >
            <option value="active">Status: Active</option>
            <option value="on_leave">Status: On Leave</option>
            <option value="resigned">Status: Resigned</option>
          </select>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting}
          style={{ opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? "Registering..." : "Register Teacher"}
        </button>
      </form>
    </div>
  </div>
));

const EditTeacherModal = memo(({ 
  editTeacherForm, 
  setEditTeacherForm, 
  onSubmit, 
  onClose, 
  isSubmitting,
  selectedTeacher,
  getTeacherWithAdvisory 
}) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h3>
          <FaEdit /> Edit Teacher - {selectedTeacher?.firstName}{" "}
          {selectedTeacher?.lastName}
        </h3>
        <FaTimes className="close-icon" onClick={onClose} />
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <input
            type="text"
            placeholder="First Name"
            required
            value={editTeacherForm.firstName}
            onChange={(e) =>
              setEditTeacherForm({ ...editTeacherForm, firstName: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Last Name"
            required
            value={editTeacherForm.lastName}
            onChange={(e) =>
              setEditTeacherForm({ ...editTeacherForm, lastName: e.target.value })
            }
          />
        </div>

        <div className="form-grid">
          <input
            type="email"
            placeholder="Email Address"
            required
            value={editTeacherForm.email}
            onChange={(e) =>
              setEditTeacherForm({ ...editTeacherForm, email: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Phone Number"
            required
            value={editTeacherForm.phone}
            onChange={(e) =>
              setEditTeacherForm({ ...editTeacherForm, phone: e.target.value })
            }
          />
        </div>

        <input
          type="text"
          placeholder="Specialization (e.g., Mathematics)"
          required
          value={editTeacherForm.specialization}
          onChange={(e) =>
            setEditTeacherForm({
              ...editTeacherForm,
              specialization: e.target.value,
            })
          }
        />

        <div className="form-grid">
          <select
            value={editTeacherForm.advisory_grade}
            onChange={(e) =>
              setEditTeacherForm({
                ...editTeacherForm,
                advisory_grade: e.target.value,
              })
            }
          >
            <option value="">No Advisory (N/A)</option>
            {GRADE_LEVELS.map((grade) => {
              const assignedTeacher = getTeacherWithAdvisory(grade);
              const isCurrentTeacher = assignedTeacher?.id === selectedTeacher?.id;
              return (
                <option 
                  key={grade} 
                  value={grade}
                  disabled={!!assignedTeacher && !isCurrentTeacher}
                >
                  {grade}
                  {assignedTeacher && !isCurrentTeacher ? ` (Assigned to ${assignedTeacher.firstName} ${assignedTeacher.lastName})` : ''}
                </option>
              );
            })}
          </select>

          <select
            value={editTeacherForm.status}
            onChange={(e) =>
              setEditTeacherForm({ ...editTeacherForm, status: e.target.value })
            }
          >
            <option value="active">Status: Active</option>
            <option value="on_leave">Status: On Leave</option>
            <option value="resigned">Status: Resigned</option>
          </select>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting}
          style={{ opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? "Updating..." : "Update Teacher"}
        </button>
      </form>
    </div>
  </div>
));

const AssignSubjectModal = memo(({ 
  assignmentForm, 
  onSubjectChange, 
  onSubmit, 
  onClose, 
  isSubmitting,
  selectedTeacher,
  availableSubjects,
  selectedSubjectsForBulk,
  setSelectedSubjectsForBulk,
  onRefreshSubjects,
}) => {
  const [assignMode, setAssignMode] = useState("single");
  const [refreshing, setRefreshing] = useState(false);

  const handleCheckboxChange = (subjectId) => {
    setSelectedSubjectsForBulk(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubjectsForBulk.length === availableSubjects.length) {
      setSelectedSubjectsForBulk([]);
    } else {
      setSelectedSubjectsForBulk(availableSubjects.map(s => s.id));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshSubjects();
    setRefreshing(false);
  };

  const handleBulkSubmit = (e) => {
    e.preventDefault();
    if (selectedSubjectsForBulk.length === 0) {
      alert("Please select at least one subject");
      return;
    }
    onSubmit(e);
  };

  const handleSingleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h3>
            Assign Subjects to {selectedTeacher?.firstName}{" "}
            {selectedTeacher?.lastName}
          </h3>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.2rem",
                padding: "5px",
                borderRadius: "4px",
                transition: "all 0.2s",
              }}
              title="Refresh subject list"
            >
              <FaSyncAlt className={refreshing ? "spinning" : ""} />
            </button>
            <FaTimes className="close-icon" onClick={onClose} />
          </div>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: "flex", borderBottom: "2px solid #e0d8b0", marginBottom: "20px" }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: "12px",
              background: assignMode === "single" ? "#f7e14b" : "transparent",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              color: assignMode === "single" ? "#333" : "#999",
              borderBottom: assignMode === "single" ? "3px solid #b8860b" : "none",
            }}
            onClick={() => {
              setAssignMode("single");
              setSelectedSubjectsForBulk([]);
            }}
          >
            📌 Single Subject
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: "12px",
              background: assignMode === "bulk" ? "#f7e14b" : "transparent",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              color: assignMode === "bulk" ? "#333" : "#999",
              borderBottom: assignMode === "bulk" ? "3px solid #b8860b" : "none",
            }}
            onClick={() => setAssignMode("bulk")}
          >
            ✓ Bulk ({selectedSubjectsForBulk.length})
          </button>
        </div>

        {/* Single Subject Mode */}
        {assignMode === "single" ? (
          <form onSubmit={handleSingleSubmit}>
            <div className="form-group">
              <label>Select Subject</label>
              <select
                value={assignmentForm.subject_id}
                onChange={(e) => onSubjectChange(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "2px solid #e0d8b0" }}
              >
                <option value="">-- Choose Subject --</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subjectCode} - {subject.subjectName} ({subject.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Detected Grade Level</label>
              <input
                type="text"
                value={assignmentForm.gradeLevel}
                placeholder="Select a subject to detect grade..."
                readOnly
                style={{
                  backgroundColor: "#f0f0f0",
                  cursor: "not-allowed",
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "2px solid #e0d8b0",
                }}
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={!assignmentForm.subject_id || isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? "Assigning..." : "Assign Subject"}
            </button>
          </form>
        ) : (
          /* Bulk Assignment Mode */
          <form onSubmit={handleBulkSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h4 style={{ margin: 0 }}>Choose Subjects</h4>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    padding: "6px 12px",
                    background: "#f7e14b",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {selectedSubjectsForBulk.length === availableSubjects.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div
                style={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  border: "2px solid #e0d8b0",
                  borderRadius: "6px",
                  padding: "10px",
                }}
              >
                {availableSubjects.length > 0 ? (
                  availableSubjects.map((subject) => (
                    <label
                      key={subject.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "10px",
                        marginBottom: "8px",
                        background: selectedSubjectsForBulk.includes(subject.id) ? "#fffef8" : "transparent",
                        borderRadius: "4px",
                        cursor: "pointer",
                        border: selectedSubjectsForBulk.includes(subject.id) ? "1px solid #f7e14b" : "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjectsForBulk.includes(subject.id)}
                        onChange={() => handleCheckboxChange(subject.id)}
                        style={{ marginRight: "12px", cursor: "pointer", width: "18px", height: "18px" }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong>{subject.subjectCode}</strong> - {subject.subjectName}
                        <div style={{ fontSize: "0.85rem", color: "#666" }}>
                          {subject.gradeLevel}
                        </div>
                      </div>
                    </label>
                  ))
                ) : (
                  <p style={{ textAlign: "center", color: "#999", margin: "20px 0" }}>
                    No subjects available for assignment
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "15px", padding: "10px", background: "#f0f0f0", borderRadius: "6px" }}>
              <strong>{selectedSubjectsForBulk.length}</strong> subject(s) selected
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={selectedSubjectsForBulk.length === 0 || isSubmitting}
              style={{ opacity: isSubmitting || selectedSubjectsForBulk.length === 0 ? 0.7 : 1 }}
            >
              {isSubmitting ? "Assigning..." : `Assign ${selectedSubjectsForBulk.length} Subject(s)`}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: "10px",
            width: "100%",
            padding: "10px",
            background: "#f0f0f0",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            color: "#333",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
});