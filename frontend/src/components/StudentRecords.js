import { useEffect, useState } from "react";
import API from "../api/axios";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import {
  FaSearch,
  FaUserEdit,
  FaFileDownload,
  FaGraduationCap,
} from "react-icons/fa";
import "./StudentRecords.css";

export default function StudentRecords() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");

  useEffect(() => {
    fetchApprovedStudents();
  }, []);

  const fetchApprovedStudents = async () => {
    try {
      // We only fetch students with 'approved' status for this master list
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
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

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
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
            </select>
          </div>

          <div className="table-wrapper">
            <table className="records-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Grade Level</th>
                  <th>Email Address</th>
                  <th>Enrolled Date</th>
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
                      <td>{student.email}</td>
                      <td>
                        {student.created_at
                          ? new Date(student.created_at).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "N/A"}
                      </td>
                      <td>
                        <button className="edit-btn" title="Edit Record">
                          <FaUserEdit />
                        </button>
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
  );
}
