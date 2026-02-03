import { useEffect, useState } from "react";
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

export default function TeacherDirectory() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [teachers, setTeachers] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [teacherLoad, setTeacherLoad] = useState([]);
  const [expandedTeacher, setExpandedTeacher] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState(null);
  const [selectedTeacherForEdit, setSelectedTeacherForEdit] = useState(null);
  
  const [newTeacher, setNewTeacher] = useState({
    firstName: "",
    lastName: "",
    email: "",
    specialization: "",
    advisory_grade: "",
    phone: "",
    status: "active",
  });

  const [editTeacherForm, setEditTeacherForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    specialization: "",
    advisory_grade: "",
    phone: "",
    status: "active",
  });

  const [assignmentForm, setAssignmentForm] = useState({
    subject_id: "",
    gradeLevel: "",
    schedule: "",
  });

  const GRADE_LEVELS = [
    "Kindergarten 1",
    "Kindergarten 2",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
  ];

  useEffect(() => {
    fetchData();
  }, []);

  // ── FETCH ALL DATA ──
  const fetchData = async () => {
    try {
      const [teacherRes, subjectRes, loadRes] = await Promise.all([
        API.get("/teachers"),
        API.get("/subjects"),
        API.get("/teacher-load"),
      ]);

      setTeachers(teacherRes.data);
      setAvailableSubjects(subjectRes.data);
      setTeacherLoad(loadRes.data);
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  // ── HANDLERS ──
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await API.post("/teachers", newTeacher);
      
      // Optimistic update - add new teacher to state immediately
      setTeachers([...teachers, res.data.teacher]);
      
      setShowModal(false);
      setNewTeacher({
        firstName: "",
        lastName: "",
        email: "",
        specialization: "",
        advisory_grade: "",
        phone: "",
        status: "active",
      });
      alert("Teacher added successfully!");
    } catch (err) {
      console.error("Backend Error:", err.response?.data);
      alert(err.response?.data?.message || "Failed to add teacher");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignModal = async (teacher) => {
    setSelectedTeacherForAssign(teacher);
    setAssignmentForm({ subject_id: "", gradeLevel: "", schedule: "" });
    setShowAssignModal(true);
  };

  const handleAssignSubject = async (e) => {
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
      
      // Optimistic update - add assignment to teacher's list
      const updatedTeachers = teachers.map(teacher => {
        if (teacher.id === selectedTeacherForAssign.id) {
          return {
            ...teacher,
            assignments: [...(teacher.assignments || []), res.data.assignment]
          };
        }
        return teacher;
      });
      
      setTeachers(updatedTeachers);
      
      // Add to teacherLoad for conflict detection
      setTeacherLoad([...teacherLoad, res.data.assignment]);
      
      setShowAssignModal(false);
      alert("Subject assigned successfully!");
    } catch (err) {
      console.error("Assignment Error:", err.response?.data);
      alert(err.response?.data?.message || "Failed to assign subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm("Remove this subject assignment?")) return;

    try {
      await API.delete(`/subject-assignments/${assignmentId}`);
      
      // Optimistic update - remove assignment from teacher's list
      const updatedTeachers = teachers.map(teacher => {
        if (teacher.assignments) {
          return {
            ...teacher,
            assignments: teacher.assignments.filter(a => a.id !== assignmentId)
          };
        }
        return teacher;
      });
      
      setTeachers(updatedTeachers);
      
      // Remove from teacherLoad
      setTeacherLoad(teacherLoad.filter(a => a.id !== assignmentId));
      
      alert("Assignment removed successfully!");
    } catch (err) {
      console.error("Remove Error:", err.response?.data);
      alert("Failed to remove assignment");
    }
  };

  const handleSubjectChange = (subjectId) => {
    const selectedSub = availableSubjects.find((s) => s.id === parseInt(subjectId));

    if (selectedSub) {
      setAssignmentForm({
        ...assignmentForm,
        subject_id: subjectId,
        gradeLevel: selectedSub.gradeLevel,
      });
    } else {
      setAssignmentForm({
        ...assignmentForm,
        subject_id: subjectId,
        gradeLevel: "",
      });
    }
  };

  // ── EDIT TEACHER HANDLERS ──
  const openEditModal = (teacher) => {
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
  };

  const handleEditTeacher = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await API.put(
        `/teachers/${selectedTeacherForEdit.id}`,
        editTeacherForm
      );

      // Optimistic update - update teacher in state
      const updatedTeachers = teachers.map((teacher) => {
        if (teacher.id === selectedTeacherForEdit.id) {
          return {
            ...teacher,
            ...res.data.teacher,
          };
        }
        return teacher;
      });

      setTeachers(updatedTeachers);
      setShowEditModal(false);
      alert("Teacher updated successfully!");
    } catch (err) {
      console.error("Edit Error:", err.response?.data);
      alert(err.response?.data?.message || "Failed to update teacher");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── HELPER: Find assigned teacher for a subject ──
  const getAssignedTeacher = (subjectId) => {
    return teacherLoad.find((a) => Number(a.subject_id) === Number(subjectId));
  };

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

            <div className="teacher-grid">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="teacher-card">
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
                    {expandedTeacher === teacher.id && (
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
                            onClick={() => openAssignModal(teacher)}
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
                                  onClick={() => handleRemoveAssignment(assignment.id)}
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
                    <button className="edit-link" onClick={() => openEditModal(teacher)}>
                      <FaEdit /> Edit
                    </button>
                    <button
                      className="assign-link"
                      onClick={() =>
                        setExpandedTeacher(
                          expandedTeacher === teacher.id ? null : teacher.id
                        )
                      }
                    >
                      {expandedTeacher === teacher.id ? "Hide Load" : "View Load"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ADD TEACHER MODAL 
            ══════════════════════════════════════════════════════════════ */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Register New Faculty</h3>
                <FaTimes className="close-icon" onClick={() => setShowModal(false)} />
              </div>

              <form onSubmit={handleAddTeacher}>
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
                    {GRADE_LEVELS.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
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
        )}

        {/* ══════════════════════════════════════════════════════════════
            EDIT TEACHER MODAL 
            ══════════════════════════════════════════════════════════════ */}
        {showEditModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  <FaEdit /> Edit Teacher - {selectedTeacherForEdit?.firstName}{" "}
                  {selectedTeacherForEdit?.lastName}
                </h3>
                <FaTimes
                  className="close-icon"
                  onClick={() => setShowEditModal(false)}
                />
              </div>

              <form onSubmit={handleEditTeacher}>
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
                    {GRADE_LEVELS.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
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
        )}

        {/* ══════════════════════════════════════════════════════════════
            ASSIGN SUBJECT MODAL 
            ══════════════════════════════════════════════════════════════ */}
        {showAssignModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>
                  Assign Subject to {selectedTeacherForAssign?.firstName}{" "}
                  {selectedTeacherForAssign?.lastName}
                </h3>
                <FaTimes
                  className="close-icon"
                  onClick={() => setShowAssignModal(false)}
                />
              </div>

              <form onSubmit={handleAssignSubject}>
                <div className="form-group">
                  <label>Select Subject</label>
                  <select
                    value={assignmentForm.subject_id}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {availableSubjects.map((subject) => {
                      const assignedTeacher = getAssignedTeacher(subject.id);

                      return (
                        <option
                          key={subject.id}
                          value={subject.id}
                          disabled={!!assignedTeacher}
                        >
                          {subject.subjectCode} - {subject.subjectName} (
                          {subject.gradeLevel})
                          {assignedTeacher
                            ? ` — Assigned to ${assignedTeacher.teacher?.lastName}`
                            : ""}
                        </option>
                      );
                    })}
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

                <div className="form-group">
                  <label>Schedule (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., M-W-F 8:00-9:00 AM"
                    value={assignmentForm.schedule}
                    onChange={(e) =>
                      setAssignmentForm({ ...assignmentForm, schedule: e.target.value })
                    }
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
        )}
      </div>
    </div>
  );
}