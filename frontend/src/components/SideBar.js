import logo from "../assets/sics-logo.png";
import { Link } from "react-router-dom";
import {
  FaFileInvoice,
  FaLayerGroup,
  FaChalkboardTeacher,
  FaTachometerAlt,
  FaUserPlus,
  FaClipboardList,
} from "react-icons/fa";
import "./SideBar.css";

export default function Sidebar({ user }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="SICS Logo" />
        <span>SICS</span>
      </div>

      <nav className="sidebar-menu">
        <Link to="/dashboard">
          <FaTachometerAlt />
          <span>Dashboard</span>
        </Link>

        <Link to="/admin/enroll">
          <FaUserPlus />
          <span>Enrollment</span>
        </Link>

        {(user?.role === "admin" || user?.role === "registrar") && (
          <Link to="/enrollment-management">
            <FaClipboardList />
            <span>Manage Enrollments</span>
          </Link>
        )}

        <Link to="/teachers">
          <FaChalkboardTeacher /> Teacher Directory
        </Link>

        <Link to="/section-management" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
        <FaLayerGroup /> <span>Sections</span>
      </Link>

        <Link to="/load-slips" className={({ isActive }) => (isActive ? "active-link" : "")}>
    <FaFileInvoice className="icon" />
    <span>Load Slips</span>
    </Link>

      </nav>
    </aside>
  );
}
