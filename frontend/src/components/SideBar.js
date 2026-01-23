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
} from "react-icons/fa";
import "./SideBar.css";



export default function Sidebar({ user }) {
  const location = useLocation();
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="SICS Logo" />
        <span>SICS</span>
      </div>

      <nav className="sidebar-menu">
        <Link to="/dashboard" className={location.pathname === "/dashboard" ? "active" : ""}>
          <FaTachometerAlt /> <span>Dashboard</span>
        </Link>

        <Link to="/admin/enroll" className={location.pathname.includes('/admin/enroll') ? 'active' : ''}>
          <FaUserPlus />
          <span>Enrollment</span>
        </Link>

        {(user?.role === "admin" || user?.role === "registrar") && (
          <Link to="/enrollment-management" className={location.pathname.includes('/enrollment-management') ? 'active' : ''}>
            <FaClipboardList />
            <span>Manage Enrollments</span>
          </Link>
        )}

        <Link to="/teachers" className={location.pathname.includes('/teachers') ? 'active' : ''}>
          <FaChalkboardTeacher /> Teacher Directory
        </Link>

        <Link to="/section-management" className={location.pathname.includes('/section-management') ? 'active' : ''}>
        <FaLayerGroup /> <span>Sections</span>
      </Link>

        <Link to="/load-slips" className={location.pathname.includes('/load-slips') ? 'active' : ''}>
        <FaFileInvoice className="icon" />
        <span>Load Slips</span>
        </Link>

      <Link 
          to="/admin/billing" 
          className={location.pathname.includes('/admin/billing') ? 'active' : ''}>
          <FaFileInvoiceDollar />
          <span>Billing Ledger</span>
        </Link>

      </nav>
    </aside>
  );
}
