import logo from "../assets/sics-logo.png";
import "./TopBar.css";

export default function TopBar() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <header className="topbar">
      <div className="topbar-left">
        <img src={logo} alt="SICS Logo" className="topbar-logo" />
        <h1>SICS Management System</h1>
      </div>

      <div className="topbar-user">
        <span>{user?.name || 'Guest'}</span>
        <span className={`role-badge ${user?.role}`}>{user?.role || 'guest'}</span>
      </div>
    </header>
  );
}