import { useEffect, useState } from "react";
import API from "../api/axios";
import { useNavigate, useLocation } from "react-router-dom";
import "./EnrollmentManagement.css";

// Import the Layout Components
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";

export default function EnrollmentManagement() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [enrollments, setEnrollments] = useState([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState(
    location.state?.filter || "all"
  );

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "registrar")) {
      navigate("/dashboard");
    } else {
      fetchEnrollments();
    }
  }, [user, navigate]);

  const fetchEnrollments = async () => {
    try {
      const res = await API.get("/enrollments");
      setEnrollments(res.data);
    } catch (err) {
      setMessage("Failed to load enrollments");
    }
  };

  const updateStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this as ${status}?`))
      return;
    try {
      await API.put(`/enrollment/${id}/status`, { status });
      setMessage(`Enrollment ${status} successfully`);
      fetchEnrollments();
    } catch (err) {
      setMessage("Action failed");
    }
  };

  const filteredData = enrollments.filter((e) => {
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ? true : e.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (!user) return null;
  

  return (
    <div className="dashboard-layout">
      {/* LEFT SIDEBAR */}
      <SideBar user={user} />

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        <TopBar user={user} />

      <div className="content-scroll-area" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

        <div className="management-container">
          <div className="management-header">
            <h2>Enrollment Management</h2>
            {message && <p className="message-toast">{message}</p>}
          </div>

          <div className="admin-actions">
            <div className="search-filter-group">
              <input
                type="text"
                placeholder="Search name or email..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="button-group">
              <button className="btn-add" onClick={() => navigate("/admin/enroll")}>Add Student</button>
              <button
                className="btn-qr"
                onClick={() => navigate("/enrollment-qr")}
              >
                Show QR
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((e) => (
                    <tr key={e.id}>
                      <td data-label="Name">
                        {e.firstName} {e.lastName}
                      </td>
                      <td data-label="Email">{e.email}</td>
                      <td data-label="Grade">{e.gradeLevel}</td>
                      <td data-label="Status">
                        <span className={`status-pill ${e.status}`}>
                          {e.status}
                        </span>
                      </td>
                      <td data-label="Action">
                        {e.status === "pending" && (
                          <div className="action-buttons">
                            <button
                              className="approve"
                              onClick={() => updateStatus(e.id, "approved")}
                            >
                              Approve
                            </button>
                            <button
                              className="reject"
                              onClick={() => updateStatus(e.id, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No students found.
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
