import { useEffect, useState, useMemo, useCallback, lazy, Suspense, memo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "./Dashboard.css";
import SideBar from "../components/SideBar";
import TopBar from "../components/TopBar";
import SummaryCards from "../components/SummaryCards";
import { FaChalkboardTeacher } from "react-icons/fa";
import LoadingScreen from "../components/LoadingScreen";

// Lazy load non-critical components
const Announcements = lazy(() => import("../components/Announcements"));
const Events = lazy(() => import("../components/Events"));
const DashboardCards = lazy(() => import("../components/DashboardCards"));

// Cache keys
const CACHE_KEYS = {
  SUMMARY: 'dashboard_summary',
  TEACHERS: 'dashboard_teachers'
};

// Memoized Teacher Stat Card
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

// Skeleton loader
const SummarySkeleton = () => (
  <div className="summary-container">
    {[1, 2, 3, 4, 5].map(i => (
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
  
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    cash_enrollments: 0,
    unpaid_students: 0
  });
  
  const [teacherCount, setTeacherCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const isAdminOrRegistrar = useMemo(
    () => user?.role === "admin" || user?.role === "registrar",
    [user?.role]
  );

  // Parallel data fetching with caching
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
        
        // Check cache first
        const cachedSummary = localStorage.getItem(CACHE_KEYS.SUMMARY);
        const cachedTeachers = localStorage.getItem(CACHE_KEYS.TEACHERS);
        const cacheTime = localStorage.getItem(`${CACHE_KEYS.SUMMARY}_time`);

        if (cachedSummary && cachedTeachers && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < 5 * 60 * 1000) { // 5 minutes cache
            setSummary(JSON.parse(cachedSummary));
            setTeacherCount(JSON.parse(cachedTeachers));
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data in parallel
        const [teachersRes, enrollmentsRes] = await Promise.all([
          API.get("/teachers"),
          API.get("/enrollments")
        ]);

        const teachers = teachersRes.data;
        const enrollments = enrollmentsRes.data;

        // Process data
        const newSummary = {
          pending: enrollments.filter(e => e.status === 'pending').length,
          approved: enrollments.filter(e => e.status === 'approved').length,
          rejected: enrollments.filter(e => e.status === 'rejected').length,
          cash_enrollments: enrollments.filter(e => 
            e.payments?.[0]?.paymentMethod === 'Cash' && e.status === 'pending'
          ).length,
          unpaid_students: enrollments.filter(e => 
            e.payments?.[0]?.paymentMethod !== 'Cash' && e.status === 'pending'
          ).length
        };

        const newTeacherCount = teachers.length;

        // Update state
        setSummary(newSummary);
        setTeacherCount(newTeacherCount);

        // Cache results
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
  }, [user, navigate, isAdminOrRegistrar]);

  if (!user) return <LoadingScreen />;

  return (
    <div className="dashboard-layout">
      <SideBar user={user} />
      <div className="main-content">
        <TopBar user={user} />
        
        {/* This div handles all scrolling */}
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
                  <div className="summary-grid" style={{ marginTop: "20px" }}>
                    <TeacherStatCard 
                      teacherCount={teacherCount} 
                      onClick={() => navigate("/teachers")}
                    />
                  </div>
                </>
              )}
            </>
          )}
          
          <Suspense fallback={<div className="loading-placeholder">Loading...</div>}>
            <DashboardCards role={user.role} />
          </Suspense>
          
          {/* <div className="bottom-section">
            <Suspense fallback={<div className="loading-placeholder">Loading announcements...</div>}>
              <Announcements />
            </Suspense>
            <Suspense fallback={<div className="loading-placeholder">Loading events...</div>}>
              <Events />
            </Suspense>
          </div> */}

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// Add handleLogout function
const handleLogout = async () => {
  try {
    await API.post("/logout");
  } catch (err) {
    console.warn("Server logout failed");
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(CACHE_KEYS.SUMMARY);
    localStorage.removeItem(CACHE_KEYS.TEACHERS);
    localStorage.removeItem(`${CACHE_KEYS.SUMMARY}_time`);
    window.location.href = "/login";
  }
};