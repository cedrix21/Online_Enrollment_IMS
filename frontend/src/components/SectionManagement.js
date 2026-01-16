import { useEffect, useState } from "react";
import API from "../api/axios";
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
  const [teachers, setTeachers] = useState([]); // For the Advisor dropdown
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionStudents, setSectionStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [occupiedSchedules, setOccupiedSchedules] = useState([]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [subjects, setSubjects] = useState([]); // List of available subjects

  const [newSchedule, setNewSchedule] = useState({
    subject_id: "",
    day: "Monday",
    time_slot_id: "",
    room_id: "",
  });

  // Fetch subjects when the component loads
  const fetchSubjects = async () => {
    try {
      const res = await API.get("/subjects");
      console.log("Subjects from DB:", res.data);
      setSubjects(res.data);
    } catch (err) {
      console.error("Could not load subjects. Did you create the API route?");
      // Set to empty array so the .map() doesn't fail
      setSubjects([]);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      // We prepare the payload specifically with the new IDs
      const payload = {
        section_id: selectedSection.id,
        subject_id: newSchedule.subject_id,
        day: newSchedule.day,
        time_slot_id: newSchedule.time_slot_id, // New ID-based field
        room_id: newSchedule.room_id, // New ID-based field
      };

      const response = await API.post("/schedules", payload);
      alert("Schedule added successfully!");
      
      // 1. Refresh the specific section details to show the new subject in the list
      const res = await API.get(`/sections/${selectedSection.id}`);
      setSelectedSection(res.data);

      // 2. IMPORTANT: Refresh all occupied schedules
      // This ensures the next time you open the modal, the room you just took is disabled
      const schedRes = await API.get("/schedules");
      setOccupiedSchedules(schedRes.data);

      fetchData();

      // 3. Reset form and close
      setNewSchedule({
        subject_id: "",
        day: "",
        time_slot_id: "",
        room_id: "",
      });
      setShowScheduleModal(false);
    } catch (err) {
      console.error("Backend Error Details:", err.response?.data);
      // Display the specific conflict message from Laravel if it exists
      const msg =
        err.response?.data?.message ||
        "An error occurred while saving the schedule.";
      alert("Error: " + msg);
    }
  };

  const [newSection, setNewSection] = useState({
    name: "",
    gradeLevel: "",
    teacher_id: "",
    capacity: 40,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Added rooms, time-slots, and subjects to the parallel fetch
      const [secRes, teachRes, roomRes, slotRes, subRes, schedRes] =
        await Promise.all([
          API.get("/sections"),
          API.get("/teachers"),
          API.get("/rooms"), // New: Fetch predefined rooms
          API.get("/time-slots"), // New: Fetch predefined time slots
          API.get("/subjects"), // Needed for the subject dropdown filter
          API.get("/schedules"), // New: To check for room/time conflicts
        ]);

      setSections(secRes.data);
      setTeachers(teachRes.data);

      // Make sure you have these state setters defined at the top of your component!
      setRooms(roomRes.data);
      setTimeSlots(slotRes.data);
      setSubjects(subRes.data);
      setOccupiedSchedules(schedRes.data);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data", err);
      setLoading(false);
    }
  };

  const handleViewStudents = async (section) => {
    try {
      const res = await API.get(`/sections/${section.id}`);
      // This res.data now contains .students AND .schedules
      setSelectedSection(res.data);
      setSectionStudents(res.data.students || []);
      setShowStudentModal(true);
    } catch (err) {
      console.error("Error loading section details");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post("/sections", newSection);
      setShowModal(false);
      setNewSection({ name: "", gradeLevel: "", teacher_id: "", capacity: 40 });
      fetchData();
    } catch (err) {
      alert("Failed to create section. Ensure fields are correct.");
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this subject from the schedule?"
      )
    )
      return;

    try {
      await API.delete(`/schedules/${scheduleId}`);

      // Refresh the modal data so the deleted item disappears immediately
      const res = await API.get(`/sections/${selectedSection.id}`);
      setSelectedSection(res.data);

      alert("Schedule removed!");
      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete schedule.");
    }
  };

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

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

          {/*Section Card Mapping*/ }
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
                        width: `${
                          ((section.students_count || 0) / section.capacity) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>

                  {/* --- ADDED SCHEDULE LIST START --- */}
                  <hr className="my-2" />
                  <div className="section-schedules-preview">
                    <p className="text-sm font-bold mb-1">Schedule:</p>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        fontSize: "0.85rem",
                      }}
                    >
                      {section.schedules && section.schedules.length > 0 ? (
                        section.schedules.map((sched) => (
                          <li
                            key={sched.id}
                            style={{
                              marginBottom: "8px",
                              borderBottom: "1px solid #eee",
                              paddingBottom: "4px",
                            }}
                          >
                            <strong>{sched.subject?.subjectName}:</strong>
                            <br />
                            {sched.day} |{" "}
                            {sched.time_slot?.display_label || "No Time Set"}
                            <br />
                            <span className="text-muted">
                              Room: {sched.room?.room_name || "TBA"}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-muted italic">
                          No subjects added yet.
                        </li>
                      )}
                    </ul>
                  </div>
                  {/* --- ADDED SCHEDULE LIST END --- */}
                </div>

                <div className="section-card-actions">
                  <button
                    onClick={() => {
                      setSelectedSection(section);
                      fetchSubjects();
                      setShowScheduleModal(true);
                    }}
                  >
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


      {/* --- COMBINED STUDENT & SCHEDULE DASHBOARD MODAL --- */}
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
              {/* SCHEDULE SECTION */}
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
                            <td className="time-cell">
                              <td>{sched.time_slot?.display_label || "N/A"}</td>
                            </td>
                            <td>
                              <strong>{sched.subject?.subjectName}</strong>
                              <div className="sub-code">
                                {sched.subject?.subjectCode}
                              </div>

                              <div className="sched-teacher">
                                <FaUserTie
                                  style={{
                                    fontSize: "10px",
                                    marginRight: "5px",
                                  }}
                                />
                                {sched.teacher
                                  ? `${sched.teacher.firstName} ${sched.teacher.lastName}`
                                  : "No Teacher Assigned"}
                              </div>
                            </td>
                            <td>
                              <span className="day-badge">{sched.day}</span>
                            </td>
                            <td>{sched.room?.room_name || "TBA"}</td>

                            <td>
                              {/* Trash Icon Button */}
                              <button
                                className="delete-icon-btn"
                                onClick={() => handleDeleteSchedule(sched.id)}
                                title="Remove Schedule"
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

              <hr className="divider" />

              {/* --- STUDENTS SECTION --- */}
              <div className="students-section">
                <h4>
                  <FaUsers /> Enrolled Students ({sectionStudents.length})
                </h4>
                <div className="student-table-container">
                  {sectionStudents.length > 0 ? (
                    <table className="student-list-table">
                      <thead>
                        <tr>
                          <th>Student ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionStudents.map((student) => (
                          <tr key={student.id}>
                            <td>
                              <strong>{student.studentId}</strong>
                            </td>
                            <td>
                              {student.firstName} {student.lastName}
                            </td>
                            <td>{student.email}</td>
                            <td>
                              <span
                                className={`status-pill ${student.status.toLowerCase()}`}
                              >
                                {student.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <p>No students have been assigned to this section yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      

      {/* --- ADD SCHEDULE MODAL --- */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Subject to {selectedSection?.name}</h3>
              <FaTimes
                onClick={() => setShowScheduleModal(false)}
                className="close-icon"
              />
            </div>
            <form onSubmit={handleAddSchedule}>
              {/* 1. SUBJECT SELECTION (Filtered by Grade Level) */}
              <div className="input-group">
                <label>Select Subject</label>
                <select
                  required
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      subject_id: e.target.value,
                    })
                  }
                >
                  <option value="">-- Select Subject --</option>
                  {subjects
                    .filter(
                      (sub) => sub.gradeLevel === selectedSection.gradeLevel
                    )
                    .map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subjectName} ({sub.subjectCode})
                      </option>
                    ))}
                </select>
                {subjects.filter(
                  (sub) => sub.gradeLevel === selectedSection.gradeLevel
                ).length === 0 && (
                  <small className="text-danger">
                    No subjects found for {selectedSection.gradeLevel}
                  </small>
                )}
              </div>

              <div className="form-grid">
                {/* 2. DAY SELECTION */}
                <div className="input-group">
                  <label>Day</label>
                  <select
                    required
                    value={newSchedule.day}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, day: e.target.value })
                    }
                  >
                    <option value="">-- Select Day --</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>
                </div>

                {/* 3. TIME SLOT SELECTION (With Section & Teacher Conflict Detection) */}
                      <div className="input-group">
                        <label>Time Slot</label>
                        <select
                          required
                          value={newSchedule.time_slot_id}
                          disabled={!newSchedule.day || !newSchedule.subject_id}
                          onChange={(e) =>
                            setNewSchedule({
                              ...newSchedule,
                              time_slot_id: e.target.value,
                              room_id: "", // Reset room selection to re-trigger room conflict check
                            })
                          }
                        >
                          <option value="">-- Select Time --</option>
                          {timeSlots.map((slot) => {
                            // 1. Get the teacher ID for the currently selected subject
                            const selectedSub = subjects.find(s => s.id === parseInt(newSchedule.subject_id));
                            const teacherId = selectedSub?.teacher_id;

                            // 2. Check if the SECTION is already busy at this time
                            const isSectionBusy = occupiedSchedules.some(
                              (occ) =>
                                occ.day === newSchedule.day &&
                                Number(occ.time_slot_id) === Number(slot.id) &&
                                Number(occ.section_id) === Number(selectedSection.id)
                            );

                            // 3. Check if the TEACHER is already busy at this time
                            const isTeacherBusy = teacherId && occupiedSchedules.some(
                              (occ) =>
                                occ.day === newSchedule.day &&
                                Number(occ.time_slot_id) === Number(slot.id) &&
                                Number(occ.teacher_id) === Number(teacherId)
                            );

                            const isDisabled = isSectionBusy || isTeacherBusy;

                            return (
                              <option key={slot.id} value={slot.id} disabled={isDisabled}>
                                {slot.display_label} 
                                {isSectionBusy ? " (Section Busy)" : ""}
                                {isTeacherBusy ? " (Teacher Busy)" : ""}
                              </option>
                            );
                          })}
                        </select>
                        {!newSchedule.subject_id && (
                          <small style={{ color: 'orange' }}>Select a subject first to check teacher availability.</small>
                        )}
                      </div>


              {/* 4. ROOM SELECTION (With Conflict Detection) */}
              <div className="input-group">
                  <label>Room</label>
                  <select
                    required
                    value={newSchedule.room_id} // Added value for controlled component
                    disabled={!newSchedule.time_slot_id || !newSchedule.day}
                    onChange={(e) =>
                      setNewSchedule({ ...newSchedule, room_id: e.target.value })
                    }
                  >
                    <option value="">-- Select Room --</option>
                    {rooms.map((room) => {
                      // Logic for checking if the room is occupied
                      const isTaken = occupiedSchedules.some(
                        (occ) =>
                          occ.day === newSchedule.day &&
                          Number(occ.time_slot_id) === Number(newSchedule.time_slot_id) &&
                          Number(occ.room_id) === Number(room.id)
                      );

                      return (
                        <option key={room.id} value={room.id} disabled={isTaken}>
                          {room.room_name} {isTaken ? "⚠️ (Occupied)" : "✅ (Available)"}
                        </option>
                      );
                    })}
                  </select>
                  {!newSchedule.time_slot_id && (
                    <small className="text-muted" style={{ color: 'orange' }}>
                      Please select a Time Slot to see available rooms.
                    </small>
                  )}
                </div>

                <button type="submit" className="submit-btn" disabled={!newSchedule.room_id}>
                  Save Schedule
                </button>
            </form>
          </div>
        </div>
      )}
      {/* --- CREATE SECTION MODAL --- */}
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
                  placeholder="e.g. Diamond"
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
                    <option value="Kindergarten 1">Kindergarten 1</option>
                    <option value="Kindergarten 2">Kindergarten 2</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Max Capacity</label>
                  <input
                    type="number"
                    value={newSection.capacity}
                    onChange={(e) =>
                      setNewSection({ ...newSection, capacity: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Advisory Teacher</label>
                <select
                  value={newSection.teacher_id}
                  onChange={(e) =>
                    setNewSection({ ...newSection, teacher_id: e.target.value })
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
  );
}
