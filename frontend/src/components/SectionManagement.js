import { useEffect, useState, useCallback, useMemo, memo } from "react";
import API from "../api/api";
import {
  FaCalendarAlt,
  FaLayerGroup,
  FaPlus,
  FaUserTie,
  FaUsers,
  FaTimes,
  FaTrash,
  FaCheck,
  FaExchangeAlt,
} from "react-icons/fa";
import "./SectionManagement.css";
import { useCurrentSchoolYear } from "../hooks/useCurrentSchoolYear";

// ─────────────── CONSTANTS ───────────────
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
  start_time: "",    
  end_time: "",      
};
const INITIAL_SECTION_FORM = {
  name: "",
  gradeLevel: "",
  teacher_id: "",
  capacity: 40,
};

// ─── helpers ───
const sortSectionsByGrade = (sections) => {
  const gradeOrder = GRADE_LEVELS.reduce((acc, grade, index) => {
    acc[grade] = index;
    return acc;
  }, {});

  return [...sections].sort((a, b) => {
    const aGrade = a.gradeLevel;
    const bGrade = b.gradeLevel;

    if (aGrade && bGrade) {
      const aOrder = gradeOrder[aGrade] ?? Infinity;
      const bOrder = gradeOrder[bGrade] ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.name || "").localeCompare(b.name || "");
    }
    if (aGrade && !bGrade) return -1;
    if (!aGrade && bGrade) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });
};

const isMapehComponent = (subjectCode) => {
  if (!subjectCode) return false;
  const code = subjectCode.toUpperCase();
  return code.includes("MUSIC") || code.includes("ARTS") || code.includes("PE") || code.includes("HEALTH");
};

// ───────────────────────────────────────────────
// MEMOIZED SUB‑COMPONENTS
// ───────────────────────────────────────────────

const SectionCard = memo(
  ({ section, isSelected, onDelete, onClick }) => (
    <div
      id={`section-card-${section.id}`}
      className={`section-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="section-badge">{section.gradeLevel}</div>
      <div className="section-card-header">
        <h3>Section {section.name}</h3>
      </div>
      <div className="section-card-body">
        <div className="info-item">
          <FaUserTie className="icon" />
          <span>
            Adviser:{" "}
            <strong>{section.advisor?.lastName || "Unassigned"}</strong>
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(section);
          }}
          className="delete-section-btn"
          title="Delete Section"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  )
);

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
          key={
            group.isMapehGroup
              ? `mapeh-${group.time_slot_id}-${group.room_id}`
                  : `${group.subject_id}-${group.time_slot_id}`
              }
              group={group}
              onDelete={onDeleteSchedule}
            />
      ))}
    </tbody>
  </table>
));

const ScheduleRow = memo(({ group, onDelete }) => {
  const sortedDays = useMemo(
    () => [...group.days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)),
    [group.days]
  );

  return (
    <tr>
      <td>{group.time_slot?.display_label || "N/A"}</td>
      <td>
        {group.isMapehGroup ? (
          <>
            <strong>MAPEH</strong>
            {group.subjects.map((sub) => (
              <div key={sub.id} className="sched-mapeh-sub">
                {sub.subjectName}
              </div>
            ))}
            <div className="sched-teacher">
              {group.teacher
                ? `${group.teacher.firstName} ${group.teacher.lastName}`
                : "No Teacher"}
            </div>
          </>
        ) : (
          <>
            <strong>{group.subject?.subjectName}</strong>
            <div className="sched-teacher">
              {group.teacher
                ? `${group.teacher.firstName} ${group.teacher.lastName}`
                : "No Teacher"}
            </div>
          </>
        )}
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

const StudentTable = memo(({ students, onTransfer, showTransferButton }) => (
  <div className="students-grid">
    <table className="students-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Student ID</th>
          <th>Full Name</th>
          <th>Email</th>
          <th>Status</th>
          {showTransferButton && <th>Action</th>}
        </tr>
      </thead>
      <tbody>
        {students.map((student, index) => (
          <StudentRow
            key={student.id}
            student={student}
            index={index}
            showTransferButton={showTransferButton}
            onTransfer={onTransfer}
          />
        ))}
      </tbody>
    </table>
  </div>
));

const StudentRow = memo(({ student, index, showTransferButton, onTransfer }) => (
  <tr>
    <td>{index + 1}</td>
    <td>
      <span className="student-id-badge">{student.studentId || "N/A"}</span>
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
      <span className={`status-badge ${student.status}`}>{student.status}</span>
    </td>
    {showTransferButton && (
      <td>
        <button className="transfer-btn" onClick={() => onTransfer(student)}>
          Transfer
        </button>
      </td>
    )}
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
        style={{ color: "#e74c3c", fontSize: "0.85rem", margin: "4px 0" }}
      >
        <strong>⚠ {days.join(", ")}:</strong> {reason}
      </p>
    ))}
  </div>
));

// ───────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────

export default function SectionManagement() {
  const { schoolYear: currentSchoolYear, loading: yearLoading } =
    useCurrentSchoolYear();
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  // ── Data ──
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [occupiedSchedules, setOccupiedSchedules] = useState([]);
  const [teacherLoad, setTeacherLoad] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Master‑detail ──
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [detailMode, setDetailMode] = useState(null); // 'schedule' | 'students' | 'addSchedule'
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Forms / UI ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [newSchedule, setNewSchedule] = useState(INITIAL_SCHEDULE_FORM);
  const [newSection, setNewSection] = useState(INITIAL_SECTION_FORM);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ── Transfer sub‑modal ──
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // ── Derived ──
  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedSectionId) || null,
    [sections, selectedSectionId]
  );

  const sameGradeSections = useMemo(
    () =>
      (sections || []).filter(
        (s) =>
          s.gradeLevel === selectedSection?.gradeLevel &&
          s.id !== selectedSection?.id
      ),
    [sections, selectedSection]
  );

 const groupedSchedules = useMemo(() => {
  if (!selectedSection?.schedules) return [];

  // First pass: group by subject_id + time_slot + room (as before)
  const grouped = selectedSection.schedules.reduce((acc, cur) => {
    const key = `${cur.subject_id}-${cur.time_slot_id}-${cur.room_id}`;
    if (!acc[key]) {
      acc[key] = { ...cur, days: [cur.day], ids: [cur.id] };
    } else {
      acc[key].days.push(cur.day);
      acc[key].ids.push(cur.id);
    }
    return acc;
  }, {});

  // Second pass: merge MAPEH groups that share time_slot & room
  const mergedMapeh = {};
  const nonMapeh = [];

  Object.values(grouped).forEach((group) => {
    const isMapeh = group.subject?.subjectCode
      ? isMapehComponent(group.subject.subjectCode)
      : false;

    if (isMapeh) {
      const mergeKey = `${group.time_slot_id}-${group.room_id}`;
      if (!mergedMapeh[mergeKey]) {
        mergedMapeh[mergeKey] = {
          ...group,
          subjects: [group.subject],           // array of subject objects
          isMapehGroup: true,
        };
      } else {
        mergedMapeh[mergeKey].ids.push(...group.ids);
        mergedMapeh[mergeKey].subjects.push(group.subject);
        // Days should be identical, but deduplicate just in case
        mergedMapeh[mergeKey].days = [
          ...new Set([...mergedMapeh[mergeKey].days, ...group.days]),
        ];
      }
    } else {
      nonMapeh.push(group);
    }
  });

  return [...nonMapeh, ...Object.values(mergedMapeh)];
}, [selectedSection?.schedules]);

  const occupiedSchedulesMap = useMemo(() => {
    const map = new Map();
    occupiedSchedules.forEach((sched) => {
      const key = `${sched.day}-${sched.time_slot_id}-${sched.section_id}-${sched.teacher_id}-${sched.room_id}`;
      map.set(key, sched);
    });
    return map;
  }, [occupiedSchedules]);

  // ── School year initialisation ──
  useEffect(() => {
    if (currentSchoolYear && !selectedSchoolYear)
      setSelectedSchoolYear(currentSchoolYear);
  }, [currentSchoolYear, selectedSchoolYear]);

  // ── Main data fetch (cancellable) ──
  useEffect(() => {
    if (!selectedSchoolYear) return;
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [secRes, teachRes, roomRes, slotRes, schedRes] =
          await Promise.all([
            API.get("/sections", {
              params: { school_year: selectedSchoolYear },
            }),
            API.get("/teachers"),
            API.get("/rooms"),
            API.get("/time-slots"),
            API.get("/schedules", {
              params: { school_year: selectedSchoolYear },
            }),
          ]);

        if (!cancelled) {
          setSections(sortSectionsByGrade(secRes.data));
          setTeachers(teachRes.data);
          setRooms(roomRes.data);
          setTimeSlots(slotRes.data);
          setOccupiedSchedules(schedRes.data);
        }
      } catch (err) {
        if (!cancelled) console.error("Error fetching data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [selectedSchoolYear]);

  // ── Lazy detail fetch when detailMode activates ──
  useEffect(() => {
    if (!selectedSection || !detailMode) return;
    let cancelled = false;

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const [sectionRes, loadRes, schedRes] = await Promise.all([
          API.get(`/sections/${selectedSection.id}`, {
            params: { school_year: selectedSchoolYear },
          }),
          API.get("/teacher-load", {
            params: { school_year: selectedSchoolYear },
          }),
          API.get("/schedules", {
            params: { school_year: selectedSchoolYear },
          }),
        ]);

        if (!cancelled) {
          // update selected section with fresh data
          setSections((prev) =>
            prev.map((s) =>
              s.id === sectionRes.data.id ? sectionRes.data : s
            )
          );
          setTeacherLoad(loadRes.data);
          setOccupiedSchedules(schedRes.data);
        }
      } catch (err) {
        if (!cancelled)
          setErrorMessage("Failed to load section details.");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedSection?.id, detailMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Conflict calculator ──
  const getConflictMessages = useCallback(() => {
    if (
      !newSchedule.time_slot_id ||
      !newSchedule.teacher_id ||
      !newSchedule.room_id
    )
      return [];

    const dayConflicts = DAYS.map((day) => {
      const reasons = [];
      for (const sched of occupiedSchedulesMap.values()) {
        // section conflict
        if (
          !reasons.includes("Section is busy") &&
          sched.day === day &&
          Number(sched.time_slot_id) === Number(newSchedule.time_slot_id) &&
          Number(sched.section_id) === Number(selectedSection?.id)
        ) {
          reasons.push("Section is busy");
        }
        // teacher conflict
        if (
          !reasons.includes("Teacher is busy") &&
          sched.day === day &&
          Number(sched.time_slot_id) === Number(newSchedule.time_slot_id) &&
          Number(sched.teacher_id) === Number(newSchedule.teacher_id)
        ) {
          reasons.push("Teacher is busy");
        }
        // room conflict
        if (
          !reasons.includes("Room is occupied") &&
          sched.day === day &&
          Number(sched.time_slot_id) === Number(newSchedule.time_slot_id) &&
          Number(sched.room_id) === Number(newSchedule.room_id)
        ) {
          reasons.push("Room is occupied");
        }
        if (reasons.length === 3) break;
      }
      return { day, reasons };
    });

    const groups = dayConflicts.reduce((acc, item) => {
      if (item.reasons.length === 0) return acc;
      const key = item.reasons.join(" & ");
      if (!acc[key]) acc[key] = [];
      acc[key].push(item.day);
      return acc;
    }, {});

    return Object.entries(groups).map(([reason, days]) => ({
      reason,
      days,
    }));
  }, [newSchedule, occupiedSchedulesMap, selectedSection?.id]);

  const conflictMessages = useMemo(
    () => getConflictMessages(),
    [getConflictMessages]
  );

  const closeDetail = useCallback(() => {
    setSelectedSectionId(null);
    setDetailMode(null);
  }, []);

  // ── Handlers ──
  const openDetail = useCallback(
  (sectionId, mode) => {
     if (sectionId === selectedSectionId) {
      closeDetail();
      return;
    }

    setSelectedSectionId(sectionId);
    setDetailMode(mode);

    if (mode === "addSchedule") {
      setNewSchedule(INITIAL_SCHEDULE_FORM);
      setSelectedDays([]);
    }
  },
  [selectedSectionId, closeDetail]    
);

  

  const switchMode = (mode) => setDetailMode(mode);


  // ── Add Schedule ──
      const handleAddSchedule = useCallback(
  async (e) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      setErrorMessage("Please select at least one day.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    // ── Check if the new subject is MAPEH ──────────────────
    const selectedAssignment = teacherLoad.find(
      (a) => a.id === parseInt(newSchedule.subject_assignment_id)
    );
    const subjectIsMapeh = selectedAssignment?.subject?.subjectCode
      ? isMapehComponent(selectedAssignment.subject.subjectCode)
      : false;

    // ── Calculate true blocked days (ignoring MAPEH‑only conflicts) ──
    const blockedDays = selectedDays.filter((day) => {
      const hasConflict = getConflictMessages().some((msg) =>
        msg.days.includes(day)
      );
      if (!hasConflict) return false;

      if (subjectIsMapeh) {
        const conflictingSchedules = occupiedSchedules.filter(
          (s) =>
            s.day === day &&
            Number(s.time_slot_id) === Number(newSchedule.time_slot_id) &&
            (Number(s.room_id) === Number(newSchedule.room_id) ||
             Number(s.teacher_id) === Number(newSchedule.teacher_id) ||
             Number(s.section_id) === Number(selectedSection?.id))
        );

        const allMapehSameSection = conflictingSchedules.length > 0 &&
          conflictingSchedules.every(
            (s) =>
              isMapehComponent(s.subject?.subjectCode) &&
              s.section_id === selectedSection?.id
          );

        if (allMapehSameSection) return false;
      }
      return true;
    });

    if (blockedDays.length > 0) {
      setErrorMessage(
        `Conflicts on ${blockedDays.join(", ")}. Please choose different days or adjust time/room.`
      );
      setTimeout(() => setErrorMessage(""), 4000);
      return;
    }

    // ── single‑section guard ──────────────────
    const sectionsInThisGrade = sections.filter(
      (s) => s.gradeLevel === selectedSection.gradeLevel
    ).length;
    if (sectionsInThisGrade === 1) {
      const subjectAlreadyScheduled = occupiedSchedules.some(
        (s) =>
          s.section?.gradeLevel === selectedSection.gradeLevel &&
          Number(s.subject_id) === Number(newSchedule.subject_id)
      );
      if (subjectAlreadyScheduled) {
        setErrorMessage(
          "This subject is already scheduled in this grade level (only one section exists)."
        );
        setTimeout(() => setErrorMessage(""), 4000);
        return;
      }
    }

    // ── Resolve time slot from start / end times ──────────────
    const start = newSchedule.start_time;
    const end = newSchedule.end_time;

    if (!start || !end) {
      setErrorMessage("Please select both start and end time.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    // Try to find an existing exact match
    let timeSlot = timeSlots.find(
      (s) => s.start_time === start && s.end_time === end
    );

    if (!timeSlot) {
      try {
        // Create a new time slot (backend must support POST /time-slots)
        const slotRes = await API.post("/time-slots", {
          start_time: start,
          end_time: end,
        });
        timeSlot = slotRes.data;
        // Add it to the local list so later uses see it immediately
        setTimeSlots((prev) => [...prev, timeSlot]);
      } catch (err) {
        setErrorMessage(
          "Could not create a new time slot. Please choose an existing one."
        );
        setTimeout(() => setErrorMessage(""), 4000);
        return;
      }
    }

    const resolvedTimeSlotId = timeSlot.id;

    // Update newSchedule.time_slot_id so conflict calculator can still work
    setNewSchedule((prev) => ({ ...prev, time_slot_id: resolvedTimeSlotId }));

    setIsSubmitting(true);
    try {
      // 1. Schedule the primary subject (use resolvedTimeSlotId)
      await API.post("/schedules", {
        section_id: selectedSection.id,
        subject_id: newSchedule.subject_id,
        teacher_id: newSchedule.teacher_id,
        subject_assignment_id: newSchedule.subject_assignment_id,
        days: selectedDays,
        time_slot_id: resolvedTimeSlotId,
        room_id: newSchedule.room_id,
      });

      // 2. If MAPEH, auto‑schedule the remaining components
      let mapehCount = 1;
      if (selectedAssignment?.subject && isMapehComponent(selectedAssignment.subject.subjectCode)) {
        const alreadyScheduled = new Set(
          (selectedSection.schedules || []).map((s) => s.subject_id)
        );
        alreadyScheduled.add(newSchedule.subject_id);

        const remainingMapehAssignments = teacherLoad.filter(
          (a) =>
            a.gradeLevel === selectedSection.gradeLevel &&
            isMapehComponent(a.subject?.subjectCode) &&
            !alreadyScheduled.has(a.subject_id) &&
            a.teacher_id === newSchedule.teacher_id
        );

        if (remainingMapehAssignments.length > 0) {
          const mapehPromises = remainingMapehAssignments.map((a) =>
            API.post("/schedules", {
              section_id: selectedSection.id,
              subject_id: a.subject_id,
              teacher_id: a.teacher_id,
              subject_assignment_id: a.id,
              days: selectedDays,
              time_slot_id: resolvedTimeSlotId,
              room_id: newSchedule.room_id,
            })
          );
          await Promise.all(mapehPromises);
          mapehCount += remainingMapehAssignments.length;
        }
      }

      // 3. Refresh detail (NO CHANGES HERE – exactly as before)
      const [sectionRes, loadRes, schedRes] = await Promise.all([
        API.get(`/sections/${selectedSection.id}`, {
          params: { school_year: selectedSchoolYear },
        }),
        API.get("/teacher-load", {
          params: { school_year: selectedSchoolYear },
        }),
        API.get("/schedules", {
          params: { school_year: selectedSchoolYear },
        }),
      ]);

      setSections((prev) =>
        prev.map((s) => (s.id === sectionRes.data.id ? sectionRes.data : s))
      );
      setTeacherLoad(loadRes.data);
      setOccupiedSchedules(schedRes.data);

      setSuccessMessage(
        mapehCount > 1
          ? `All ${mapehCount} MAPEH subjects scheduled together!`
          : "Schedule added successfully!"
      );
      setTimeout(() => setSuccessMessage(""), 3000);
      setDetailMode("schedule");
    } catch (err) {
      const msg = err.response?.data?.message || "Conflict or Error occurred.";
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(""), 4000);
    } finally {
      setIsSubmitting(false);
    }
  },
  [
    selectedDays,
    selectedSection,
    newSchedule,
    selectedSchoolYear,
    getConflictMessages,
    sections,
    occupiedSchedules,
    teacherLoad,
    timeSlots,   // ⬅️ added: needed for time slot lookup
  ]
);
  // ── Delete Schedule ──
  const handleDeleteSchedule = useCallback(async (scheduleIds) => {
    const idsToDelete = Array.isArray(scheduleIds) ? scheduleIds : [scheduleIds];
    if (!window.confirm("Remove this subject for all selected days?")) return;

    try {
      await API.delete(`/schedules/${idsToDelete[0]}`, {
        data: { ids: idsToDelete },
      });
      // refresh schedules
      if (selectedSection) {
        const res = await API.get(`/sections/${selectedSection.id}`, {
          params: { school_year: selectedSchoolYear },
        });
        setSections((prev) =>
          prev.map((s) => (s.id === res.data.id ? res.data : s))
        );
      }
      setSuccessMessage("Schedule removed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setErrorMessage(
        "Failed to delete schedule: " +
          (err.response?.data?.message || "Server Error")
      );
      setTimeout(() => setErrorMessage(""), 4000);
    }
  }, [selectedSection, selectedSchoolYear]);

  // ── Delete Section ──
  const handleDeleteSection = useCallback(
    async (section) => {
      if (
        !window.confirm(
          `Delete section "${section.name}" for ${selectedSchoolYear}?`
        )
      )
        return;

      try {
        await API.delete(`/sections/${section.id}`, {
          params: { school_year: selectedSchoolYear },
        });
        setSections((prev) => prev.filter((s) => s.id !== section.id));
        if (section.id === selectedSectionId) closeDetail();
        setSuccessMessage(
          `Section "${section.name}" deleted for ${selectedSchoolYear} successfully!`
        );
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Failed to delete section.";
        setErrorMessage(errorMsg);
        setTimeout(() => setErrorMessage(""), 4000);
      }
    },
    [selectedSchoolYear, selectedSectionId, closeDetail]
  );

  // ── Create Section ──
  const handleCreateSection = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        const res = await API.post("/sections", {
          ...newSection,
          school_year: selectedSchoolYear,
        });
        setSections((prev) =>
          sortSectionsByGrade([...prev, res.data.section])
        );
        setShowCreateModal(false);
        setNewSection(INITIAL_SECTION_FORM);
        setSuccessMessage("Section created successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Failed to create section.";
        setErrorMessage(errorMsg);
        setTimeout(() => setErrorMessage(""), 4000);
      }
    },
    [newSection, selectedSchoolYear]
  );

  // ── Transfer student handlers ──
  const handleTransferClick = (student) => {
    setSelectedStudent(student);
    setTargetSectionId("");
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!targetSectionId) {
      setErrorMessage("Please select a target section.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }
    setTransferLoading(true);
    try {
      await API.put(`/students/${selectedStudent.id}/transfer`, {
        target_section_id: targetSectionId,
        school_year: selectedSchoolYear,
      });
      setSuccessMessage(
        `${selectedStudent.firstName} ${selectedStudent.lastName} transferred successfully!`
      );
      setTimeout(() => setSuccessMessage(""), 3000);
      setShowTransferModal(false);
      // refresh current section
      if (selectedSection) {
        const res = await API.get(`/sections/${selectedSection.id}`, {
          params: { school_year: selectedSchoolYear },
        });
        setSections((prev) =>
          prev.map((s) => (s.id === res.data.id ? res.data : s))
        );
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Transfer failed.");
      setTimeout(() => setErrorMessage(""), 4000);
    } finally {
      setTransferLoading(false);
    }
  };

  // ── Schedule form helpers ──
  const toggleDay = useCallback((day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }, []);

  const handleScheduleChange = useCallback(
    (type, value) => {
      if (type === "assignment") {
        const load = teacherLoad.find((a) => a.id === parseInt(value));
        if (load) {
          setNewSchedule({
            ...INITIAL_SCHEDULE_FORM,     // reset everything
            subject_id: load.subject_id,
            teacher_id: load.teacher_id,
            subject_assignment_id: value,
          });
        }
      } else if (type === "start_time") {
        setNewSchedule((prev) => ({
          ...prev,
          start_time: value,
          room_id: "",        // clear room when time changes
          time_slot_id: "",   // clear the old slot
        }));
      } else if (type === "end_time") {
        setNewSchedule((prev) => ({
          ...prev,
          end_time: value,
          room_id: "",
          time_slot_id: "",
        }));
      } else if (type === "room") {
        setNewSchedule((prev) => ({ ...prev, room_id: value }));
      }
    },
    [teacherLoad]
  );

  const handleSectionChange = useCallback((type, value) => {
    setNewSection((prev) => ({ ...prev, [type]: value }));
  }, []);

  // ── Teacher load filter for Add Schedule form ──
  const filteredTeacherLoad = useMemo(() => {
    if (!selectedSection || !teacherLoad.length) return [];
    // same logic as old ScheduleModal
    const assignmentsForGrade = teacherLoad.filter(
      (a) => a.gradeLevel === selectedSection.gradeLevel
    );
    const scheduledSubjectsInThisSection = new Set(
      (selectedSection.schedules || []).map((s) => s.subject_id)
    );
    const sectionsInThisGrade = sections.filter(
      (s) => s.gradeLevel === selectedSection.gradeLevel
    ).length;
    const isSingleSection = sectionsInThisGrade === 1;

    if (isSingleSection) {
      return assignmentsForGrade.filter(
        (a) => !scheduledSubjectsInThisSection.has(a.subject_id)
      );
    }
    // multiple sections: also exclude exact assignment already scheduled in this grade
    const scheduledAssignmentIds = new Set(
      occupiedSchedules
        .filter((s) => s.section?.gradeLevel === selectedSection.gradeLevel)
        .map((s) => s.subject_assignment_id)
    );
    return assignmentsForGrade
      .filter((a) => !scheduledSubjectsInThisSection.has(a.subject_id))
      .filter((a) => !scheduledAssignmentIds.has(a.id));
  }, [selectedSection, teacherLoad, sections, occupiedSchedules]);

  // Auto‑scroll selected section card into view
useEffect(() => {
  if (selectedSectionId) {
    const el = document.getElementById(`section-card-${selectedSectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}, [selectedSectionId]);

  // ── Render ──
  return (
    <div className="section-management-page">
      <div
        className="content-scroll-area"
        style={{ padding: "20px", overflowY: "auto", flex: 1 }}
      >
        {yearLoading || !selectedSchoolYear ? (
          <div className="loading-school-year">Loading school year...</div>
        ) : (
          <div className="management-container split-layout">
            {/* ── LEFT: Section Grid ── */}
            <div className="section-grid-panel">
              <div className="management-header">
                <div className="title-group">
                  <FaLayerGroup className="title-icon" />
                  <div>
                    <h2>Section Management</h2>
                    <p>
                      Organize classrooms, capacities, and advisory teachers.
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
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
                    {["2024-2025", "2025-2026", "2026-2027", "2027-2028"].map(
                      (y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      )
                    )}
                  </select>
                  <button
                    className="add-btn"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <FaPlus /> New Section
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="alert alert-error">{errorMessage}</div>
              )}
              {successMessage && (
                <div className="alert alert-success">{successMessage}</div>
              )}

              {loading ? (
                <div className="loading-placeholder">Loading sections...</div>
              ) : (
                <div className="section-grid">
                  {sections.map((section) => (
                    <SectionCard
                    key={section.id}
                    section={section}
                    isSelected={section.id === selectedSectionId}
                    onDelete={handleDeleteSection}
                    onClick={() => openDetail(section.id, "schedule")}
                  />
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT: Detail Panel ── */}
            {selectedSection && (
              <div className="detail-panel-wrapper">
                <div className="detail-actions">
                  <button
                    onClick={() => switchMode("schedule")}
                    className={
                      detailMode === "schedule" ? "active" : ""
                    }
                  >
                    📅 Schedule
                  </button>
                  <button
                    onClick={() => switchMode("students")}
                    className={
                      detailMode === "students" ? "active" : ""
                    }
                  >
                    👥 Students
                  </button>
                  <button
                    onClick={() => switchMode("addSchedule")}
                    className={
                      detailMode === "addSchedule" ? "active" : ""
                    }
                  >
                    ➕ Add Schedule
                  </button>
                  <button
                    className="close-detail-btn"
                    onClick={closeDetail}
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="detail-body">
                  {detailLoading ? (
                    <p style={{ textAlign: "center", padding: "20px" }}>
                      Loading...
                    </p>
                  ) : (
                    <>
                      {/* ── Schedule mode ── */}
                      {detailMode === "schedule" && (
                        <div>
                          <h4>
                            <FaCalendarAlt /> Weekly Class Schedule
                          </h4>
                          {selectedSection.schedules?.length > 0 ? (
                            <ScheduleTable
                              schedules={groupedSchedules}
                              onDeleteSchedule={handleDeleteSchedule}
                            />
                          ) : (
                            <p className="no-data">
                              No subjects scheduled yet.
                            </p>
                          )}
                        </div>
                      )}

                      {/* ── Students mode ── */}
                      {detailMode === "students" && (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "15px",
                            }}
                          >
                            <h4>
                              <FaUsers /> Enrolled Students (
                              {selectedSection.students_count || 0})
                            </h4>
                            {sameGradeSections.length > 0 }
                          </div>
                          {selectedSection.students?.length > 0 ? (
                            <StudentTable
                              students={selectedSection.students}
                              onTransfer={handleTransferClick}
                              showTransferButton={
                                sameGradeSections.length > 0
                              }
                            />
                          ) : (
                            <NoStudentsPlaceholder />
                          )}
                          {/* ── Transfer Sub‑modal ── */}
                          {showTransferModal && (
                            <div className="modal-overlay">
                              <div
                                className="modal-content"
                                style={{ maxWidth: "500px" }}
                              >
                                <div className="modal-header">
                                  <h3>Transfer Student</h3>
                                  <FaTimes
                                    className="close-icon"
                                    onClick={() =>
                                      setShowTransferModal(false)
                                    }
                                  />
                                </div>
                                <form onSubmit={handleTransferSubmit}>
                                  <p>
                                    Transfer{" "}
                                    <strong>
                                      {selectedStudent?.firstName}{" "}
                                      {selectedStudent?.lastName}
                                    </strong>{" "}
                                    from <strong>{selectedSection.name}</strong>{" "}
                                    to:
                                  </p>
                                  <div className="input-group">
                                    <label>
                                      Target Section (same grade level)
                                    </label>
                                    <select
                                      required
                                      value={targetSectionId}
                                      onChange={(e) =>
                                        setTargetSectionId(e.target.value)
                                      }
                                    >
                                      <option value="">
                                        -- Select Section --
                                      </option>
                                      {sameGradeSections.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name} ({s.students_count || 0}/
                                          {s.capacity})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div
                                    className="modal-actions"
                                    style={{ marginTop: "20px" }}
                                  >
                                    <button
                                      type="button"
                                      className="cancel-btn"
                                      onClick={() =>
                                        setShowTransferModal(false)
                                      }
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="submit-btn"
                                      disabled={transferLoading}
                                    >
                                      {transferLoading
                                        ? "Transferring..."
                                        : "Confirm Transfer"}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Add Schedule mode ── */}
                      {detailMode === "addSchedule" && (
                        <div>
                          <h4>Add Subject Schedule</h4>
                          <form onSubmit={handleAddSchedule}>
                            {/* Subject & Teacher select */}
                            <div className="input-group">
                              <label>Select Subject & Assigned Teacher</label>
                              <select
                                required
                                value={
                                  newSchedule.subject_assignment_id || ""
                                }
                                onChange={(e) =>
                                  handleScheduleChange(
                                    "assignment",
                                    e.target.value
                                  )
                                }
                                disabled={detailLoading}
                              >
                                <option value="">
                                  -- Select Teacher Load --
                                </option>
                                {filteredTeacherLoad.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.subject?.subjectName} —{" "}
                                    {a.teacher?.lastName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Day Selection */}
                            <div className="input-group">
                              <label>Select Days (Click to toggle)</label>
                              <div className="day-selector-grid">
                                {DAYS.map((day) => {
                                  const isSelected =
                                    selectedDays.includes(day);
                                  const hasConflict =
                                    conflictMessages.some((msg) =>
                                      msg.days.includes(day)
                                    );
                                  return (
                                    <DayButton
                                      key={day}
                                      day={day}
                                      isSelected={isSelected}
                                      hasConflict={hasConflict}
                                      onToggle={toggleDay}
                                    />
                                  );
                                })}
                              </div>
                              <ConflictMessages
                                messages={conflictMessages}
                              />
                              <p className="help-text">
                                Selected:{" "}
                                {selectedDays.length > 0
                                  ? selectedDays.join(", ")
                                  : "None"}
                              </p>
                            </div>

                            {/* Time selection – Start & End */}
                            <div className="form-grid">
                              <div className="input-group">
                                <label>Start Time</label>
                                <input
                                  type="time"
                                  value={newSchedule.start_time || ""}
                                  onChange={(e) =>
                                    handleScheduleChange("start_time", e.target.value)
                                  }
                                  step="300"   // 5‑minute steps
                                  disabled={!newSchedule.subject_id}
                                />
                              </div>
                              <div className="input-group">
                                <label>End Time</label>
                                <input
                                  type="time"
                                  value={newSchedule.end_time || ""}
                                  onChange={(e) =>
                                    handleScheduleChange("end_time", e.target.value)
                                  }
                                  step="300"
                                  disabled={!newSchedule.subject_id}
                                />
                              </div>
                            </div>

                            {/* Room – enabled only after both times are set */}
                            <div className="form-grid">
                              <div className="input-group">
                                <label>Room</label>
                                <select
                                  required
                                  value={newSchedule.room_id}
                                  disabled={
                                    !newSchedule.start_time ||
                                    !newSchedule.end_time
                                  }
                                  onChange={(e) =>
                                    handleScheduleChange("room", e.target.value)
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

                            {/* Actions */}
                            <div className="modal-actions">
                              <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => setDetailMode("schedule")}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="submit-btn"
                                disabled={
                                  isSubmitting ||
                                  selectedDays.length === 0
                                }
                                style={{
                                  opacity:
                                    isSubmitting ||
                                    selectedDays.length === 0
                                      ? 0.5
                                      : 1,
                                }}
                              >
                                {isSubmitting ? "Saving..." : "Save Schedule"}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Section Modal (kept as overlay) ── */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Section</h3>
              <FaTimes
                className="close-icon"
                onClick={() => setShowCreateModal(false)}
              />
            </div>
            <form onSubmit={handleCreateSection}>
              <div className="input-group">
                <label>Section Name</label>
                <input
                  required
                  value={newSection.name}
                  onChange={(e) =>
                    handleSectionChange("name", e.target.value)
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
                      handleSectionChange("gradeLevel", e.target.value)
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
                      handleSectionChange("capacity", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Advisory Teacher</label>
                <select
                  value={newSection.teacher_id}
                  onChange={(e) =>
                    handleSectionChange("teacher_id", e.target.value)
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