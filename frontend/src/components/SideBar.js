import logo from "../assets/sics-logo.png";
import { Link, useLocation } from "react-router-dom";
import {
  FaFileInvoiceDollar,
  FaFileInvoice,
  FaLayerGroup,
  FaChalkboardTeacher,
  FaTachometerAlt,
  FaUserPlus,
  FaClipboardList,
  FaBook,
  FaBookOpen,
  FaUserGraduate,
  FaMoneyBillWave,
  FaHistory,
} from "react-icons/fa";
import "./SideBar.css";

export default function Sidebar() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));

  const isAdmin     = user?.role === "admin";
  const isRegistrar = user?.role === "registrar";
  const isAdminOrRegistrar = isAdmin || isRegistrar;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="SICS Logo" />
        <span>SICS</span>
      </div>

      <nav className="sidebar-menu">

        {/* ── Shared by all authenticated roles ── */}
        <Link
          to="/dashboard"
          className={location.pathname === "/dashboard" ? "active" : ""}
        >
          <FaTachometerAlt /> <span>Dashboard</span>
        </Link>

        {/* ── Admin + Registrar ── */}
        {isAdminOrRegistrar && (
          <>
            <Link
              to="/admin/enroll"
              className={location.pathname.includes("/admin/enroll") ? "active" : ""}
            >
              <FaUserPlus />
              <span>Enrollment</span>
            </Link>

            <Link
              to="/enrollment-management"
              className={location.pathname.includes("/enrollment-management") ? "active" : ""}
            >
              <FaClipboardList />
              <span>Manage Enrollments</span>
            </Link>

            <Link
              to="/enrolled-students"
              className={location.pathname.includes("/enrolled-students") ? "active" : ""}
            >
              <FaUserGraduate />
              <span>Enrolled Students</span>
            </Link>

            <Link
              to="/load-slips"
              className={location.pathname.includes("/load-slips") ? "active" : ""}
            >
              <FaFileInvoice />
              <span>Load Slips</span>
            </Link>

            <Link
              to="/form137"
              className={location.pathname.includes("/form137") ? "active" : ""}
            >
              <FaBook />
              <span>Form 137</span>
            </Link>

            <Link
              to="/admin/billing"
              className={location.pathname.includes("/admin/billing") ? "active" : ""}
            >
              <FaFileInvoiceDollar />
              <span>Billing Ledger</span>
            </Link>

            <Link
              to="/payment-reports"
              className={location.pathname.includes("/payment-reports") ? "active" : ""}
            >
              <FaFileInvoiceDollar />
              <span>Payment Reports</span>
            </Link>
          </>
        )}

        {/* ── Admin only ── */}
        {isAdmin && (
          <>
            <Link
              to="/teachers"
              className={location.pathname.includes("/teachers") ? "active" : ""}
            >
              <FaChalkboardTeacher /> Teacher Directory
            </Link>

            <Link
              to="/section-management"
              className={location.pathname.includes("/section-management") ? "active" : ""}
            >
              <FaLayerGroup /> <span>Sections</span>
            </Link>

            <Link
              to="/subject-management"
              className={location.pathname.includes("/subject-management") ? "active" : ""}
            >
              <FaBookOpen /> Subject Management
            </Link>

            <Link
              to="/admin/evaluation"
              className={location.pathname.includes("/admin/evaluation") ? "active" : ""}
            >
              <FaBook />
              <span>Evaluations</span>
            </Link>

            <Link
              to="/tuition-fees"
              className={location.pathname.includes("/tuition-fees") ? "active" : ""}
            >
              <FaMoneyBillWave />
              <span>Tuition Fees</span>
            </Link>


              <Link 
                to="/admin/activity-logs" 
                className={location.pathname.includes("/admin/activity-logs") ? "active" : ""}
              >
                <FaHistory  />
                <span>Activity Logs</span>
              </Link>
        
          </>
         
        )}


      </nav>
    </aside>
  );
}