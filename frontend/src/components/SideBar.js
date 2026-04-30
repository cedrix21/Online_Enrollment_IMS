import { useState, useEffect } from "react";
import logo from "../assets/sics-logo.png";
import { Link, useLocation } from "react-router-dom";
import {
  FaFileInvoiceDollar,
  FaLayerGroup,
  FaChalkboardTeacher,
  FaTachometerAlt,
  FaUserPlus,
  FaBook,
  FaBookOpen,
  FaUserGraduate,
  FaMoneyBillWave,
  FaHistory,
  FaUserLock,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import "./SideBar.css";

export default function Sidebar() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";
  const isRegistrar = user?.role === "registrar";
  const isAdminOrRegistrar = isAdmin || isRegistrar;

  // State – must be defined BEFORE any effect that uses it
  const [openMenus, setOpenMenus] = useState({
    enrollment: false,
    academics: false,
    billing: false,
    management: false,
    system: false,
  });

  // Auto‑open dropdown when current path belongs to one of its children
  useEffect(() => {
    const path = location.pathname;
    const academicPaths = ["/load-slips", "/form137"];
    if (isAdmin) academicPaths.push("/admin/evaluation");

    const billingPaths = ["/admin/billing", "/payment-reports"];
    if (isAdmin) billingPaths.push("/tuition-fees");

    setOpenMenus((prev) => ({
      enrollment: prev.enrollment || ["/admin/enroll", "/enrollment-management", "/enrolled-students"].some(p => path.includes(p)),
      academics: prev.academics || academicPaths.some(p => path.includes(p)),
      billing: prev.billing || billingPaths.some(p => path.includes(p)),
      management: prev.management || ["/teachers", "/section-management", "/subject-management"].some(p => path.includes(p)),
      system: prev.system || ["/admin/activity-logs", "/admin/locked-users"].some(p => path.includes(p)),
    }));
  }, [location.pathname, isAdmin]); // isAdmin dependency needed for dynamic paths

  const toggleMenu = (menu) => {
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  // Helper: true if any of the given paths matches current URL
  const isActiveGroup = (paths) => paths.some(path => location.pathname.includes(path));

  // Dynamic path arrays for active checks
  const enrollmentPaths = ["/admin/enroll", "/enrollment-management", "/enrolled-students"];
  const academicPaths = ["/load-slips", "/form137"];
  if (isAdmin) academicPaths.push("/admin/evaluation");
  const billingPaths = ["/admin/billing", "/payment-reports"];
  if (isAdmin) billingPaths.push("/tuition-fees");

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="SICS Logo" />
        <span>SICS</span>
      </div>

      <nav className="sidebar-menu">
        {/* Dashboard */}
        <Link
          to="/dashboard"
          className={location.pathname === "/dashboard" ? "active" : ""}
        >
          <FaTachometerAlt /> <span>Dashboard</span>
        </Link>

        {/* Enrollment (Admin + Registrar) */}
        {isAdminOrRegistrar && (
          <div className="sidebar-dropdown">
            <button
              className={`dropdown-toggle ${isActiveGroup(enrollmentPaths) ? "active" : ""}`}
              onClick={() => toggleMenu("enrollment")}
            >
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

        {/* Academics (Admin + Registrar) */}
        {isAdminOrRegistrar && (
          <div className="sidebar-dropdown">
            <button
              className={`dropdown-toggle ${isActiveGroup(academicPaths) ? "active" : ""}`}
              onClick={() => toggleMenu("academics")}
            >
              <FaBookOpen />
              <span>Academics</span>
              {openMenus.academics ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
            </button>
            {openMenus.academics && (
              <div className="dropdown-menu">
                <Link to="/load-slips" className={location.pathname.includes("/load-slips") ? "active" : ""}>Load Slips</Link>
                <Link to="/form137" className={location.pathname.includes("/form137") ? "active" : ""}>Form 137</Link>
                {isAdmin && (
                  <Link to="/admin/evaluation" className={location.pathname.includes("/admin/evaluation") ? "active" : ""}>Evaluations</Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Billing & Payments (Admin + Registrar) */}
        {isAdminOrRegistrar && (
          <div className="sidebar-dropdown">
            <button
              className={`dropdown-toggle ${isActiveGroup(billingPaths) ? "active" : ""}`}
              onClick={() => toggleMenu("billing")}
            >
              <FaFileInvoiceDollar />
              <span>Billing & Payments</span>
              {openMenus.billing ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
            </button>
            {openMenus.billing && (
              <div className="dropdown-menu">
                <Link to="/admin/billing" className={location.pathname.includes("/admin/billing") ? "active" : ""}>Billing Ledger</Link>
                <Link to="/payment-reports" className={location.pathname.includes("/payment-reports") ? "active" : ""}>Payment Reports</Link>
                {isAdmin && (
                  <Link to="/tuition-fees" className={location.pathname.includes("/tuition-fees") ? "active" : ""}>Tuition Fees</Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Management (Admin only) */}
        {isAdmin && (
          <div className="sidebar-dropdown">
            <button
              className={`dropdown-toggle ${isActiveGroup(["/teachers", "/section-management", "/subject-management"]) ? "active" : ""}`}
              onClick={() => toggleMenu("management")}
            >
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

        {/* System (Admin only) */}
        {isAdmin && (
          <div className="sidebar-dropdown">
            <button
              className={`dropdown-toggle ${isActiveGroup(["/admin/activity-logs", "/admin/locked-users"]) ? "active" : ""}`}
              onClick={() => toggleMenu("system")}
            >
              <FaHistory />
              <span>System</span>
              {openMenus.system ? <FaChevronDown className="chevron" /> : <FaChevronRight className="chevron" />}
            </button>
            {openMenus.system && (
              <div className="dropdown-menu">
                <Link to="/admin/activity-logs" className={location.pathname.includes("/admin/activity-logs") ? "active" : ""}>Activity Logs</Link>
                <Link to="/admin/locked-users" className={location.pathname.includes("/admin/locked-users") ? "active" : ""}>Locked Users</Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}