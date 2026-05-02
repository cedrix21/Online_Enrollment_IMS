import logo from "../assets/sics-logo.png";
import "./TopBar.css";

export default function TopBar() {
  // ── Safely get user ───────────────────────────────────
  let user = null;
  try {
    const raw = localStorage.getItem("user");
    if (raw && raw !== "undefined" && raw !== "null") {
      user = JSON.parse(raw);
    }
  } catch {
    user = null;
  }

  // Fallback values for rendering
  const userName = user?.name || "Guest";
  const userRole = user?.role || "guest";

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