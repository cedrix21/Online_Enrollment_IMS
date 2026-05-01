import { useEffect, useState, useMemo, useCallback, lazy, Suspense, memo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "./Dashboard.css";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import SummaryCards from "../components/SummaryCards";
import { FaChalkboardTeacher } from "react-icons/fa";
import LoadingScreen from "../components/LoadingScreen";

const Announcements = lazy(() => import("../components/Announcements"));
const Events = lazy(() => import("../components/Events"));
const DashboardCards = lazy(() => import("../components/DashboardCards"));

const CACHE_KEYS = {
  SUMMARY:  "dashboard_summary",
  TEACHERS: "dashboard_teachers",
};

const TeacherStatCard = memo(({ teacherCount, onClick }) => (
  <div className="teacher-stat-card" onClick={onClick}>
    <div className="stat-content">
      <div className="stat-text-section">
        <p className="stat-label">FACULTY MEMBERS</p>
        <h3 className="stat-value">{teacherCount}</h3>
        <span className="stat-link">Manage Advisory & Subjects →</span>
      </div>
      <div className="stat-icon-circle">
        <FaChalkboardTeacher />
      </div>
    </div>
  </div>
));

const SummarySkeleton = () => (
  <div className="summary-container">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="summary-card skeleton-card">
        <div className="summary-content">
          <div className="summary-info">
            <div className="skeleton-label"></div>
            <div className="skeleton-count"></div>
          </div>
          <div className="skeleton-icon"></div>
        </div>
      </div>
    ))}
  </div>
);

export default function Dashboard() {
  const [user] = useState(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  });

  const navigate  = useNavigate();
  const [summary, setSummary]           = useState(null);
  const [teacherCount, setTeacherCount] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const isAdmin             = useMemo(() => user?.role === "admin", [user?.role]);
  const isAdminOrRegistrar  = useMemo(
    () => user?.role === "admin" || user?.role === "registrar",
    [user?.role]
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (!isAdminOrRegistrar) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
  try {
    setLoading(true);

    // Check cache
    const cachedSummary  = localStorage.getItem(CACHE_KEYS.SUMMARY);
    const cachedTeachers = localStorage.getItem(CACHE_KEYS.TEACHERS);
    const cacheTime      = localStorage.getItem(`${CACHE_KEYS.SUMMARY}_time`);

    if (cachedSummary && cachedTeachers && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 5 * 60 * 1000) {
        setSummary(JSON.parse(cachedSummary));
        setTeacherCount(JSON.parse(cachedTeachers));
        setLoading(false);
        return;
      }
    }

    // 1. Fetch the summary from backend – it already contains correct unpaid_students
    const summaryRes = await API.get("/enrollments/summary");
    const newSummary = summaryRes.data;   // { pending, approved, rejected, cash_enrollments, unpaid_students }

    // 2. Fetch teachers ONLY if admin
    let newTeacherCount = 0;
    if (isAdmin) {
      try {
        const teachersRes = await API.get("/teachers");
        newTeacherCount = teachersRes.data.length;
      } catch (teacherErr) {
        console.warn("Could not load teachers", teacherErr);
      }
    }

    setSummary(newSummary);
    setTeacherCount(newTeacherCount);

    // Cache
    localStorage.setItem(CACHE_KEYS.SUMMARY, JSON.stringify(newSummary));
    localStorage.setItem(CACHE_KEYS.TEACHERS, JSON.stringify(newTeacherCount));
    localStorage.setItem(`${CACHE_KEYS.SUMMARY}_time`, Date.now().toString());
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    setError("Failed to load dashboard data");
  } finally {
    setLoading(false);
  }
};

    fetchData();
  }, [user, navigate, isAdminOrRegistrar, isAdmin]);

  const handleLogout = useCallback(async () => {
  try {
    await API.post("/logout");
  } catch {}
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // Clear dashboard cache
  localStorage.removeItem(CACHE_KEYS.SUMMARY);
  localStorage.removeItem(CACHE_KEYS.TEACHERS);
  localStorage.removeItem(`${CACHE_KEYS.SUMMARY}_time`);
  navigate("/login");
}, [navigate]);

  if (!user) return <LoadingScreen />;

  return (
   

        <div className="content-scroll-area">
          {isAdminOrRegistrar && (
            <>
              {loading ? (
                <SummarySkeleton />
              ) : error ? (
                <div className="error-text">{error}</div>
              ) : (
                <>
                  <SummaryCards summary={summary} />

                  {/* Teacher stat card — admin only */}
                  {isAdmin && (
                    <div className="summary-grid" style={{ marginTop: "20px" }}>
                      <TeacherStatCard
                        teacherCount={teacherCount}
                        onClick={() => navigate("/teachers")}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <Suspense fallback={<div className="loading-placeholder">Loading...</div>}>
            <DashboardCards role={user.role} />
          </Suspense>

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
     
  );
}