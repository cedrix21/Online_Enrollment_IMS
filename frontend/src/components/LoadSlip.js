import React, { useState, useEffect, useRef } from 'react';
import API from "../api/api";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import { FaUserGraduate, FaSearch, FaPrint, FaFileInvoice, FaDownload } from 'react-icons/fa';
import './LoadSlip.css';
import html2pdf from 'html2pdf.js';
import SchoolLogo from "../assets/sics-logo.png";

export default function LoadSlip() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [sections, setSections] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");

  // Reference for the PDF generator
  const printRef = useRef();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await API.get('/sections');
      setSections(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching sections", err);
      setLoading(false);
    }
  };

  const filteredSections = sections.filter(sec =>
    sec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.gradeLevel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => window.print();

  const downloadPDF = () => {
    const element = printRef.current;
    const opt = {
      margin: 0.5,
      filename: `${selectedStudent.lastName}_${selectedStudent.firstName}_LoadSlip.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

      <div className="content-scroll-area" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

        <div className="management-container">
          <div className="management-header no-print">
            <div className="title-group">
              <FaFileInvoice className="title-icon" />
              <div>
                <h2>Individual Load Slips</h2>
                <p>Select a section and then a student to generate a personal load slip.</p>
              </div>
            </div>
            
            {/* ACTION BUTTONS */}
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

            {/* Step 1: Select Section */}
            <div className="section-selection-grid">
              {filteredSections.map(sec => (
                <div
                  key={sec.id}
                  className={`section-select-card ${selectedSection?.id === sec.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSection(sec);
                    setSelectedStudent(null);
                    setStudentSearch(""); // Reset search when changing sections
                  }}
                >
                  <h4>{sec.name}</h4>
                  <span>{sec.gradeLevel}</span>
                </div>
              ))}
            </div>

            {/* Step 2: Select Student */}
            {selectedSection && (
              <div className="student-selection-area mt-4 no-print">
                <h4 className="mb-2"><FaUserGraduate /> Select Student from {selectedSection.name}:</h4>

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
                  {selectedSection.students
                    ?.filter(stu =>
                      `${stu.firstName} ${stu.lastName}`.toLowerCase().includes(studentSearch.toLowerCase())
                    )
                    .map(stu => (
                      <button
                        key={stu.id}
                        className={`student-token ${selectedStudent?.id === stu.id ? 'active' : ''}`}
                        onClick={() => setSelectedStudent(stu)}
                      >
                        {stu.firstName} {stu.lastName}
                      </button>
                    ))}

                  {selectedSection.students?.filter(stu =>
                    `${stu.firstName} ${stu.lastName}`.toLowerCase().includes(studentSearch.toLowerCase())
                  ).length === 0 && (
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
                  <p><strong>Adviser:</strong> {selectedSection.advisor?.lastName || 'TBA'}</p>
                  <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <table className="slip-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Room</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSection.schedules && selectedSection.schedules.length > 0 ? (
                    selectedSection.schedules.map((sched) => (
                      <tr key={sched.id}>
                        <td>{sched.subject?.subjectName}</td>
                        <td>{sched.day}</td>
                        <td>{sched.time_slot?.display_label}</td>
                        <td>{sched.room?.room_name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }}>No schedules assigned to this section.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="slip-footer">
                <div className="sig-box">
                  <div className="line"></div>
                  <p>School Registrar</p>
                </div>
                <div className="sig-box">
                  <div className="line"></div>
                  <p>Parent Signature</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-selection-msg no-print">
              <p>Please select a <strong>Section</strong> and then a <strong>Student</strong> to generate the slip.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
  
}