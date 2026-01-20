import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "./Dashboard.css";

import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import Summarycards from "../components/SummaryCards";
import DashboardCards from "../components/DashboardCards";
import Announcements from "../components/Announcements";
import Events from "../components/Events";
import { FaChalkboardTeacher } from "react-icons/fa";

export default function Dashboard() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState("");
  const [teacherCount, setTeacherCount] = useState(0);
  const navigate = useNavigate();

  const isAdminOrRegistrar =
    user?.role === "admin" || user?.role === "registrar";

  // Fetch teacher count
  const fetchStats = async () => {
    try {
      const res = await API.get("/teachers");
      setTeacherCount(res.data.length);
    } catch (err) {
      console.error("Failed to fetch teacher count");
    }
  };

  // Fetch enrollment summary
  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await API.get("/enrollments/summary");
      setSummary({
        pending: res.data?.pending || 0,
        approved: res.data?.approved || 0,
        rejected: res.data?.rejected || 0,
      });
    } catch (err) {
      setError("Failed to load enrollment summary.");
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (isAdminOrRegistrar) {
      fetchSummary();
      fetchStats(); // Added this call here
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await API.post("/logout");
    } catch (err) {
      console.warn("Server logout failed, clearing local session anyway.");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />

      <div className="content-scroll-area" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
        {isAdminOrRegistrar && (
          <>
            {/* Existing Summary Cards (Row of 3) */}
            {loadingSummary ? (
              <p>Loading summary...</p>
            ) : (
              <Summarycards summary={summary} />
            )}
            {error && <p className="error-text">{error}</p>}

            {/* Additional Quick Action Grid for Teachers */}
            {/* Additional Quick Action Grid for Teachers */}
            <div className="summary-grid" style={{ marginTop: "20px" }}>
              <div
                className="stat-card teacher-stat-card"
                onClick={() => navigate("/teachers")}
              >
                <div className="stat-content">
                  <div className="stat-text-section">
                    <p className="stat-label">FACULTY MEMBERS</p>
                    <h3 className="stat-value">{teacherCount}</h3>
                    <span className="stat-link">
                      Manage Advisory & Subjects →
                    </span>
                  </div>
                  <div className="stat-icon-circle">
                    <FaChalkboardTeacher />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <DashboardCards role={user.role} />

        <div className="bottom-section">
          <Announcements />
          <Events />
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
          style={{ marginTop: "30px" }}
        >
          Logout
        </button>
        </div>
      </div>
    </div>
  );
}
