import { useNavigate } from "react-router-dom";
import { 
  FaUserPlus, 
  FaClipboardList, 
  FaUserGraduate, 
  FaCog 
} from "react-icons/fa";
import "./DashboardCards.css";

export default function DashboardCards({ role }) {
  const navigate = useNavigate();

  const allCards = [
    {
      title: "New Enrollment",
      desc: "Fill out the student registration form",
      icon: <FaUserPlus />,
      path: "/admin/enroll",
      color: "blue-accent",
      show: true, // Visible to everyone
    },
    {
      title: "Manage Enrollments",
      desc: "Review, approve, or reject applications",
      icon: <FaClipboardList />,
      path: "/enrollment-management",
      color: "green-accent",
      show: role === "admin" || role === "registrar",
    },
    {
      title: "Student Records",
      desc: "View and edit enrolled student data",
      icon: <FaUserGraduate />, 
      path: "/students",
      color: "purple-accent",
      show: role === "admin" || role === "registrar",
    },
    {
      title: "System Settings",
      desc: "Configure academic years and users",
      icon: <FaCog />,
      path: "/settings",
      color: "orange-accent",
      show: role === "admin",
    },
  ];

  return (
    <div className="dashboard-cards-grid">
      {allCards.map((card, index) => card.show && (
        <div 
          key={index} 
          className={`db-card ${card.color}`} 
          onClick={() => navigate(card.path)}
        >
          <div className="db-card-icon">
            {card.icon}
          </div>
          <div className="db-card-info">
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </div>
          <div className="db-card-arrow">
            →
          </div>
        </div>
      ))}
    </div>
  );
}