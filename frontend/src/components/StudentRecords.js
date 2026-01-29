import { useEffect, useState } from "react";
import API from "../api/api";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import {
  FaSearch,
  FaUserEdit,
  FaFileDownload,
  FaGraduationCap,
  FaMoneyBillWave,
} from "react-icons/fa";
import "./StudentRecords.css";
import { useNavigate } from "react-router-dom";

export default function StudentRecords() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchApprovedStudents();
  }, []);

  const fetchApprovedStudents = async () => {
    try {
      const res = await API.get("/students");
      setStudents(res.data);
    } catch (err) {
      console.error("Failed to fetch student records");
    }
  };

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      (s.studentId &&
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGrade =
      filterGrade === "all" ? true : s.gradeLevel === filterGrade;
    const matchesStatus =
      filterStatus === "all" ? true : s.status === filterStatus;
    return matchesSearch && matchesGrade && matchesStatus;
  });

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

        <div className="content-scroll-area" style={{ padding: '20px' }}>
          <div className="records-container">
            <div className="records-header">
              <div className="header-title">
                <FaGraduationCap className="header-icon" />
                <h2>Master Student Records</h2>
              </div>
              <button className="export-btn">
                <FaFileDownload /> Export List (PDF)
              </button>
            </div>

            <div className="records-controls">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by ID or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="grade-filter"
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
              >
                <option value="all">All Grades</option>
                <option value="Kindergarten 1">Kindergarten 1</option>
                <option value="Kindergarten 2">Kindergarten 2</option>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={`Grade ${n}`}>Grade {n}</option>
                ))}
              </select>
              <select
                className="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Grade Level</th>
                    <th>Section</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="id-cell">
                          {student.studentId || "PENDING"}
                        </td>
                        <td className="name-cell">
                          {student.firstName} {student.lastName}
                        </td>
                        <td>{student.gradeLevel}</td>
                        <td>{student.section?.name || "N/A"}</td>
                        <td>
                          <span className={`status-badge ${student.status}`}>
                            {student.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="edit-btn" title="Edit Record">
                              <FaUserEdit />
                            </button>
                            <button 
                              className="billing-btn" 
                              title="View Billing"
                              onClick={() => navigate('/admin/billing')}
                            >
                              <FaMoneyBillWave />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        No student records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}