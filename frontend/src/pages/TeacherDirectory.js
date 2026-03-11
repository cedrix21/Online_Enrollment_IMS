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
} from "react-icons/fa";
import "./TeacherDirectory.css";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS - Outside component (prevents recreation on every render)
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
// HELPER: Sort teachers by advisory grade (K1 → G6)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const sortTeachersByAdvisory = (teachers) => {
  const gradeOrder = GRADE_LEVELS.reduce((acc, grade, index) => {
    acc[grade] = index;
    return acc;
  }, {});

  return [...teachers].sort((a, b) => {
    const aGrade = a.advisory_grade;
    const bGrade = b.advisory_grade;
    
    // Both have advisory grades → sort by order defined in GRADE_LEVELS
    if (aGrade && bGrade) {
      return (gradeOrder[aGrade] ?? Infinity) - (gradeOrder[bGrade] ?? Infinity);
    }
    // Only a has advisory → a comes first
    if (aGrade && !bGrade) return -1;
    // Only b has advisory → b comes first
    if (!aGrade && bGrade) return 1;
    // Neither has advisory → sort by last name (or ID)
    return (a.lastName || '').localeCompare(b.lastName || '');
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMOIZED COMPONENTS - Prevent unnecessary re-renders
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

        {/* SUBJECT ASSIGNMENTS LIST */}
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERFORMANCE: Cache invalidation helper
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(`${CACHE_KEY}_time`);
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERFORMANCE: Cached data fetching (5 min cache)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const fetchData = useCallback(async (force = false) => {
    try {
      setLoading(true);

      // Check cache first (unless forced refresh)
      if (!force) {
        const cached = localStorage.getItem(CACHE_KEY);
        const cacheTime = localStorage.getItem(`${CACHE_KEY}_time`);
        
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < CACHE_DURATION) {
            const data = JSON.parse(cached);
            // Apply sorting to cached data as well
            setTeachers(sortTeachersByAdvisory(data.teachers));
            setAvailableSubjects(data.subjects);
            setTeacherLoad(data.load);
            setLoading(false);
            return; // ⚡ Use cached data - instant load!
          }
        }
      }

      // Fetch fresh data
      const [teacherRes, subjectRes, loadRes] = await Promise.all([
        API.get("/teachers"),
        API.get("/subjects"),
        API.get("/teacher-load"),
      ]);

      // Sort teachers by advisory grade
      const sortedTeachers = sortTeachersByAdvisory(teacherRes.data);

      const data = {
        teachers: sortedTeachers,
        subjects: subjectRes.data,
        load: loadRes.data,
      };

      // Cache the data
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERFORMANCE: Memoized Maps for O(1) lookups
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  // Map for advisory assignments (grade -> teacher)
  const advisoryMap = useMemo(() => {
    const map = new Map();
    teachers.forEach((t) => {
      if (t.advisory_grade) {
        map.set(t.advisory_grade, t);
      }
    });
    return map;
  }, [teachers]);

  // Set for faster lookup of assigned subject IDs
  const assignedSubjectIds = useMemo(() => {
    return new Set(teacherLoad.map(a => Number(a.subject_id)));
  }, [teacherLoad]);

  // Memoized available subjects (unassigned only)
  const availableSubjectsForAssignment = useMemo(() => {
    return availableSubjects.filter(
      (subject) => !assignedSubjectIds.has(subject.id)
    );
  }, [availableSubjects, assignedSubjectIds]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERFORMANCE: Memoized helper functions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const getTeacherWithAdvisory = useCallback((gradeLevel) => {
    return advisoryMap.get(gradeLevel);
  }, [advisoryMap]);

  const getAssignedTeacher = useCallback((subjectId) => {
    return teacherLoad.find((a) => Number(a.subject_id) === Number(subjectId));
  }, [teacherLoad]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PERFORMANCE: useCallback for all event handlers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleAddTeacher = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await API.post("/teachers", newTeacher);
      
      // Optimistic update – add new teacher and resort
      setTeachers(prev => sortTeachersByAdvisory([...prev, res.data.teacher]));
      
      // Invalidate cache
      invalidateCache();
      
      // Reset form
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
    setShowAssignModal(true);
  }, []);

  const handleAssignSubject = useCallback(async (e) => {
    e.preventDefault();
    
    if (!assignmentForm.subject_id || !assignmentForm.gradeLevel) {
      alert("Please select both subject and grade level");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await API.post(
        `/teachers/${selectedTeacherForAssign.id}/assign-subject`,
        assignmentForm
      );
      
      // Optimistic updates – update teacher's assignments (no need to resort as advisory unchanged)
      setTeachers(prev => prev.map(teacher => {
        if (teacher.id === selectedTeacherForAssign.id) {
          return {
            ...teacher,
            assignments: [...(teacher.assignments || []), res.data.assignment]
          };
        }
        return teacher;
      }));
      
      setTeacherLoad(prev => [...prev, res.data.assignment]);
      
      // Invalidate cache
      invalidateCache();
      
      setShowAssignModal(false);
      alert("Subject assigned successfully!");
    } catch (err) {
      console.error("Assignment Error:", err.response?.data);
      alert(err.response?.data?.message || "Failed to assign subject");
    } finally {
      setIsSubmitting(false);
    }
  }, [assignmentForm, selectedTeacherForAssign, invalidateCache]);

  const handleRemoveAssignment = useCallback(async (assignmentId) => {
    if (!window.confirm("Remove this subject assignment?")) return;

    try {
      await API.delete(`/subject-assignments/${assignmentId}`);
      
      // Optimistic updates – remove assignment from teacher (no need to resort)
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
      
      // Invalidate cache
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
      const res = await API.put(
        `/teachers/${selectedTeacherForEdit.id}`,
        editTeacherForm
      );

      // Optimistic update – update teacher and resort (advisory may have changed)
      setTeachers(prev => {
        const updated = prev.map((teacher) => 
          teacher.id === selectedTeacherForEdit.id 
            ? { ...teacher, ...res.data.teacher }
            : teacher
        );
        return sortTeachersByAdvisory(updated);
      });
      
      // Invalidate cache
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
              <button className="add-teacher-btn" onClick={() => setShowModal(true)}>
                <FaUserPlus /> Add Teacher
              </button>
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
                  <div style={{
                    fontSize: "3rem",
                    marginBottom: "20px",
                    color: "#b8860b"
                  }}>
                    ⏳
                  </div>
                  <h3 style={{ 
                    color: "#333", 
                    fontWeight: 600,
                    marginBottom: "10px"
                  }}>
                    Loading Faculty
                  </h3>
                  <p style={{ 
                    color: "#666", 
                    fontSize: "0.95rem" 
                  }}>
                    Fetching faculty directory...
                  </p>
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

        {/* MODALS - Only render when needed */}
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
            onClose={() => setShowAssignModal(false)}
            isSubmitting={isSubmitting}
            selectedTeacher={selectedTeacherForAssign}
            availableSubjects={availableSubjectsForAssignment}
          />
        )}
      </div>
    </div>
  );
}

// Separate modal components to reduce re-renders
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
  availableSubjects 
}) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <div className="modal-header">
        <h3>
          Assign Subject to {selectedTeacher?.firstName}{" "}
          {selectedTeacher?.lastName}
        </h3>
        <FaTimes className="close-icon" onClick={onClose} />
      </div>

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label>Select Subject</label>
          <select
            value={assignmentForm.subject_id}
            onChange={(e) => onSubjectChange(e.target.value)}
            required
          >
            <option value="">-- Choose Subject --</option>
            {availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.subjectCode} - {subject.subjectName} (
                {subject.gradeLevel})
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
            }}
          />
        </div>
        <button
          type="submit"
          className="submit-btn"
          disabled={!assignmentForm.subject_id || isSubmitting}
          style={{ opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? "Assigning..." : "Confirm Assignment"}
        </button>
      </form>
    </div>
  </div>
));