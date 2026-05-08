import { useEffect, useState, useCallback, useMemo, memo } from "react";
import API from "../api/api";
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
  FaCalendarAlt,
} from "react-icons/fa";
import "./TeacherDirectory.css";
import { useCurrentSchoolYear } from "../hooks/useCurrentSchoolYear";

// ─── CONSTANTS ─────────────────────────────────────────────
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

const CACHE_KEY = "teacher_directory_data";
const CACHE_DURATION = 5 * 60 * 1000;

const INITIAL_TEACHER_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  specialization: "",
  section_id: "",
  phone: "",
  status: "active",
};

const INITIAL_ASSIGNMENT_FORM = {
  subject_id: "",
  gradeLevel: "",
  schedule: "",
};

const sortTeachersByAdvisory = (teachers) => {
  const gradeOrder = GRADE_LEVELS.reduce((acc, grade, index) => {
    acc[grade] = index;
    return acc;
  }, {});
  return [...teachers].sort((a, b) => {
    const aGrade = a.advisory_section?.gradeLevel;
    const bGrade = b.advisory_section?.gradeLevel;
    if (aGrade && bGrade) {
      return (gradeOrder[aGrade] ?? Infinity) - (gradeOrder[bGrade] ?? Infinity);
    }
    if (aGrade && !bGrade) return -1;
    if (!aGrade && bGrade) return 1;
    return (a.lastName || "").localeCompare(b.lastName || "");
  });
};

// ── MEMOIZED TEACHER CARD ───────────────────────────────────
const TeacherCard = memo(({ teacher, isSelected, onClick }) => (
  <div
    id={`teacher-card-${teacher.id}`}  
    className={`teacher-card ${isSelected ? "selected" : ""}`}
    onClick={onClick}
  >
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
          {teacher.advisory_section
            ? `${teacher.advisory_section.name} (${teacher.advisory_section.gradeLevel})`
            : "None"}
        </span>
      </div>
      <p style={{ fontSize: "0.9rem", marginTop: "10px" }}>
        Specialization: <strong>{teacher.specialization}</strong>
      </p>
    </div>
  </div>
));

// ── MAIN COMPONENT ─────────────────────────────────────────
export default function TeacherDirectory() {
  const { schoolYear: currentSchoolYear, loading: yearLoading } = useCurrentSchoolYear();
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);

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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [detailMode, setDetailMode] = useState(null);
  const [scheduleData, setScheduleData] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTeacherForm, setEditTeacherForm] = useState(INITIAL_TEACHER_FORM);
  const [assignmentForm, setAssignmentForm] = useState(INITIAL_ASSIGNMENT_FORM);
  const [selectedSubjectsForBulk, setSelectedSubjectsForBulk] = useState([]);
  const [assignedSubjectIdsForTeacher, setAssignedSubjectIdsForTeacher] = useState(new Set());
  const [sections, setSections] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState(INITIAL_TEACHER_FORM);
  const [assignMode, setAssignMode] = useState("single");
  const [refreshingAssignSubjects, setRefreshingAssignSubjects] = useState(false);

  useEffect(() => {
  if (selectedTeacherId) {
    const el = document.getElementById(`teacher-card-${selectedTeacherId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}, [selectedTeacherId]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) || null,
    [teachers, selectedTeacherId]
  );

  const sectionsByGrade = useMemo(() => {
    const map = new Map();
    sections.forEach((section) => {
      const grade = section.gradeLevel;
      if (!map.has(grade)) map.set(grade, []);
      map.get(grade).push(section);
    });
    return map;
  }, [sections]);

  const availableSubjectsForAssignment = useMemo(() => {
    return availableSubjects.filter(
      (subject) => !assignedSubjectIdsForTeacher.has(subject.id)
    );
  }, [availableSubjects, assignedSubjectIdsForTeacher]);

  useEffect(() => {
    if (currentSchoolYear && !selectedSchoolYear) {
      setSelectedSchoolYear(currentSchoolYear);
    }
  }, [currentSchoolYear, selectedSchoolYear]);

  const invalidateCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(`${CACHE_KEY}_time`);
  }, []);

  const fetchData = useCallback(
    async (force = false, signal = { cancelled: false }) => {
      if (!selectedSchoolYear) return;
      try {
        if (!signal.cancelled) setLoading(true);
        if (!signal.cancelled) setTeacherLoad([]);

        if (!force) {
          const cached = localStorage.getItem(CACHE_KEY);
          const cacheTime = localStorage.getItem(`${CACHE_KEY}_time`);
          if (cached && cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age < CACHE_DURATION) {
              if (!signal.cancelled) {
                const data = JSON.parse(cached);
                setTeachers(sortTeachersByAdvisory(data.teachers));
                setAvailableSubjects(data.subjects);
                setTeacherLoad(data.load);
                setLoading(false);
              }
              return;
            }
          }
        }

        const [teacherRes, subjectRes, loadRes, sectionRes] = await Promise.all([
          API.get("/teachers", { params: { school_year: selectedSchoolYear } }),
          API.get("/subjects", { params: { school_year: selectedSchoolYear } }),
          API.get("/teacher-load", { params: { school_year: selectedSchoolYear } }),
          API.get("/sections", { params: { school_year: selectedSchoolYear } }),
        ]);

        if (signal.cancelled) return;

        const sortedTeachers = sortTeachersByAdvisory(teacherRes.data);
        const data = {
          teachers: sortedTeachers,
          subjects: subjectRes.data,
          load: loadRes.data,
          sections: sectionRes.data,
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());

        setTeachers(sortedTeachers);
        setAvailableSubjects(data.subjects);
        setTeacherLoad(data.load);
        setSections(sectionRes.data);
      } catch (err) {
        if (!signal.cancelled) console.error("Error fetching data", err);
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [selectedSchoolYear]
  );

  useEffect(() => {
    if (!selectedSchoolYear) return;
    const signal = { cancelled: false };
    invalidateCache();
    fetchData(true, signal);
    return () => { signal.cancelled = true; };
  }, [selectedSchoolYear, invalidateCache, fetchData]);

  useEffect(() => {
    if (detailMode !== "schedule" || !selectedTeacher) return;
    if (!selectedSchoolYear) return;
    let cancelled = false;
    setScheduleLoading(true);
    API.get(`/teachers/${selectedTeacher.id}/schedule`, {
      params: { school_year: selectedSchoolYear },
    })
      .then((res) => {
        if (!cancelled) setScheduleData(res.data);
      })
      .catch(() => {
        if (!cancelled) setErrorMessage("Could not load schedule.");
      })
      .finally(() => {
        if (!cancelled) setScheduleLoading(false);
      });
    return () => { cancelled = true; };
  }, [detailMode, selectedTeacher, selectedSchoolYear]);

  const openDetail = useCallback(
  (teacherId, mode) => {
    // If clicking the same teacher, close the panel (peekaboo)
    if (teacherId === selectedTeacherId) {
      closeDetail();
      return;
    }

    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;

    setSelectedTeacherId(teacherId);
    setDetailMode(mode);

    if (mode === "edit") {
      setEditTeacherForm({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        specialization: teacher.specialization,
        section_id: teacher.advisory_section?.id || "",
        phone: teacher.phone || "",
        status: teacher.status,
      });
    }

    if (mode === "assign") {
      const teacherAssignments = teacherLoad.filter(
        (a) => a.teacher_id === teacher.id
      );
      const ids = new Set(teacherAssignments.map((a) => Number(a.subject_id)));
      setAssignedSubjectIdsForTeacher(ids);
      setAssignmentForm(INITIAL_ASSIGNMENT_FORM);
      setSelectedSubjectsForBulk([]);
      setAssignMode("single");
    }
  },
  [teachers, teacherLoad, selectedTeacherId]
);

  const closeDetail = () => {
    setSelectedTeacherId(null);
    setDetailMode(null);
  };

  const handleEditSave = useCallback(
    async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const payload = { ...editTeacherForm, school_year: selectedSchoolYear };
        const updateRes = await API.put(`/teachers/${selectedTeacher.id}`, payload);
        const updatedTeacher = updateRes.data.teacher;   // the backend returns the full teacher object with advisory_section

        // Immediately update the teacher in the local list
        setTeachers(prev =>
          sortTeachersByAdvisory(
            prev.map(t => (t.id === selectedTeacher.id ? updatedTeacher : t))
          )
        );

        invalidateCache();
        fetchData(true);
        closeDetail();
        setSuccessMessage("✅ Teacher updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        setErrorMessage(err.response?.data?.message || "Failed to update teacher");
        setTimeout(() => setErrorMessage(""), 3000);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editTeacherForm, selectedTeacher, selectedSchoolYear, invalidateCache, fetchData]
  );

  const handleAssignSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const subjectsToAssign =
        selectedSubjectsForBulk.length > 0
          ? selectedSubjectsForBulk
          : assignmentForm.subject_id
          ? [assignmentForm.subject_id]
          : [];

      if (subjectsToAssign.length === 0) {
        setErrorMessage("Please select at least one subject");
        setTimeout(() => setErrorMessage(""), 3000);
        return;
      }

      setIsSubmitting(true);
      try {
        const promises = subjectsToAssign.map((subjectId) => {
          const subject = availableSubjects.find((s) => s.id === parseInt(subjectId));
          return API.post(`/teachers/${selectedTeacher.id}/assign-subject`, {
            subject_id: subjectId,
            gradeLevel: subject?.gradeLevel || "",
            schedule: "",
            school_year: selectedSchoolYear,
          });
        });

        const responses = await Promise.all(promises);

        // 1. Collection of the new assignment objects
        const newAssignments = responses.map((res) => ({
          ...res.data.assignment,
          teacher_id: Number(res.data.assignment.teacher_id)   // ← ensure it’s a number
        }));

        // 2. Update teacherLoad AND assignedSubjectIdsForTeacher in one pass
        setTeacherLoad((prev) => {
          const updatedLoad = [...prev, ...newAssignments];
         
          // Re‑calculate the set of assigned subject IDs for this teacher
          const teacherAssignments = updatedLoad.filter(
            (a) => a.teacher_id === selectedTeacher.id
          );
          const ids = new Set(teacherAssignments.map((a) => Number(a.subject_id)));
          setAssignedSubjectIdsForTeacher(ids);

          return updatedLoad;
        });

        invalidateCache();
        setAssignmentForm(INITIAL_ASSIGNMENT_FORM);
        setSelectedSubjectsForBulk([]);
        setSuccessMessage(`✅ ${subjectsToAssign.length} subject(s) assigned!`);
        setTimeout(() => setSuccessMessage(""), 3000);

        // 3. Switch to "Load" tab so the user sees the new assignment instantly
        setDetailMode("view");
        
      } catch (err) {
        setErrorMessage(err.response?.data?.message || "Failed to assign subjects");
        setTimeout(() => setErrorMessage(""), 3000);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      assignmentForm,
      selectedSubjectsForBulk,
      selectedTeacher,
      availableSubjects,
      selectedSchoolYear,
      invalidateCache,
    ]
  );

  const handleRemoveAssignment = useCallback(
    async (assignmentId) => {
      if (!window.confirm("Remove this subject assignment?")) return;
      try {
        await API.delete(`/teachers/subject-assignments/${assignmentId}`);
        setTeacherLoad((prev) => prev.filter((a) => a.id !== assignmentId));
        invalidateCache();
        setSuccessMessage("✅ Assignment removed successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        setErrorMessage("Failed to remove assignment");
        setTimeout(() => setErrorMessage(""), 3000);
      }
    },
    [invalidateCache]
  );

  const handleSubjectChange = useCallback(
    (subjectId) => {
      const selectedSub = availableSubjects.find((s) => s.id === parseInt(subjectId));
      setAssignmentForm((prev) => ({
        ...prev,
        subject_id: subjectId,
        gradeLevel: selectedSub?.gradeLevel || "",
      }));
    },
    [availableSubjects]
  );

  const refreshSubjects = useCallback(async () => {
    try {
      const [subjectRes, loadRes] = await Promise.all([
        API.get("/subjects", { params: { school_year: selectedSchoolYear } }),
        API.get("/teacher-load", { params: { school_year: selectedSchoolYear } }),
      ]);
      setAvailableSubjects(subjectRes.data);
      setTeacherLoad(loadRes.data);
    } catch (err) {
      console.error("Refresh failed", err);
    }
  }, [selectedSchoolYear]);

  const handleRefreshAssignSubjects = async () => {
    setRefreshingAssignSubjects(true);
    await refreshSubjects();
    setRefreshingAssignSubjects(false);
  };

  const toggleBulkSelect = (subjectId) => {
    setSelectedSubjectsForBulk((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSubjectsForBulk.length === availableSubjectsForAssignment.length) {
      setSelectedSubjectsForBulk([]);
    } else {
      setSelectedSubjectsForBulk(availableSubjectsForAssignment.map((s) => s.id));
    }
  };

  const handleAddTeacher = useCallback(
    async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const payload = { ...newTeacher, school_year: selectedSchoolYear };
        const res = await API.post("/teachers", payload);
        setTeachers((prev) => sortTeachersByAdvisory([...prev, res.data.teacher]));
        invalidateCache();
        setNewTeacher(INITIAL_TEACHER_FORM);
        setShowAddModal(false);
        setSuccessMessage("Teacher added successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        setErrorMessage(err.response?.data?.message || "Failed to add teacher");
        setTimeout(() => setErrorMessage(""), 3000);
      } finally {
        setIsSubmitting(false);
      }
    },
    [newTeacher, selectedSchoolYear, invalidateCache]
  );

  const formatTime12 = (time24) => {
    if (!time24) return "";
    const [hour, minute] = time24.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
  };

  const switchMode = useCallback((mode) => {
  if (!selectedTeacher) return;
  setDetailMode(mode);

  if (mode === "edit") {
    setEditTeacherForm({
      firstName: selectedTeacher.firstName,
      lastName: selectedTeacher.lastName,
      email: selectedTeacher.email,
      specialization: selectedTeacher.specialization,
      section_id: selectedTeacher.advisory_section?.id || "",
      phone: selectedTeacher.phone || "",
      status: selectedTeacher.status,
    });
  }

  if (mode === "assign") {
    const teacherAssignments = teacherLoad.filter(
      (a) => a.teacher_id === selectedTeacher.id
    );
    const ids = new Set(teacherAssignments.map((a) => Number(a.subject_id)));
    setAssignedSubjectIdsForTeacher(ids);
    setAssignmentForm(INITIAL_ASSIGNMENT_FORM);
    setSelectedSubjectsForBulk([]);
    setAssignMode("single");
  }
}, [selectedTeacher, teacherLoad]);

  return (
    <>
      <div className="content-scroll-area" style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
        {yearLoading || !selectedSchoolYear ? (
          <div className="loading-school-year">Loading school year...</div>
        ) : (
          <div className="directory-container split-layout">
            {/* ── LEFT: Teacher Grid ── */}
            <div className="teacher-grid-panel">
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
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <select
                    value={selectedSchoolYear}
                    onChange={(e) => setSelectedSchoolYear(e.target.value)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      border: "1px solid #b8860b",
                      background: "#fff",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    {["2024-2025", "2025-2026", "2026-2027", "2027-2028"].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button className="add-teacher-btn" onClick={() => setShowAddModal(true)}>
                    <FaUserPlus /> Add Teacher
                  </button>
                </div>
              </div>

              {errorMessage && <div className="alert alert-error">{errorMessage}</div>}
              {successMessage && <div className="alert alert-success">{successMessage}</div>}

              {loading ? (
                <div className="loading-placeholder">Loading faculty...</div>
              ) : (
                <div className="teacher-grid">
                  {teachers.map((teacher) => (
                    <TeacherCard
                      key={teacher.id}
                      teacher={teacher}
                      isSelected={teacher.id === selectedTeacherId}
                      onClick={() => openDetail(teacher.id, "view")}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT: Detail Panel ── */}
            {selectedTeacher && (
              <div className="detail-panel-wrapper">
                <div className="detail-actions">
                  <button onClick={() => switchMode("view")}>
                    <FaBookOpen /> Load
                  </button>
                  <button onClick={() => switchMode("schedule")}>
                    <FaCalendarAlt /> Schedule
                  </button>
                  <button onClick={() => switchMode("edit")}>
                    <FaEdit /> Edit
                  </button>
                  <button onClick={() => switchMode("assign")}>
                    <FaPlus /> Assign
                  </button>
                  <button className="close-detail-btn" onClick={closeDetail}>
                    <FaTimes />
                  </button>
                </div>

                <div className="detail-body">
                  {/* Mode: View Load */}
                  {detailMode === "view" && (
                    <div className="teacher-load-detail">
                      <h4>Assigned Subjects</h4>
                      {teacherLoad.filter((a) => a.teacher_id === selectedTeacher.id).length > 0 ? (
                        <ul className="assignment-list">
                          {teacherLoad
                            .filter((a) => a.teacher_id === selectedTeacher.id)
                            .map((assignment) => (
                              <li key={assignment.id} className="assignment-item">
                                <div className="assignment-info">
                                  <strong>{assignment.subject?.subjectCode}:</strong>{" "}
                                  {assignment.subject?.subjectName}
                                  <span className="grade-pill">{assignment.gradeLevel}</span>
                                  {assignment.schedule && (
                                    <div className="schedule-text">{assignment.schedule}</div>
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

                  {/* Mode: Schedule */}
                  {detailMode === "schedule" && (
                    <div className="schedule-section">
                      <h4><FaCalendarAlt /> Weekly Schedule</h4>
                      {scheduleLoading ? (
                        <p>Loading schedule…</p>
                      ) : scheduleData.length > 0 ? (
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
                              {[
                                ...new Set(
                                  scheduleData.map(
                                    (s) => `${s.time_slot.start_time}-${s.time_slot.end_time}`
                                  )
                                ),
                              ]
                                .sort()
                                .map((timeSlot) => {
                                  const [start24, end24] = timeSlot.split("-");
                                  return (
                                    <tr key={timeSlot}>
                                      <td className="schedule-time">
                                        {formatTime12(start24)} – {formatTime12(end24)}
                                      </td>
                                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                                        (day) => {
                                          const schedule = scheduleData.find(
                                            (s) =>
                                              s.day === day &&
                                              `${s.time_slot.start_time}-${s.time_slot.end_time}` === timeSlot
                                          );
                                          return (
                                            <td key={day}>
                                              {schedule ? (
                                                <div className="schedule-subject">
                                                  <strong>{schedule.subject?.subjectCode}</strong>
                                                  <div className="schedule-subject-name">
                                                    {schedule.subject?.subjectName}
                                                  </div>
                                                  <div className="schedule-grade">
                                                    {schedule.section?.name} ({schedule.section?.gradeLevel})
                                                  </div>
                                                  <div className="schedule-room">
                                                    Room: {schedule.room?.room_name || "?"}
                                                  </div>
                                                </div>
                                              ) : (
                                                <span className="schedule-empty">—</span>
                                              )}
                                            </td>
                                          );
                                        }
                                      )}
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p>No scheduled classes found.</p>
                      )}
                    </div>
                  )}

                  {/* Mode: Edit */}
                  {detailMode === "edit" && (
                  <div className="edit-form">
                    <h4>Edit Teacher Details</h4>
                    <form onSubmit={handleEditSave} className="teacher-edit-form">
                      <div className="form-group">
                        <label>First Name</label>
                        <input
                          type="text"
                          value={editTeacherForm.firstName}
                          onChange={(e) => setEditTeacherForm({ ...editTeacherForm, firstName: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Last Name</label>
                        <input
                          type="text"
                          value={editTeacherForm.lastName}
                          onChange={(e) => setEditTeacherForm({ ...editTeacherForm, lastName: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Email Address</label>
                        <input
                          type="email"
                          value={editTeacherForm.email}
                          onChange={(e) => setEditTeacherForm({ ...editTeacherForm, email: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Phone Number</label>
                        <input
                          type="text"
                          value={editTeacherForm.phone}
                          onChange={(e) => setEditTeacherForm({ ...editTeacherForm, phone: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Specialization</label>
                        <input
                          type="text"
                          value={editTeacherForm.specialization}
                          onChange={(e) => setEditTeacherForm({ ...editTeacherForm, specialization: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Advisory Section</label>
                        {/* <button
                          onClick={() => {
                            invalidateCache();
                            fetchData(true);
                            setSuccessMessage("Teacher list refreshed.");
                            setTimeout(() => setSuccessMessage(''), 3000);
                          }}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "6px",
                            border: "1px solid #b8860b",
                            background: "#fff",
                            fontSize: "0.9rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <FaSyncAlt /> Refresh
                        </button> */}
                        <select
                          value={editTeacherForm.section_id || ""}
                          onChange={(e) => setEditTeacherForm({ ...editTeacherForm, section_id: e.target.value })}
                        >
                          <option value="">No Advisory (N/A)</option>
                          {Array.from(sectionsByGrade.entries()).map(([grade, gradeSections]) => (
                            <optgroup key={grade} label={grade}>
                              {gradeSections.map((section) => (
                                <option key={section.id} value={section.id}>
                                  {section.name} — Adviser:{" "}
                                  {section.advisor
                                    ? `${section.advisor.firstName} ${section.advisor.lastName}`
                                    : "Unassigned"}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Status</label>
                        <select
                          value={editTeacherForm.status}
                          onChange={(e) => setEditTeacherForm({ ...editTeacherForm, status: e.target.value })}
                        >
                          <option value="active">Active</option>
                          <option value="on_leave">On Leave</option>
                          <option value="resigned">Resigned</option>
                        </select>
                      </div>

                      <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(
                                `Reset password for ${selectedTeacher.firstName} ${selectedTeacher.lastName} to default 'teacher123'?`
                              )) return;

                              try {
                                await API.post(`/teachers/${selectedTeacher.id}/reset-password`);
                                setSuccessMessage("Password reset to teacher123");
                                setTimeout(() => setSuccessMessage(""), 3000);
                              } catch (err) {
                                setErrorMessage("Failed to reset password");
                                setTimeout(() => setErrorMessage(""), 3000);
                              }
                            }}
                            style={{
                              backgroundColor: ' #e74c3c',
                              color: '#fff',
                              border: 'none',
                              padding: '10px 20px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              marginBottom: '12px',
                              width: '100%',
                              fontWeight: '600',
                            }}
                          >
                            Reset Password to Default
                          </button>

                      <button type="submit" className="submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? "Updating..." : "Save Changes"}
                      </button>
                    </form>
                  </div>
                )}

                  {/* Mode: Assign (fully built) */}
                  {detailMode === "assign" && (
                    <div className="assign-form">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <h4>Assign Subjects</h4>
                        <button
                          type="button"
                          onClick={handleRefreshAssignSubjects}
                          disabled={refreshingAssignSubjects}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}
                          title="Refresh subject list"
                        >
                          <FaSyncAlt className={refreshingAssignSubjects ? "spinning" : ""} />
                        </button>
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
                          onClick={() => { setAssignMode("single"); setSelectedSubjectsForBulk([]); }}
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

                      <form onSubmit={handleAssignSubmit}>
                        {assignMode === "single" ? (
                          <>
                            <div className="form-group">
                              <label>Select Subject</label>
                              <select
                                value={assignmentForm.subject_id}
                                onChange={(e) => handleSubjectChange(e.target.value)}
                                required
                                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "2px solid #e0d8b0" }}
                              >
                                <option value="">-- Choose Subject --</option>
                                {availableSubjectsForAssignment.map((subject) => (
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
                          </>
                        ) : (
                          <div style={{ marginBottom: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                              <h4 style={{ margin: 0 }}>Choose Subjects</h4>
                              <button
                                type="button"
                                onClick={toggleSelectAll}
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
                                {selectedSubjectsForBulk.length === availableSubjectsForAssignment.length ? "Deselect All" : "Select All"}
                              </button>
                            </div>

                            <div
                              style={{
                                maxHeight: "200px",
                                overflowY: "auto",
                                border: "2px solid #e0d8b0",
                                borderRadius: "6px",
                                padding: "10px",
                              }}
                            >
                              {availableSubjectsForAssignment.length > 0 ? (
                                availableSubjectsForAssignment.map((subject) => (
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
                                      onChange={() => toggleBulkSelect(subject.id)}
                                      style={{ marginRight: "12px", cursor: "pointer", width: "18px", height: "18px" }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <strong>{subject.subjectCode}</strong> - {subject.subjectName}
                                      <div style={{ fontSize: "0.85rem", color: "#666" }}>{subject.gradeLevel}</div>
                                    </div>
                                  </label>
                                ))
                              ) : (
                                <p style={{ textAlign: "center", color: "#999", margin: "20px 0" }}>
                                  No subjects available for assignment
                                </p>
                              )}
                            </div>
                            <div style={{ marginTop: "10px", padding: "10px", background: "#f0f0f0", borderRadius: "6px" }}>
                              <strong>{selectedSubjectsForBulk.length}</strong> subject(s) selected
                            </div>
                          </div>
                        )}

                        <button
                          type="submit"
                          className="submit-btn"
                          disabled={isSubmitting}
                          style={{ width: "100%", marginTop: "15px" }}
                        >
                          {isSubmitting ? "Assigning..." : "Assign Subject(s)"}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register New Faculty</h3>
              <FaTimes className="close-icon" onClick={() => setShowAddModal(false)} />
            </div>
            <form onSubmit={handleAddTeacher}>
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="First Name"
                  required
                  value={newTeacher.firstName}
                  onChange={(e) => setNewTeacher({ ...newTeacher, firstName: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  required
                  value={newTeacher.lastName}
                  onChange={(e) => setNewTeacher({ ...newTeacher, lastName: e.target.value })}
                />
              </div>
              <div className="form-grid">
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  required
                  value={newTeacher.phone}
                  onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                />
              </div>
              <input
                type="text"
                placeholder="Specialization (e.g., Mathematics)"
                required
                value={newTeacher.specialization}
                onChange={(e) => setNewTeacher({ ...newTeacher, specialization: e.target.value })}
              />
              <div className="form-grid">
                <select
                  value={newTeacher.section_id || ""}
                  onChange={(e) => setNewTeacher({ ...newTeacher, section_id: e.target.value })}
                >
                  <option value="">No Advisory (N/A)</option>
                  {Array.from(sectionsByGrade.entries()).map(([grade, gradeSections]) => (
                    <optgroup key={grade} label={grade}>
                      {gradeSections.map((section) => {
                        const currentAdviser = section.advisor
                          ? `${section.advisor.firstName} ${section.advisor.lastName}`
                          : "Unassigned";
                        return (
                          <option key={section.id} value={section.id}>
                            {section.name} — Adviser: {currentAdviser}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
                <select
                  value={newTeacher.status}
                  onChange={(e) => setNewTeacher({ ...newTeacher, status: e.target.value })}
                >
                  <option value="active">Status: Active</option>
                  <option value="on_leave">Status: On Leave</option>
                  <option value="resigned">Status: Resigned</option>
                </select>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? "Registering..." : "Register Teacher"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}