import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import API from "../api/api";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import { FaUserGraduate, FaSearch, FaPrint, FaFileInvoice, FaDownload } from 'react-icons/fa';
import './LoadSlip.css';
import html2pdf from 'html2pdf.js';
import SchoolLogo from "../assets/sics-logo.png";

// --- Skeleton Loader Component ---
const LoadSlipSkeleton = () => (
  <div className="management-container">
    <div className="management-header no-print">
      <div className="title-group">
        <div className="skeleton-icon" style={{ width: '40px', height: '40px', borderRadius: '8px' }}></div>
        <div>
          <div className="skeleton-text" style={{ width: '200px', height: '24px', marginBottom: '8px' }}></div>
          <div className="skeleton-text" style={{ width: '300px', height: '16px' }}></div>
        </div>
      </div>
    </div>

    <div className="search-section-wrapper no-print">
      <div className="search-input-group">
        <div className="skeleton-search" style={{ width: '100%', height: '45px', borderRadius: '8px' }}></div>
      </div>

      <div className="section-selection-grid">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="section-select-card skeleton-card" style={{ height: '80px' }}>
            <div className="skeleton-text" style={{ width: '60%', height: '20px', margin: '10px auto' }}></div>
            <div className="skeleton-text" style={{ width: '40%', height: '16px', margin: '0 auto' }}></div>
          </div>
        ))}
      </div>
    </div>

    <div className="empty-selection-msg no-print">
      <div className="skeleton-text" style={{ width: '250px', height: '20px', margin: '20px auto' }}></div>
    </div>

    <style jsx>{`
      .skeleton-card {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border: none;
        pointer-events: none;
      }
      .skeleton-text {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
      }
      .skeleton-search {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
      }
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

// --- Memoized Section Card ---
const SectionCard = memo(({ section, isSelected, onClick }) => (
  <div
    className={`section-select-card ${isSelected ? 'active' : ''}`}
    onClick={onClick}
  >
    <h4>{section.name}</h4>
    <span>{section.gradeLevel}</span>
  </div>
));

// --- Memoized Student Token ---
const StudentToken = memo(({ student, isSelected, onClick }) => (
  <button
    className={`student-token ${isSelected ? 'active' : ''}`}
    onClick={onClick}
  >
    {student.firstName} {student.lastName}
  </button>
));

// --- Main Component ---
export default function LoadSlip() {
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  
  const [sections, setSections] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");

  const printRef = useRef();
  const DAYS_ORDER = useMemo(() => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await API.get('/sections');
        setSections(res.data);
      } catch (err) {
        console.error("Error fetching sections", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Memoized filtered sections
  const filteredSections = useMemo(() => {
    return sections.filter(sec =>
      sec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.gradeLevel.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sections, searchQuery]);

  // Memoized filtered students for selected section
  const filteredStudents = useMemo(() => {
    if (!selectedSection?.students) return [];
    return selectedSection.students.filter(stu =>
      `${stu.firstName} ${stu.lastName}`.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [selectedSection, studentSearch]);

  // Group schedules
  const getGroupedSchedules = useCallback((schedules) => {
    if (!schedules || schedules.length === 0) return [];

    const grouped = schedules.reduce((acc, current) => {
      const key = `${current.subject_id}-${current.time_slot_id}-${current.room_id}`;
      if (!acc[key]) {
        acc[key] = {
          ...current,
          days: [current.day],
        };
      } else {
        acc[key].days.push(current.day);
      }
      return acc;
    }, {});

    return Object.values(grouped);
  }, []);

  // Format days
  const formatDays = useCallback((days) => {
    if (!days || days.length === 0) return 'TBA';
    const sortedDays = [...days].sort((a, b) => 
      DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b)
    );
    if (sortedDays.length <= 2) {
      return sortedDays.join(', ');
    } else {
      return sortedDays.map(day => day.substring(0, 3)).join(', ');
    }
  }, [DAYS_ORDER]);

  // Memoized grouped schedules for selected section
  const groupedSchedules = useMemo(() => {
    return selectedSection ? getGroupedSchedules(selectedSection.schedules) : [];
  }, [selectedSection, getGroupedSchedules]);

  const handlePrint = useCallback(() => window.print(), []);

  const downloadPDF = useCallback(() => {
    const element = printRef.current;
    const opt = {
      margin: 0.5,
      filename: `${selectedStudent.lastName}_${selectedStudent.firstName}_LoadSlip.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }, [selectedStudent]);

  const handleSectionClick = useCallback((section) => {
    setSelectedSection(section);
    setSelectedStudent(null);
    setStudentSearch("");
  }, []);

  const handleStudentClick = useCallback((student) => {
    setSelectedStudent(student);
  }, []);

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

        <div className="content-scroll-area" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <LoadSlipSkeleton />
          ) : (
            <div className="management-container">
              <div className="management-header no-print">
                <div className="title-group">
                  <FaFileInvoice className="title-icon" />
                  <div>
                    <h2>Individual Load Slips</h2>
                    <p>Select a section and then a student to generate a personal load slip.</p>
                  </div>
                </div>
                
                {selectedStudent && (
                  <div className="action-button-group" style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="add-btn" 
                      style={{ backgroundColor: '#007bff' }} 
                      onClick={downloadPDF}
                    >
                      <FaDownload /> Download PDF
                    </button>
                    <button 
                      className="add-btn" 
                      style={{ backgroundColor: '#28a745' }} 
                      onClick={handlePrint}
                    >
                      <FaPrint /> Print Student Slip
                    </button>
                  </div>
                )}
              </div>

              <div className="search-section-wrapper no-print">
                <div className="search-input-group">
                  <FaSearch className="search-icon-inner" />
                  <input
                    type="text"
                    placeholder="Search Section or Grade..."
                    className="loadslip-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Section Selection Grid */}
                <div className="section-selection-grid">
                  {filteredSections.map(sec => (
                    <SectionCard
                      key={sec.id}
                      section={sec}
                      isSelected={selectedSection?.id === sec.id}
                      onClick={() => handleSectionClick(sec)}
                    />
                  ))}
                </div>

                {/* Student Selection */}
                {selectedSection && (
                  <div className="student-selection-area mt-4 no-print">
                    <h4 className="mb-2">
                      <FaUserGraduate /> Select Student from {selectedSection.name}:
                    </h4>

                    <div className="student-search-wrapper mb-3">
                      <input
                        type="text"
                        placeholder="Filter students by name..."
                        className="student-filter-input"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </div>

                    <div className="student-token-grid">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map(stu => (
                          <StudentToken
                            key={stu.id}
                            student={stu}
                            isSelected={selectedStudent?.id === stu.id}
                            onClick={() => handleStudentClick(stu)}
                          />
                        ))
                      ) : (
                        <p className="text-muted">No students match your search.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Printable Document Area */}
              {selectedStudent ? (
                <div ref={printRef} className="printable-load-slip">
                  <div className="slip-watermark">
                    <img src={SchoolLogo} alt="Watermark" />
                  </div>

                  <div className="slip-header-container">     
                    <img src={SchoolLogo} alt="School Logo" className="slip-logo" />
                    
                    <div className="slip-header-text">
                      <h1>SILOAM INTERNATIONAL CHRISTIAN SCHOOL</h1>
                      <h3>Official Student Load Slip</h3>
                      <p>Academic Year 2025-2026</p>
                    </div>
                  </div>

                  <div className="slip-info-summary">
                    <div className="info-col">
                      <p><strong>Student Name:</strong> <span className="uppercase-name">{selectedStudent.lastName}, {selectedStudent.firstName}</span></p>
                      <p><strong>Student ID:</strong> {selectedStudent.studentId}</p>
                      <p><strong>Section:</strong> {selectedSection.name}</p>
                    </div>
                    <div className="info-col text-right">
                      <p><strong>Grade Level:</strong> {selectedSection.gradeLevel}</p>
                      <p><strong>Adviser:</strong> {selectedSection.advisor?.lastName || 'TBA'}</p>
                      <p><strong>Date Issued:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <table className="slip-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Days</th>
                        <th>Time</th>
                        <th>Room</th>
                        <th>Instructor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedSchedules.length > 0 ? (
                        groupedSchedules.map((group, index) => (
                          <tr key={index}>
                            <td><strong>{group.subject?.subjectName || 'N/A'}</strong></td>
                            <td>{formatDays(group.days)}</td>
                            <td>{group.time_slot?.display_label || 'TBA'}</td>
                            <td>{group.room?.room_name || 'TBA'}</td>
                            <td>{group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'TBA'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center' }}>
                            No schedules assigned to this section.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="slip-notes">
                    <p><strong>Note:</strong> This is an official document. Please keep it for your records. 
                    Any changes to the schedule will be announced by the school administration.</p>
                  </div>

                  <div className="slip-footer">
                    <div className="sig-box">
                      <div className="line"></div>
                      <p>School Registrar</p>
                    </div>
                    <div className="sig-box">
                      <div className="line"></div>
                      <p>Parent/Guardian Signature</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-selection-msg no-print">
                  <p>Please select a <strong>Section</strong> and then a <strong>Student</strong> to generate the slip.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}