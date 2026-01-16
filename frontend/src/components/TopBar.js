import logo from "../assets/sics-logo.png";
import "./TopBar.css";

export default function TopBar({ user }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <img src={logo} alt="SICS Logo" className="topbar-logo" />
        <h1>Online Enrollment & Information Management System</h1>
      </div>

      <div className="topbar-user">
        <span>{user.name}</span>
        <span className={`role ${user.role}`}>{user.role}</span>
      </div>
    </header>
  );
}
