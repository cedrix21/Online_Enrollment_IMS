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

        <Link to="/subject-management" className={location.pathname.includes('/subject-management') ? 'active' : ''}>
          <FaBookOpen /> Subject Management
        </Link>


        <Link to="/load-slips" className={location.pathname.includes('/load-slips') ? 'active' : ''}>
        <FaFileInvoice  />
        <span>Load Slips</span>
        </Link>

        

      {(user?.role === "admin" || user?.role === "registrar") && (
        <Link to="/admin/evaluation" className={location.pathname.includes('/admin/evaluation') ? 'active' : ''}>
          <FaBook />
          <span>Evaluations</span>
        </Link>
      )}

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
