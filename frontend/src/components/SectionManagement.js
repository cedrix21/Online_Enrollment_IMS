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
  const [newSchedule, setNewSchedule] = useState({
    subject_id: "",
    teacher_id: "",
    subject_assignment_id: "",
    day: "Monday",
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

  // ── HANDLERS ──
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        section_id: selectedSection.id,
        subject_id: newSchedule.subject_id,
        teacher_id: newSchedule.teacher_id,
        day: newSchedule.day,
        time_slot_id: newSchedule.time_slot_id,
        room_id: newSchedule.room_id,
      };

      const res = await API.post("/schedules", payload);
      
      // Optimistic update - add new schedule to local state
      const newScheduleData = res.data;
      
      setSelectedSection({
        ...selectedSection,
        schedules: [...(selectedSection.schedules || []), newScheduleData]
      });
      
      // Add to occupied schedules for conflict detection
      setOccupiedSchedules([...occupiedSchedules, newScheduleData]);
      
      alert("Schedule added successfully!");
      closeScheduleModal();
    } catch (err) {
      const msg = err.response?.data?.message || "Conflict or Error occurred.";
      alert("Error: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setNewSchedule({
      subject_id: "",
      teacher_id: "",
      subject_assignment_id: "",
      day: "Monday",
      time_slot_id: "",
      room_id: "",
    });
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
      // Fetch fresh data: teacher load, section details, and all schedules
      const [loadRes, sectionRes, schedRes] = await Promise.all([
        API.get("/teacher-load"),
        API.get(`/sections/${section.id}`),
        API.get("/schedules")
      ]);
      
      setTeacherLoad(loadRes.data);
      setSelectedSection(sectionRes.data); // Update with latest schedules
      setOccupiedSchedules(schedRes.data); // Update for conflict detection
      setShowScheduleModal(true);
    } catch (err) {
      console.error("Error loading data:", err);
      alert("Error loading teacher assignments.");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/sections", newSection);
      
      // Optimistic update - add new section to state immediately
      setSections([...sections, res.data]);
      
      setShowModal(false);
      setNewSection({ name: "", gradeLevel: "", teacher_id: "", capacity: 40 });
      alert("Section created successfully!");
    } catch (err) {
      console.error("Create error:", err);
      alert("Failed to create section.");
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Remove this subject from the schedule?")) return;
    
    try {
      await API.delete(`/schedules/${scheduleId}`);
      
      // Optimistic update - remove from local state
      const updatedSchedules = selectedSection.schedules.filter(s => s.id !== scheduleId);
      setSelectedSection({
        ...selectedSection,
        schedules: updatedSchedules
      });
      
      // Update occupied schedules
      setOccupiedSchedules(occupiedSchedules.filter(s => s.id !== scheduleId));
      
      alert("Schedule removed successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete schedule.");
    }
  };

  // ── HELPER: Check if subject is already scheduled ──
  const getScheduledTeacher = (subjectId) => {
    const scheduleRecord = selectedSection?.schedules?.find(
      (sched) => Number(sched.subject_id) === Number(subjectId)
    );

    if (scheduleRecord) {
      const teacherObj = teachers.find(
        (t) => Number(t.id) === Number(scheduleRecord.teacher_id)
      );
      return teacherObj ? teacherObj.lastName : "Assigned";
    }
    return null;
  };

  // ── HELPER: Check time slot availability ──
  const isTimeSlotAvailable = (slot) => {
    const isSectionBusy = occupiedSchedules.some(
      (occ) =>
        occ.day === newSchedule.day &&
        Number(occ.time_slot_id) === Number(slot.id) &&
        Number(occ.section_id) === Number(selectedSection.id)
    );

    const isTeacherBusy = occupiedSchedules.some(
      (occ) =>
        occ.day === newSchedule.day &&
        Number(occ.time_slot_id) === Number(slot.id) &&
        Number(occ.teacher_id) === Number(newSchedule.teacher_id)
    );

    return { isSectionBusy, isTeacherBusy };
  };

  // ── HELPER: Check room availability ──
  const isRoomTaken = (room) => {
    return occupiedSchedules.some(
      (occ) =>
        occ.day === newSchedule.day &&
        Number(occ.time_slot_id) === Number(newSchedule.time_slot_id) &&
        Number(occ.room_id) === Number(room.id)
    );
  };

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

        <div className="content-scroll-area" style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
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
                    <h3>{section.name}</h3>
                  </div>

                  <div className="section-card-body">
                    <div className="info-item">
                      <FaUserTie className="icon" />
                      <span>
                        Adviser: <strong>{section.advisor?.lastName || "Unassigned"}</strong>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            STUDENT DASHBOARD MODAL 
            ══════════════════════════════════════════════════════════════ */}
        {showStudentModal && (
          <div className="modal-overlay">
            <div className="modal-content student-list-modal">
              <div className="modal-header">
                <div>
                  <h3>{selectedSection?.name} - Dashboard</h3>
                  <p>
                    {selectedSection?.gradeLevel} | {sectionStudents.length} Students
                  </p>
                </div>
                <FaTimes onClick={() => setShowStudentModal(false)} className="close-icon" />
              </div>

              <div className="modal-body-tabs">
                {/* Tab Navigation */}
                <div className="tab-navigation">
                  <button 
                    className="tab-btn active"
                    onClick={(e) => {
                      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                      e.target.classList.add('active');
                      document.getElementById('schedule-tab').style.display = 'block';
                    }}
                  >
                    📅 Schedule
                  </button>
                  <button 
                    className="tab-btn"
                    onClick={(e) => {
                      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                      e.target.classList.add('active');
                      document.getElementById('students-tab').style.display = 'block';
                    }}
                  >
                    👥 Students ({sectionStudents.length})
                  </button>
                </div>

                {/* Schedule Tab */}
                <div id="schedule-tab" className="tab-content" style={{ display: 'block' }}>
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
                            {selectedSection.schedules.map((sched) => (
                              <tr key={sched.id}>
                                <td>{sched.time_slot?.display_label || "N/A"}</td>
                                <td>
                                  <strong>{sched.subject?.subjectName}</strong>
                                  <div className="sched-teacher">
                                    {sched.teacher
                                      ? `${sched.teacher.firstName} ${sched.teacher.lastName}`
                                      : "No Teacher"}
                                  </div>
                                </td>
                                <td>
                                  <span className="day-badge">{sched.day}</span>
                                </td>
                                <td>{sched.room?.room_name || "TBA"}</td>
                                <td>
                                  <button
                                    className="delete-icon-btn"
                                    onClick={() => handleDeleteSchedule(sched.id)}
                                  >
                                    <FaTimes style={{ color: "#e74c3c" }} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="no-data">No subjects scheduled yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Students Tab */}
                <div id="students-tab" className="tab-content" style={{ display: 'none' }}>
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
                                    <span className="middle-name"> {student.middleName[0]}.</span>
                                  )}
                                </td>
                                <td>{student.email || "N/A"}</td>
                                <td>
                                  <span className={`status-badge ${student.status}`}>
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
                        <FaUsers style={{ fontSize: '3rem', color: '#ddd', marginBottom: '10px' }} />
                        <p>No students enrolled in this section yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ADD SCHEDULE MODAL 
            ══════════════════════════════════════════════════════════════ */}
        {showScheduleModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Add Subject to {selectedSection?.name}</h3>
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
                      const load = teacherLoad.find((a) => a.id === parseInt(val));
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
                      .filter((a) => a.gradeLevel === selectedSection?.gradeLevel)
                      .map((a) => {
                        const assignedTeacher = getScheduledTeacher(a.subject_id);
                        return (
                          <option
                            key={a.id}
                            value={a.id}
                            disabled={!!assignedTeacher}
                          >
                            {a.subject?.subjectName} — {a.teacher?.lastName}
                            {assignedTeacher ? ` (Already assigned to ${assignedTeacher})` : ""}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="form-grid">
                  <div className="input-group">
                    <label>Day</label>
                    <select
                      required
                      value={newSchedule.day}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, day: e.target.value })
                      }
                    >
                      {DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

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
                      {timeSlots.map((slot) => {
                        const { isSectionBusy, isTeacherBusy } = isTimeSlotAvailable(slot);
                        return (
                          <option
                            key={slot.id}
                            value={slot.id}
                            disabled={isSectionBusy || isTeacherBusy}
                          >
                            {slot.display_label}
                            {isSectionBusy ? " (Sect. Busy)" : ""}
                            {isTeacherBusy ? " (Teach. Busy)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
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
                    {rooms.map((room) => {
                      const isTaken = isRoomTaken(room);
                      return (
                        <option key={room.id} value={room.id} disabled={isTaken}>
                          {room.room_name} {isTaken ? "⚠️" : "✅"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting || !newSchedule.room_id}
                  style={{
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? "Saving..." : "Save Schedule"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            CREATE SECTION MODAL 
            ══════════════════════════════════════════════════════════════ */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Create New Section</h3>
                <FaTimes onClick={() => setShowModal(false)} className="close-icon" />
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