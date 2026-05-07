import { useState, useEffect } from "react";
import logo from "../assets/sics-logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaFileInvoiceDollar,
  FaLayerGroup,
  FaChalkboardTeacher,
  FaTachometerAlt,
  FaUserPlus,
  FaBookOpen,
  FaHistory,
  FaChevronDown,
  FaChevronRight,
  FaBars,
  FaTimes,
  FaSignOutAlt,   // ← new icon for logout
} from "react-icons/fa";
import API from "../api/api";   // ← make sure API is imported
import "./SideBar.css";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  let user = null;
  try {
    const raw = localStorage.getItem("user");
    if (raw && raw !== "undefined" && raw !== "null") {
      user = JSON.parse(raw);
    }
  } catch {
    user = null;
  }

  const isAdmin = user?.role === "admin";
  const isRegistrar = user?.role === "registrar";
  const isAdminOrRegistrar = isAdmin || isRegistrar;
  const userName = user?.name || "Guest";
  const userRole = user?.role || "guest";

  // Mobile toggle
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Path arrays
  const enrollmentPaths = ["/admin/enroll", "/enrollment-management", "/enrolled-students"];
  const academicPaths = ["/load-slips", "/form137"];
  if (isAdmin) academicPaths.push("/admin/evaluation");
  const billingPaths = ["/admin/billing", "/payment-reports"];
  if (isAdmin) billingPaths.push("/tuition-fees");

  // Dropdown states
  const [openMenus, setOpenMenus] = useState({
    enrollment: false,
    academics: false,
    billing: false,
    management: false,
    system: false,
  });

  useEffect(() => {
    const path = location.pathname;
    setOpenMenus((prev) => ({
      enrollment: prev.enrollment || enrollmentPaths.some(p => path.includes(p)),
      academics: prev.academics || academicPaths.some(p => path.includes(p)),
      billing: prev.billing || billingPaths.some(p => path.includes(p)),
      management: prev.management || ["/teachers", "/section-management", "/subject-management"].some(p => path.includes(p)),
      system: prev.system || ["/admin/activity-logs", "/admin/locked-users", "/admin/school-year"].some(p => path.includes(p)),    }));
  }, [location.pathname, isAdmin]);

  const toggleMenu = (menu) => setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));

  // ── Logout handler ──
  const handleLogout = async () => {
    try {
      await API.post("/logout");
    } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="sidebar-overlay visible" onClick={() => setIsOpen(false)} />}

      {/* Hamburger */}
      <button
        className="sidebar-toggle-btn"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Toggle menu"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src={logo} alt="SICS Logo" />
          <span>SICS</span>
        </div>

        <nav className="sidebar-menu">
          <Link to="/dashboard" className={location.pathname === "/dashboard" ? "active" : ""}>
            <FaTachometerAlt /> <span>Dashboard</span>
          </Link>

          {/* Enrollment */}
          {isAdminOrRegistrar && (
            <div className="sidebar-dropdown">
              <button className="dropdown-toggle" onClick={() => toggleMenu("enrollment")}>
                <FaUserPlus />
                <span>Enrollment</span>
                {openMenus.enrollment ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
              </button>
              {openMenus.enrollment && (
                <div className="dropdown-menu">
                  <Link to="/admin/enroll" className={location.pathname.includes("/admin/enroll") ? "active" : ""}>Enroll Student</Link>
                  <Link to="/enrollment-management" className={location.pathname.includes("/enrollment-management") ? "active" : ""}>Manage Enrollments</Link>
                  <Link to="/enrolled-students" className={location.pathname.includes("/enrolled-students") ? "active" : ""}>Enrolled Students</Link>
                </div>
              )}
            </div>
          )}

          {/* Academics */}
          {isAdminOrRegistrar && (
            <div className="sidebar-dropdown">
              <button className="dropdown-toggle" onClick={() => toggleMenu("academics")}>
                <FaBookOpen />
                <span>Academics</span>
                {openMenus.academics ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
              </button>
              {openMenus.academics && (
                <div className="dropdown-menu">
                  <Link to="/load-slips" className={location.pathname.includes("/load-slips") ? "active" : ""}>Load Slips</Link>
                  <Link to="/form137" className={location.pathname.includes("/form137") ? "active" : ""}>Form 137</Link>
                  {isAdmin && <Link to="/admin/evaluation" className={location.pathname.includes("/admin/evaluation") ? "active" : ""}>Evaluations</Link>}
                </div>
              )}
            </div>
          )}

          {/* Billing */}
          {isAdminOrRegistrar && (
            <div className="sidebar-dropdown">
              <button className="dropdown-toggle" onClick={() => toggleMenu("billing")}>
                <FaFileInvoiceDollar />
                <span>Billing & Payments</span>
                {openMenus.billing ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
              </button>
              {openMenus.billing && (
                <div className="dropdown-menu">
                  <Link to="/admin/billing" className={location.pathname.includes("/admin/billing") ? "active" : ""}>Billing Ledger</Link>
                  <Link to="/payment-reports" className={location.pathname.includes("/payment-reports") ? "active" : ""}>Payment Reports</Link>
                  {isAdmin && <Link to="/tuition-fees" className={location.pathname.includes("/tuition-fees") ? "active" : ""}>Tuition Fees</Link>}
                </div>
              )}
            </div>
          )}

          {/* Management */}
          {isAdmin && (
            <div className="sidebar-dropdown">
              <button className="dropdown-toggle" onClick={() => toggleMenu("management")}>
                <FaLayerGroup />
                <span>Management</span>
                {openMenus.management ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
              </button>
              {openMenus.management && (
                <div className="dropdown-menu">
                  <Link to="/teachers" className={location.pathname.includes("/teachers") ? "active" : ""}>Teacher Directory</Link>
                  <Link to="/section-management" className={location.pathname.includes("/section-management") ? "active" : ""}>Sections</Link>
                  <Link to="/subject-management" className={location.pathname.includes("/subject-management") ? "active" : ""}>Subjects</Link>
                </div>
              )}
            </div>
          )}

          {/* System */}
          {isAdmin && (
            <div className="sidebar-dropdown">
              <button className="dropdown-toggle" onClick={() => toggleMenu("system")}>
                <FaHistory />
                <span>System</span>
                {openMenus.system ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
              </button>
              {openMenus.system && (
                <div className="dropdown-menu">
                  <Link to="/admin/activity-logs" className={location.pathname.includes("/admin/activity-logs") ? "active" : ""}>Activity Logs</Link>
                  <Link to="/admin/locked-users" className={location.pathname.includes("/admin/locked-users") ? "active" : ""}>Locked Users</Link>
                  <Link to="/admin/school-year" className={location.pathname.includes("/admin/school-year") ? "active" : ""}>School Year</Link>
                </div>
              )}
              
            </div>
          )}

          {/* ─────── LOGOUT ─────── */}
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#d32f2f',
              fontSize: '0.9rem',
              padding: '10px 15px',
              marginTop: '10px',
            }}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </nav>
      </aside>
    </>
  );
}