import { useEffect, useState } from "react";
import API from "../api/api";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import {
  FaCalendarAlt,
  FaLayerGroup,
  FaPlus,
  FaUserTie,
  FaUsers,
  FaTimes,
  FaTrash,
  FaCheck,
} from "react-icons/fa";
import "./SectionManagement.css";

export default function SectionManagement() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [occupiedSchedules, setOccupiedSchedules] = useState([]);
  const [teacherLoad, setTeacherLoad] = useState([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Selected data
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionStudents, setSectionStudents] = useState([]);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]); // NEW: Array of selected days

  const [newSchedule, setNewSchedule] = useState({
    subject_id: "",
    teacher_id: "",
    subject_assignment_id: "",
    time_slot_id: "",
    room_id: "",
  });

  const [newSection, setNewSection] = useState({
    name: "",
    gradeLevel: "",
    teacher_id: "",
    capacity: 40,
  });

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
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
      const [secRes, teachRes, roomRes, slotRes, schedRes] = await Promise.all([
        API.get("/sections"),
        API.get("/teachers"),
        API.get("/rooms"),
        API.get("/time-slots"),
        API.get("/schedules"),
      ]);

      setSections(secRes.data);
      setTeachers(teachRes.data);
      setRooms(roomRes.data);
      setTimeSlots(slotRes.data);
      setOccupiedSchedules(schedRes.data);
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  // ── REFRESH SECTION DETAILS ──
  const refreshSectionDetails = async (sectionId) => {
    try {
      const [sectionRes, schedRes] = await Promise.all([
        API.get(`/sections/${sectionId}`),
        API.get("/schedules"),
      ]);
      setSelectedSection(sectionRes.data);
      setOccupiedSchedules(schedRes.data);
    } catch (err) {
      console.error("Error refreshing section", err);
    }
  };

  // ── TOGGLE DAY SELECTION ──
  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // ── HANDLERS ──
  const handleAddSchedule = async (e) => {
    e.preventDefault();

    if (selectedDays.length === 0) {
      alert("Please select at least one day for this schedule");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await API.post("/schedules", {
        section_id: selectedSection.id,
        subject_id: newSchedule.subject_id,
        teacher_id: newSchedule.teacher_id,
        days: selectedDays,
        time_slot_id: newSchedule.time_slot_id,
        room_id: newSchedule.room_id,
      });

      const newSchedules = response.data.data;

      // Update local state so the UI reflects the new schedules immediately
      setSelectedSection({
        ...selectedSection,
        schedules: [...(selectedSection.schedules || []), ...newSchedules],
      });

      setOccupiedSchedules([...occupiedSchedules, ...newSchedules]);

      alert(`Schedule added successfully!`);

      // FIX: Instead of closing the modal, just reset the form fields
      // so the user can add another schedule.
      resetScheduleForm();

      // closeScheduleModal(); // <--- REMOVE OR COMMENT THIS LINE
    } catch (err) {
      const msg = err.response?.data?.message || "Conflict or Error occurred.";
      alert("Error: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetScheduleForm = () => {
    // Reset only form fields, keep modal open
    setNewSchedule({
      subject_id: "",
      teacher_id: "",
      subject_assignment_id: "",
      time_slot_id: "",
      room_id: "",
    });
    setSelectedDays([]);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    resetScheduleForm();
  };

  const handleViewStudents = async (section) => {
    try {
      const res = await API.get(`/sections/${section.id}`);
      setSelectedSection(res.data);
      setSectionStudents(res.data.students || []);
      setShowStudentModal(true);
    } catch (err) {
      console.error("Error loading section details");
      alert("Failed to load section details");
    }
  };

  const handleOpenScheduleModal = async (section) => {
    setSelectedSection(section);
    try {
      const [loadRes, sectionRes, schedRes] = await Promise.all([
        API.get("/teacher-load"),
        API.get(`/sections/${section.id}`),
        API.get("/schedules"),
      ]);

      setTeacherLoad(loadRes.data);
      setSelectedSection(sectionRes.data);
      setOccupiedSchedules(schedRes.data);
      setShowScheduleModal(true);
    } catch (err) {
      console.error("DETAILED ERROR:", err.response || err);
      alert(
        "Error loading data: " + (err.response?.data?.message || err.message),
      );
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/sections", newSection);

      setSections([...sections, res.data.section]);

      setShowModal(false);
      setNewSection({ name: "", gradeLevel: "", teacher_id: "", capacity: 40 });
      alert("Section created successfully!");
    } catch (err) {
      console.error("Create error:", err);
      const errorMsg =
        err.response?.data?.message || "Failed to create section.";
      alert(errorMsg);
    }
  };

  const handleDeleteSection = async (section) => {
    if (
      !window.confirm(
        `Are you sure you want to delete section "${section.name}"?`,
      )
    ) {
      return;
    }

    try {
      await API.delete(`/sections/${section.id}`);
      setSections(sections.filter((s) => s.id !== section.id));
      alert(`Section "${section.name}" deleted successfully!`);
    } catch (err) {
      console.error("Delete error:", err);
      const errorMsg =
        err.response?.data?.message || "Failed to delete section.";
      alert(errorMsg);
    }
  };

  // ── UPDATED DELETE HANDLER ──
  const handleDeleteSchedule = async (scheduleIds) => {
    const idsToDelete = Array.isArray(scheduleIds)
      ? scheduleIds
      : [scheduleIds];

    if (
      !window.confirm(
        `Are you sure you want to remove this subject for all selected days?`,
      )
    )
      return;

    try {
      // We pass the IDs in the 'data' property for DELETE requests in Axios
      await API.delete(`/schedules/${idsToDelete[0]}`, {
        data: { ids: idsToDelete },
      });

      // Update UI state
      const updatedSchedules = selectedSection.schedules.filter(
        (s) => !idsToDelete.includes(s.id),
      );

      setSelectedSection({
        ...selectedSection,
        schedules: updatedSchedules,
      });

      setOccupiedSchedules(
        occupiedSchedules.filter((s) => !idsToDelete.includes(s.id)),
      );

      alert("Schedule removed successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert(
        "Failed to delete schedule: " +
          (err.response?.data?.message || "Server Error"),
      );
    }
  };
  // ── HELPER: Check if subject is already scheduled ──
  const getScheduledTeacher = (subjectId) => {
    const scheduleRecord = selectedSection?.schedules?.find(
      (sched) => Number(sched.subject_id) === Number(subjectId),
    );

    if (scheduleRecord) {
      const teacherObj = teachers.find(
        (t) => Number(t.id) === Number(scheduleRecord.teacher_id),
      );
      return teacherObj ? teacherObj.lastName : "Assigned";
    }
    return null;
  };

  // ── HELPER: Check time slot availability for a specific day ──
  const isTimeSlotAvailable = (slot, day) => {
    const isSectionBusy = occupiedSchedules.some(
      (occ) =>
        occ.day === day &&
        Number(occ.time_slot_id) === Number(slot.id) &&
        Number(occ.section_id) === Number(selectedSection.id),
    );

    const isTeacherBusy = occupiedSchedules.some(
      (occ) =>
        occ.day === day &&
        Number(occ.time_slot_id) === Number(slot.id) &&
        Number(occ.teacher_id) === Number(newSchedule.teacher_id),
    );

    return { isSectionBusy, isTeacherBusy };
  };

  // ── HELPER: Check room availability for a specific day ──
  const isRoomTaken = (room, day) => {
    return occupiedSchedules.some(
      (occ) =>
        occ.day === day &&
        Number(occ.time_slot_id) === Number(newSchedule.time_slot_id) &&
        Number(occ.room_id) === Number(room.id),
    );
  };

  
  const getGroupedConflictMessages = () => {
    if (!newSchedule.time_slot_id || !newSchedule.teacher_id || !newSchedule.room_id) {
    return {}; 
  }

    const dayConflicts = DAYS.map((day) => {
      if (
        !newSchedule.time_slot_id ||
        !newSchedule.teacher_id ||
        !newSchedule.room_id
      ) {
        return { day, reasons: [] };
      }

      const { isSectionBusy, isTeacherBusy } = isTimeSlotAvailable(
        { id: newSchedule.time_slot_id },
        day,
      );
      const roomBusy = isRoomTaken({ id: newSchedule.room_id }, day);

      const reasons = [];
      if (isSectionBusy) reasons.push("Section is busy");
      if (isTeacherBusy) reasons.push("Teacher is busy");
      if (roomBusy) reasons.push("Room is occupied");

      return { day, reasons };
    });

    // 2. Group days by their shared reasons
    const groups = dayConflicts.reduce((acc, item) => {
      if (item.reasons.length === 0) return acc;

      const key = item.reasons.join(" & ");
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item.day);
      return acc;
    }, {});

    return groups; // Returns something like: {"Teacher is busy": ["Monday", "Wednesday"]}
  };

  // Helper to group schedules by Subject + Time + Room
  const getGroupedSchedules = (schedules) => {
    if (!schedules) return [];

    const grouped = schedules.reduce((acc, current) => {
      // Create a unique key to identify "the same class"
      const key = `${current.subject_id}-${current.time_slot_id}-${current.room_id}`;

      if (!acc[key]) {
        // If this is the first time we see this class, create the entry
        acc[key] = {
          ...current,
          days: [current.day], // Start an array of days
          ids: [current.id], // Store all IDs so we can delete them later if needed
        };
      } else {
        // If it exists, just push the new day to the array
        acc[key].days.push(current.day);
        acc[key].ids.push(current.id);
      }
      return acc;
    }, {});

    return Object.values(grouped);
  };

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

        <div
          className="content-scroll-area"
          style={{ padding: "20px", overflowY: "auto", flex: 1 }}
        >
          <div className="management-container">
            <div className="management-header">
              <div className="title-group">
                <FaLayerGroup className="title-icon" />
                <div>
                  <h2>Section Management</h2>
                  <p>Organize classrooms, capacities, and advisory teachers.</p>
                </div>
              </div>
              <button className="add-btn" onClick={() => setShowModal(true)}>
                <FaPlus /> New Section
              </button>
            </div>

            <div className="section-grid">
              {sections.map((section) => (
                <div key={section.id} className="section-card">
                  <div className="section-badge">{section.gradeLevel}</div>
                  <div className="section-card-header">
                    <h3>Section {section.name}</h3>
                  </div>

                  <div className="section-card-body">
                    <div className="info-item">
                      <FaUserTie className="icon" />
                      <span>
                        Adviser:{" "}
                        <strong>
                          {section.advisor?.lastName || "Unassigned"}
                        </strong>
                      </span>
                    </div>
                    <div className="info-item">
                      <FaUsers className="icon" />
                      <span>
                        Students:{" "}
                        <strong>
                          {section.students_count || 0} / {section.capacity}
                        </strong>
                      </span>
                    </div>
                    <div className="capacity-bar">
                      <div
                        className="fill"
                        style={{
                          width: `${((section.students_count || 0) / section.capacity) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="section-card-actions">
                    <button onClick={() => handleOpenScheduleModal(section)}>
                      Schedule
                    </button>
                    <button onClick={() => handleViewStudents(section)}>
                      Students
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section)}
                      className="delete-section-btn"
                      title="Delete Section"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STUDENT DASHBOARD MODAL */}
        {showStudentModal && (
          <div className="modal-overlay">
            <div className="modal-content student-list-modal">
              <div className="modal-header">
                <div>
                  <h3>{selectedSection?.name} - Dashboard</h3>
                  <p>
                    {selectedSection?.gradeLevel} | {sectionStudents.length}{" "}
                    Students
                  </p>
                </div>
                <FaTimes
                  onClick={() => setShowStudentModal(false)}
                  className="close-icon"
                />
              </div>

              <div className="modal-body-tabs">
                <div className="tab-navigation">
                  <button
                    className="tab-btn active"
                    onClick={(e) => {
                      document
                        .querySelectorAll(".tab-btn")
                        .forEach((b) => b.classList.remove("active"));
                      document
                        .querySelectorAll(".tab-content")
                        .forEach((c) => (c.style.display = "none"));
                      e.target.classList.add("active");
                      document.getElementById("schedule-tab").style.display =
                        "block";
                    }}
                  >
                    📅 Schedule
                  </button>
                  <button
                    className="tab-btn"
                    onClick={(e) => {
                      document
                        .querySelectorAll(".tab-btn")
                        .forEach((b) => b.classList.remove("active"));
                      document
                        .querySelectorAll(".tab-content")
                        .forEach((c) => (c.style.display = "none"));
                      e.target.classList.add("active");
                      document.getElementById("students-tab").style.display =
                        "block";
                    }}
                  >
                    👥 Students ({sectionStudents.length})
                  </button>
                </div>

                <div
                  id="schedule-tab"
                  className="tab-content"
                  style={{ display: "block" }}
                >
                  <div className="schedule-section">
                    <h4>
                      <FaCalendarAlt /> Weekly Class Schedule
                    </h4>
                    <div className="schedule-grid">
                      {selectedSection?.schedules?.length > 0 ? (
                        <table className="schedule-table">
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Subject</th>
                              <th>Day</th>
                              <th>Room</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getGroupedSchedules(selectedSection.schedules).map(
                              (group) => (
                                <tr
                                  key={`${group.subject_id}-${group.time_slot_id}`}
                                >
                                  <td>
                                    {group.time_slot?.display_label || "N/A"}
                                  </td>
                                  <td>
                                    <strong>
                                      {group.subject?.subjectName}
                                    </strong>
                                    <div className="sched-teacher">
                                      {group.teacher
                                        ? `${group.teacher.firstName} ${group.teacher.lastName}`
                                        : "No Teacher"}
                                    </div>
                                  </td>
                                  <td>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "4px",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      {/* We sort days to ensure they appear in order (Mon, Tue, etc) */}
                                      {group.days
                                        .sort(
                                          (a, b) =>
                                            DAYS.indexOf(a) - DAYS.indexOf(b),
                                        )
                                        .map((day) => (
                                          <span
                                            key={day}
                                            className="day-badge"
                                            style={{ fontSize: "0.75rem" }}
                                          >
                                            {day.substring(0, 3)}{" "}
                                            {/* Show 'Mon' instead of 'Monday' to save space */}
                                          </span>
                                        ))}
                                    </div>
                                  </td>
                                  <td>{group.room?.room_name || "TBA"}</td>
                                  <td>
                                    <button
                                      className="delete-icon-btn"
                                      title="Delete all days for this subject"
                                      onClick={() =>
                                        handleDeleteSchedule(group.ids)
                                      } // Pass the whole array!
                                    >
                                      <FaTimes style={{ color: "#e74c3c" }} />
                                    </button>
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      ) : (
                        <p className="no-data">No subjects scheduled yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  id="students-tab"
                  className="tab-content"
                  style={{ display: "none" }}
                >
                  <div className="students-section">
                    <h4>
                      <FaUsers /> Enrolled Students
                    </h4>
                    {sectionStudents.length > 0 ? (
                      <div className="students-grid">
                        <table className="students-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Student ID</th>
                              <th>Full Name</th>
                              <th>Email</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sectionStudents.map((student, index) => (
                              <tr key={student.id}>
                                <td>{index + 1}</td>
                                <td>
                                  <span className="student-id-badge">
                                    {student.studentId || "N/A"}
                                  </span>
                                </td>
                                <td>
                                  <strong>
                                    {student.lastName}, {student.firstName}
                                  </strong>
                                  {student.middleName && (
                                    <span className="middle-name">
                                      {" "}
                                      {student.middleName[0]}.
                                    </span>
                                  )}
                                </td>
                                <td>{student.email || "N/A"}</td>
                                <td>
                                  <span
                                    className={`status-badge ${student.status}`}
                                  >
                                    {student.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="no-students-enrolled">
                        <FaUsers
                          style={{
                            fontSize: "3rem",
                            color: "#ddd",
                            marginBottom: "10px",
                          }}
                        />
                        <p>No students enrolled in this section yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD SCHEDULE MODAL */}
        {showScheduleModal && (
          <div className="modal-overlay">
            <div className="modal-content schedule-modal-wide">
              <div className="modal-header">
                <h3>
                  Add Subject Schedule to Section: {selectedSection?.name}
                </h3>
                <FaTimes onClick={closeScheduleModal} className="close-icon" />
              </div>

              <form onSubmit={handleAddSchedule}>
                <div className="input-group">
                  <label>Select Subject & Assigned Teacher</label>
                  <select
                    required
                    value={newSchedule.subject_assignment_id || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const load = teacherLoad.find(
                        (a) => a.id === parseInt(val),
                      );
                      if (load) {
                        setNewSchedule({
                          ...newSchedule,
                          subject_id: load.subject_id,
                          teacher_id: load.teacher_id,
                          subject_assignment_id: val,
                        });
                      }
                    }}
                  >
                    <option value="">-- Select Teacher Load --</option>
                    {teacherLoad
                      .filter(
                        (a) => a.gradeLevel === selectedSection?.gradeLevel,
                      )
                      .map((a) => {
                        const assignedTeacher = getScheduledTeacher(
                          a.subject_id,
                        );
                        return (
                          <option
                            key={a.id}
                            value={a.id}
                            disabled={!!assignedTeacher}
                          >
                            {a.subject?.subjectName} — {a.teacher?.lastName}
                            {assignedTeacher
                              ? ` (Already assigned to ${assignedTeacher})`
                              : ""}
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* MULTI-DAY SELECTOR */}
                <div className="input-group">
                  <label>Select Days (Click to toggle)</label>
                  <div className="day-selector-grid">
                    {DAYS.map((day) => {
                      const isSelected = selectedDays.includes(day);

                      const allConflicts = getGroupedConflictMessages();
                      const hasConflict = Object.values(allConflicts).some(daysArray => 
                        daysArray.includes(day)
                      );

                      return (
                        <button
                          key={day}
                          type="button"
                          className={`day-btn ${isSelected ? "selected" : ""} ${hasConflict ? "conflict" : ""}`}
                          onClick={() => toggleDay(day)}
                          disabled={hasConflict}
                        >
                          {isSelected && <FaCheck className="check-icon" />}
                          <span>{day}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className="conflict-details-container"
                    style={{ marginTop: "10px" }}
                  >
                    {Object.entries(getGroupedConflictMessages()).map(
                      ([reason, days]) => (
                        <p
                          key={reason}
                          style={{
                            color: "#e74c3c",
                            fontSize: "0.85rem",
                            margin: "4px 0",
                          }}
                        >
                          <strong>⚠ {days.join(", ")}:</strong> {reason}
                        </p>
                      ),
                    )}
                  </div>
                  <p className="help-text">
                    Selected:{" "}
                    {selectedDays.length > 0 ? selectedDays.join(", ") : "None"}
                  </p>
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label>Time Slot</label>
                    <select
                      required
                      value={newSchedule.time_slot_id}
                      disabled={!newSchedule.subject_id}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          time_slot_id: e.target.value,
                          room_id: "",
                        })
                      }
                    >
                      <option value="">-- Select Time --</option>
                      {timeSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.display_label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Room</label>
                    <select
                      required
                      value={newSchedule.room_id}
                      disabled={!newSchedule.time_slot_id}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          room_id: e.target.value,
                        })
                      }
                    >
                      <option value="">-- Select Room --</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.room_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={closeScheduleModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting || selectedDays.length === 0}
                    style={{
                      opacity:
                        isSubmitting || selectedDays.length === 0 ? 0.5 : 1,
                    }}
                  >
                    {isSubmitting ? "Saving..." : "Save Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE SECTION MODAL */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Create New Section</h3>
                <FaTimes
                  onClick={() => setShowModal(false)}
                  className="close-icon"
                />
              </div>

              <form onSubmit={handleCreate}>
                <div className="input-group">
                  <label>Section Name</label>
                  <input
                    required
                    value={newSection.name}
                    onChange={(e) =>
                      setNewSection({ ...newSection, name: e.target.value })
                    }
                  />
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label>Grade Level</label>
                    <select
                      required
                      value={newSection.gradeLevel}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          gradeLevel: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Grade</option>
                      {GRADE_LEVELS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Max Capacity</label>
                    <input
                      type="number"
                      value={newSection.capacity}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          capacity: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Advisory Teacher</label>
                  <select
                    value={newSection.teacher_id}
                    onChange={(e) =>
                      setNewSection({
                        ...newSection,
                        teacher_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Select an Adviser</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="submit-btn">
                  Create Section
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
