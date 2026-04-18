  import { useEffect, useState, useCallback, useMemo, memo } from "react";
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CONSTANTS - Outside component (prevents recreation on every render)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
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

  const INITIAL_SCHEDULE_FORM = {
    subject_id: "",
    teacher_id: "",
    subject_assignment_id: "",
    time_slot_id: "",
    room_id: "",
  };

  const INITIAL_SECTION_FORM = {
    name: "",
    gradeLevel: "",
    teacher_id: "",
    capacity: 40,
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER: Sort sections by grade level (K1 → G6)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const sortSectionsByGrade = (sections) => {
    const gradeOrder = GRADE_LEVELS.reduce((acc, grade, index) => {
      acc[grade] = index;
      return acc;
    }, {});

    return [...sections].sort((a, b) => {
      const aGrade = a.gradeLevel;
      const bGrade = b.gradeLevel;
      
      // Both have valid grades
      if (aGrade && bGrade) {
        const aOrder = gradeOrder[aGrade] ?? Infinity;
        const bOrder = gradeOrder[bGrade] ?? Infinity;
        if (aOrder !== bOrder) return aOrder - bOrder;
        // If same grade, sort by name
        return (a.name || '').localeCompare(b.name || '');
      }
      // One missing grade
      if (aGrade && !bGrade) return -1;
      if (!aGrade && bGrade) return 1;
      // Both missing grade, sort by name
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MEMOIZED COMPONENTS - Prevent unnecessary re-renders
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const SectionCard = memo(({ section, onSchedule, onViewStudents, onDelete }) => (
    <div className="section-card">
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
          />
        </div>
      </div>

      <div className="section-card-actions">
        <button onClick={() => onSchedule(section)}>Schedule</button>
        <button onClick={() => onViewStudents(section)}>Students</button>
        <button
          onClick={() => onDelete(section)}
          className="delete-section-btn"
          title="Delete Section"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  ));

  const StudentModal = memo(({ 
  section, 
  students, 
  schedules, 
  onClose, 
  onDeleteSchedule,
  groupedSchedules,
  loading    
}) => {
  const [activeTab, setActiveTab] = useState("schedule");

  return (
    <div className="modal-overlay">
      <div className="modal-content student-list-modal">
        <div className="modal-header">
          <div>
            <h3>{section?.name} - Dashboard</h3>
            <p>
              {section?.gradeLevel} | {loading ? '...' : `${students.length} Students`}
            </p>
          </div>
          <FaTimes onClick={onClose} className="close-icon" />
        </div>

        <div className="modal-body-tabs">
          <div className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === "schedule" ? "active" : ""}`}
              onClick={() => setActiveTab("schedule")}
            >
              📅 Schedule
            </button>
            <button
              className={`tab-btn ${activeTab === "students" ? "active" : ""}`}
              onClick={() => setActiveTab("students")}
            >
              👥 Students ({loading ? '...' : students.length})
            </button>
          </div>

          {activeTab === "schedule" && (
            <div id="schedule-tab" className="tab-content">
              <div className="schedule-section">
                <h4><FaCalendarAlt /> Weekly Class Schedule</h4>
                <div className="schedule-grid">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="skeleton-table-row" />
                    ))
                  ) : schedules?.length > 0 ? (
                    <ScheduleTable 
                      schedules={groupedSchedules} 
                      onDeleteSchedule={onDeleteSchedule}
                    />
                  ) : (
                    <p className="no-data">No subjects scheduled yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "students" && (
            <div id="students-tab" className="tab-content">
              <div className="students-section">
                <h4><FaUsers /> Enrolled Students</h4>
                {loading ? (
                  <div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="skeleton-table-row" />
                    ))}
                  </div>
                ) : students.length > 0 ? (
                  <StudentTable students={students} />
                ) : (
                  <NoStudentsPlaceholder />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

  const ScheduleTable = memo(({ schedules, onDeleteSchedule }) => (
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
        {schedules.map((group) => (
          <ScheduleRow 
            key={`${group.subject_id}-${group.time_slot_id}`}
            group={group}
            onDelete={onDeleteSchedule}
          />
        ))}
      </tbody>
    </table>
  ));

  const ScheduleRow = memo(({ group, onDelete }) => {
    const sortedDays = useMemo(() => 
      [...group.days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)),
      [group.days]
    );

    return (
      <tr>
        <td>{group.time_slot?.display_label || "N/A"}</td>
        <td>
          <strong>{group.subject?.subjectName}</strong>
          <div className="sched-teacher">
            {group.teacher
              ? `${group.teacher.firstName} ${group.teacher.lastName}`
              : "No Teacher"}
          </div>
        </td>
        <td>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {sortedDays.map((day) => (
              <span key={day} className="day-badge" style={{ fontSize: "0.75rem" }}>
                {day.substring(0, 3)}
              </span>
            ))}
          </div>
        </td>
        <td>{group.room?.room_name || "TBA"}</td>
        <td>
          <button
            className="delete-icon-btn"
            title="Delete all days for this subject"
            onClick={() => onDelete(group.ids)}
          >
            <FaTimes style={{ color: "#e74c3c" }} />
          </button>
        </td>
      </tr>
    );
  });

  const StudentTable = memo(({ students }) => (
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
          {students.map((student, index) => (
            <StudentRow key={student.id} student={student} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  ));

  const StudentRow = memo(({ student, index }) => (
    <tr>
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
  ));

  const NoStudentsPlaceholder = memo(() => (
    <div className="no-students-enrolled">
      <FaUsers style={{ fontSize: "3rem", color: "#ddd", marginBottom: "10px" }} />
      <p>No students enrolled in this section yet</p>
    </div>
  ));

  const DayButton = memo(({ day, isSelected, hasConflict, onToggle }) => (
    <button
      type="button"
      className={`day-btn ${isSelected ? "selected" : ""} ${hasConflict ? "conflict" : ""}`}
      onClick={() => onToggle(day)}
      
    >
      {isSelected && <FaCheck className="check-icon" />}
      <span>{day}</span>
    </button>
  ));

  const ConflictMessages = memo(({ messages }) => (
    <div className="conflict-details-container" style={{ marginTop: "10px" }}>
      {messages.map(({ reason, days }) => (
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
      ))}
    </div>
  ));

  const ScheduleModal = memo(({ 
  section,               // ✅ use section prop
  teacherLoad, 
  timeSlots, 
  rooms, 
  onSubmit, 
  onClose,
  isSubmitting,
  selectedDays,
  onToggleDay,
  newSchedule,
  onScheduleChange,
  conflictMessages,
  getScheduledTeacher,
  occupiedSchedules ,
   loading,  
}) => {
  
  const filteredTeacherLoad = useMemo(() => {
  // All assignments for this grade level
  const assignmentsForGrade = teacherLoad.filter(
    a => a.gradeLevel === section?.gradeLevel
  );

  // Get the set of subject_assignment_ids already scheduled in ANY section for this grade
  const scheduledAssignmentIds = new Set(
    occupiedSchedules
      .filter(sched => sched.section?.gradeLevel === section?.gradeLevel)
      .map(sched => sched.subject_assignment_id)
      .filter(Boolean)
  );

  // Keep only assignments that are NOT already scheduled somewhere
  return assignmentsForGrade.filter(
    a => !scheduledAssignmentIds.has(a.id)
  );
}, [teacherLoad, section?.gradeLevel, occupiedSchedules]);

  return (
    <div className="modal-overlay">
      <div className="modal-content schedule-modal-wide">
        <div className="modal-header">
          <h3>Add Subject Schedule to Section: {section?.name}</h3>
          <FaTimes onClick={onClose} className="close-icon" />
        </div>

        <form onSubmit={onSubmit}>
          <div className="input-group">
            <label>Select Subject & Assigned Teacher</label>
            <select
              required
              value={newSchedule.subject_assignment_id || ""}
              onChange={(e) => onScheduleChange('assignment', e.target.value)}
              disabled={loading}
            >
              <option value="">-- Select Teacher Load --</option>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <option key={i} disabled className="skeleton-option">
                    &nbsp;
                  </option>
                ))
              ) : (
                filteredTeacherLoad.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.subject?.subjectName} — {a.teacher?.lastName}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* ─── Day Selection (unchanged) ─── */}
          <div className="input-group">
            <label>Select Days (Click to toggle)</label>
            <div className="day-selector-grid">
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                const hasConflict = conflictMessages.some(msg => 
                  msg.days.includes(day)
                );
                 console.log(`Day ${day}: hasConflict=${hasConflict}`);

                return (
                  <DayButton
                    key={day}
                    day={day}
                    isSelected={isSelected}
                    hasConflict={hasConflict}
                    onToggle={onToggleDay}
                  />
                );
              })}
            </div>
            <ConflictMessages messages={conflictMessages} />
            <p className="help-text">
              Selected: {selectedDays.length > 0 ? selectedDays.join(", ") : "None"}
            </p>
          </div>

          {/* ─── Time Slot & Room (unchanged) ─── */}
          <div className="form-grid">
            <div className="input-group">
              <label>Time Slot</label>
              <select
                required
                value={newSchedule.time_slot_id}
                disabled={!newSchedule.subject_id}
                onChange={(e) => onScheduleChange('time_slot', e.target.value)}
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
                onChange={(e) => onScheduleChange('room', e.target.value)}
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
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || selectedDays.length === 0}
              style={{
                opacity: isSubmitting || selectedDays.length === 0 ? 0.5 : 1,
              }}
            >
              {isSubmitting ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
  const CreateSectionModal = memo(({ 
    newSection, 
    onSectionChange, 
    onSubmit, 
    onClose,
    teachers 
  }) => (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Section</h3>
          <FaTimes onClick={onClose} className="close-icon" />
        </div>

        <form onSubmit={onSubmit}>
          <div className="input-group">
            <label>Section Name</label>
            <input
              required
              value={newSection.name}
              onChange={(e) => onSectionChange('name', e.target.value)}
            />
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>Grade Level</label>
              <select
                required
                value={newSection.gradeLevel}
                onChange={(e) => onSectionChange('gradeLevel', e.target.value)}
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
                onChange={(e) => onSectionChange('capacity', e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Advisory Teacher</label>
            <select
              value={newSection.teacher_id}
              onChange={(e) => onSectionChange('teacher_id', e.target.value)}
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
  ));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MAIN COMPONENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  export default function SectionManagement() {
    const [user] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("user")) || null;
      } catch {
        return null;
      }
    });
    const [scheduleModalLoading, setScheduleModalLoading] = useState(false);
    const [studentModalLoading, setStudentModalLoading] = useState(false);
    
    // Data State
    const [sections, setSections] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [occupiedSchedules, setOccupiedSchedules] = useState([]);
    const [teacherLoad, setTeacherLoad] = useState([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedSection, setSelectedSection] = useState(null);
    const [sectionStudents, setSectionStudents] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDays, setSelectedDays] = useState([]);

    // Form State
    const [newSchedule, setNewSchedule] = useState(INITIAL_SCHEDULE_FORM);
    const [newSection, setNewSection] = useState(INITIAL_SECTION_FORM);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(() => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  });
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MEMOIZED VALUES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const groupedSchedules = useMemo(() => {
      if (!selectedSection?.schedules) return [];
      
      const grouped = selectedSection.schedules.reduce((acc, current) => {
        const key = `${current.subject_id}-${current.time_slot_id}-${current.room_id}`;
        
        if (!acc[key]) {
          acc[key] = {
            ...current,
            days: [current.day],
            ids: [current.id],
          };
        } else {
          acc[key].days.push(current.day);
          acc[key].ids.push(current.id);
        }
        return acc;
      }, {});
      
      return Object.values(grouped);
    }, [selectedSection?.schedules]);

    // ⚡ PERFORMANCE: Map-based schedule lookup for O(1) conflict detection
    const occupiedSchedulesMap = useMemo(() => {
      const map = new Map();
      occupiedSchedules.forEach(sched => {
        const key = `${sched.day}-${sched.time_slot_id}-${sched.section_id}-${sched.teacher_id}-${sched.room_id}`;
        map.set(key, sched);
      });
      return map;
    }, [occupiedSchedules]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EFFECTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    useEffect(() => {
      fetchData();
    }, []);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DATA FETCHING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [secRes, teachRes, roomRes, slotRes, schedRes] = await Promise.all([
        API.get("/sections", { params: { school_year: selectedSchoolYear } }),
        API.get("/teachers"),
        API.get("/rooms"),
        API.get("/time-slots"),
         API.get("/schedules", { params: { school_year: selectedSchoolYear } }),
      ]);

        // Sort sections by grade level
        const sortedSections = sortSectionsByGrade(secRes.data);
        setSections(sortedSections);
        setTeachers(teachRes.data);
        setRooms(roomRes.data);
        setTimeSlots(slotRes.data);
        setOccupiedSchedules(schedRes.data);
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    }, [selectedSchoolYear]);

    useEffect(() => {

    fetchData();
  }, [selectedSchoolYear]);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // HANDLERS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const getConflictMessages = useCallback(() => {
      if (!newSchedule.time_slot_id || !newSchedule.teacher_id || !newSchedule.room_id) {
        return [];
      }

      const dayConflicts = DAYS.map((day) => {
        
        const reasons = [];
        
        // ⚡ Use Map iteration for efficient checking (still O(n) per day but optimized with early returns)
        for (const sched of occupiedSchedulesMap.values()) {

          console.log(`Checking ${day} against existing: day=${sched.day}, time=${sched.time_slot_id}, teacher=${sched.teacher_id}, room=${sched.room_id}`);

          // Check section conflict
          if (
            !reasons.includes("Section is busy") &&
            sched.day === day &&
            Number(sched.time_slot_id) === Number(newSchedule.time_slot_id) &&
            Number(sched.section_id) === Number(selectedSection?.id)
          ) {
             console.warn(`⚠️ Teacher conflict on ${day}: teacher ${sched.teacher_id} already at time ${sched.time_slot_id}`);
            reasons.push("Section is busy");
          }

          // Check teacher conflict
          if (
            !reasons.includes("Teacher is busy") &&
            sched.day === day &&
            Number(sched.time_slot_id) === Number(newSchedule.time_slot_id) &&
            Number(sched.teacher_id) === Number(newSchedule.teacher_id)
          ) {
            reasons.push("Teacher is busy");
          }

          // Check room conflict
          if (
            !reasons.includes("Room is occupied") &&
            sched.day === day &&
            Number(sched.time_slot_id) === Number(newSchedule.time_slot_id) &&
            Number(sched.room_id) === Number(newSchedule.room_id)
          ) {
            reasons.push("Room is occupied");
          }

          // Early exit if all conflicts found
          if (reasons.length === 3) break;
        }

        return { day, reasons };
      });

      const groups = dayConflicts.reduce((acc, item) => {
        if (item.reasons.length === 0) return acc;

        const key = item.reasons.join(" & ");
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item.day);
        return acc;
      }, {});

      return Object.entries(groups).map(([reason, days]) => ({ reason, days }));
    }, [newSchedule, occupiedSchedulesMap, selectedSection?.id]);


   const handleAddSchedule = useCallback(async (e) => {
        e.preventDefault();

        if (selectedDays.length === 0) {
          alert("Please select at least one day for this schedule");
          return;
        }

        const currentConflicts = getConflictMessages();
        const conflictedSelectedDays = selectedDays.filter(day =>
          currentConflicts.some(msg => msg.days.includes(day))
        );

        if (conflictedSelectedDays.length > 0) {
          alert(`Cannot save schedule. The following day(s) have conflicts: ${conflictedSelectedDays.join(", ")}. Please choose different days or adjust the time/room.`);
          return;
        }

        setIsSubmitting(true);
        try {
          await API.post("/schedules", {
            section_id: selectedSection.id,
            subject_id: newSchedule.subject_id,
            teacher_id: newSchedule.teacher_id,
            subject_assignment_id: newSchedule.subject_assignment_id,
            days: selectedDays,
            time_slot_id: newSchedule.time_slot_id,
            room_id: newSchedule.room_id,
          });

          const [sectionRes, loadRes, schedRes] = await Promise.all([
            API.get(`/sections/${selectedSection.id}`, { params: { school_year: selectedSchoolYear } }),
            API.get("/teacher-load", { params: { school_year: selectedSchoolYear } }),
            API.get("/schedules", { params: { school_year: selectedSchoolYear } }),
          ]);

          setSelectedSection(sectionRes.data);
          setTeacherLoad(loadRes.data);
          setOccupiedSchedules(schedRes.data);

          alert(`Schedule added successfully!`);
          setNewSchedule(INITIAL_SCHEDULE_FORM);
          setSelectedDays([]);
        } catch (err) {
          const msg = err.response?.data?.message || "Conflict or Error occurred.";
          alert("Error: " + msg);
        } finally {
          setIsSubmitting(false);
        }
      }, [selectedDays, selectedSection, newSchedule, selectedSchoolYear, getConflictMessages]);



    const handleViewStudents = useCallback(async (section) => {
       setStudentModalLoading(true);  
    try {
      const res = await API.get(`/sections/${section.id}`, {
        params: { school_year: selectedSchoolYear }
      });
      setSelectedSection(res.data);
      setSectionStudents(res.data.students || []);
      
    } catch (err) {
      console.error("Error loading section details");
      alert("Failed to load section details");
    } finally {
    setStudentModalLoading(false);   // 🆕
    setShowStudentModal(true);
  }
}, [selectedSchoolYear]);

    const handleOpenScheduleModal = useCallback(async (section) => {
    setSelectedSection(section);
    setScheduleModalLoading(true);
    try {
      const [loadRes, sectionRes, schedRes] = await Promise.all([
      API.get("/teacher-load", { params: { school_year: selectedSchoolYear } }),
      API.get(`/sections/${section.id}`, { params: { school_year: selectedSchoolYear } }),
      API.get("/schedules", { params: { school_year: selectedSchoolYear } }),
    ]);

        setTeacherLoad(loadRes.data);
        setSelectedSection(sectionRes.data);
        setOccupiedSchedules(schedRes.data);
        
      } catch (err) {
        console.error("DETAILED ERROR:", err.response || err);
        alert(
          "Error loading data: " + (err.response?.data?.message || err.message),
          )} finally {
          setScheduleModalLoading(false);   // 🆕
          setShowScheduleModal(true);
        }
      }, [selectedSchoolYear]);

    const handleCreateSection = useCallback(async (e) => {
      e.preventDefault();
      try {
        const res = await API.post("/sections", newSection);
        // Sort sections after adding new one
        setSections(prev => sortSectionsByGrade([...prev, res.data.section]));
        setShowModal(false);
        setNewSection(INITIAL_SECTION_FORM);
        alert("Section created successfully!");
      } catch (err) {
        console.error("Create error:", err);
        const errorMsg = err.response?.data?.message || "Failed to create section.";
        alert(errorMsg);
      }
    }, [newSection]);

    const handleDeleteSection = useCallback(async (section) => {
      if (!window.confirm(`Are you sure you want to delete section "${section.name}"?`)) {
        return;
      }

      try {
        await API.delete(`/sections/${section.id}`);
        setSections(prev => prev.filter(s => s.id !== section.id));
        alert(`Section "${section.name}" deleted successfully!`);
      } catch (err) {
        console.error("Delete error:", err);
        const errorMsg = err.response?.data?.message || "Failed to delete section.";
        alert(errorMsg);
      }
    }, []);

    const handleDeleteSchedule = useCallback(async (scheduleIds) => {
      const idsToDelete = Array.isArray(scheduleIds) ? scheduleIds : [scheduleIds];

      if (!window.confirm(`Are you sure you want to remove this subject for all selected days?`))
        return;

      try {
        await API.delete(`/schedules/${idsToDelete[0]}`, {
          data: { ids: idsToDelete },
        });

        setSelectedSection(prev => ({
          ...prev,
          schedules: prev.schedules.filter(s => !idsToDelete.includes(s.id)),
        }));

        setOccupiedSchedules(prev => prev.filter(s => !idsToDelete.includes(s.id)));
        alert("Schedule removed successfully!");
      } catch (err) {
        console.error("Delete error:", err);
        alert("Failed to delete schedule: " + (err.response?.data?.message || "Server Error"));
      }
    }, []);

    const toggleDay = useCallback((day) => {
      setSelectedDays(prev => 
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
      );
    }, []);

    const handleScheduleChange = useCallback((type, value) => {
      if (type === 'assignment') {
        const load = teacherLoad.find(a => a.id === parseInt(value));
        if (load) {
          setNewSchedule({
            subject_id: load.subject_id,
            teacher_id: load.teacher_id,
            subject_assignment_id: value,
            time_slot_id: "",
            room_id: "",
          });
        }
      } else if (type === 'time_slot') {
        setNewSchedule(prev => ({
          ...prev,
          time_slot_id: value,
          room_id: "",
        }));
      } else if (type === 'room') {
        setNewSchedule(prev => ({
          ...prev,
          room_id: value,
        }));
      }
    }, [teacherLoad]);

    const handleSectionChange = useCallback((type, value) => {
      setNewSection(prev => ({
        ...prev,
        [type]: value,
      }));
    }, []);

    const closeScheduleModal = useCallback(() => {
      setShowScheduleModal(false);
      setSelectedDays([]);
      setNewSchedule(INITIAL_SCHEDULE_FORM);
    }, []);

    const getScheduledTeacher = useCallback((subjectId) => {
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
    }, [selectedSection?.schedules, teachers]);

    





    const conflictMessages = useMemo(() => getConflictMessages(), [getConflictMessages]);

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
                <button className="add-btn" onClick={() => setShowModal(true)}>
                  <FaPlus /> New Section
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
                      Loading Sections
                    </h3>
                    <p style={{ 
                      color: "#666", 
                      fontSize: "0.95rem" 
                    }}>
                      Fetching classroom data...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="section-grid">
                  {sections.map((section) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      onSchedule={handleOpenScheduleModal}
                      onViewStudents={handleViewStudents}
                      onDelete={handleDeleteSection}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modals */}
          {showStudentModal && (
            <StudentModal
              section={selectedSection}
              students={sectionStudents}
              schedules={selectedSection?.schedules}
              onClose={() => setShowStudentModal(false)}
              onDeleteSchedule={handleDeleteSchedule}
              groupedSchedules={groupedSchedules}
              loading={studentModalLoading} 
            />
          )}

          {showScheduleModal && (
            <ScheduleModal
              section={selectedSection}
              teacherLoad={teacherLoad}
              timeSlots={timeSlots}
              rooms={rooms}
              onSubmit={handleAddSchedule}
              onClose={closeScheduleModal}
              isSubmitting={isSubmitting}
              selectedDays={selectedDays}
              onToggleDay={toggleDay}
              newSchedule={newSchedule}
              onScheduleChange={handleScheduleChange}
              conflictMessages={conflictMessages}
              getScheduledTeacher={getScheduledTeacher}
              occupiedSchedules={occupiedSchedules}
              loading={scheduleModalLoading}
            />
          )}

          {showModal && (
            <CreateSectionModal
              newSection={newSection}
              onSectionChange={handleSectionChange}
              onSubmit={handleCreateSection}
              onClose={() => setShowModal(false)}
              teachers={teachers}
            />
          )}
        </div>
      </div>
    );
  }