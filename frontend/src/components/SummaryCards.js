import { useNavigate } from "react-router-dom";
import { FaClock, FaCheckCircle, FaTimesCircle, FaDollarSign, FaMoneyBillWave } from "react-icons/fa";
import "./SummaryCards.css";

export default function SummaryCards({ summary }) {
  const navigate = useNavigate();

  const stats = [
    {
      label: "Pending Enrollments",
      count: summary.pending,
      icon: <FaClock />,
      class: "pending-card",
      route: "/enrollment-management",
      state: { filter: "pending" }
    },
    {
      label: "Approved Students",
      count: summary.approved,
      icon: <FaCheckCircle />,
      class: "approved-card",
      route: "/enrollment-management",
      state: { filter: "approved" }
    },
    {
      label: "Rejected Applications",
      count: summary.rejected,
      icon: <FaTimesCircle />,
      class: "rejected-card",
      route: "/enrollment-management",
      state: { filter: "rejected" }
    },
    {
      label: "Cash Walk-in Pending",
      count: summary.cash_enrollments || 0,
      icon: <FaMoneyBillWave />,
      class: "cash-card",
      route: "/enrollment-management",
      state: { filter: "pending", paymentFilter: "Cash" }
    },
    {
      label: "Students with Balance",
      count: summary.unpaid_students || 0,
      icon: <FaDollarSign />,
      class: "unpaid-card",
      route: "/admin/billing",
      state: { paymentFilter: "unpaid" }
    }
  ];

  return (
   <div className="summary-container">
      {stats.map((item, index) => (
        <div 
          key={index} 
          className={`summary-card ${item.class}`}
          onClick={() => navigate(item.route, item.state ? { state: item.state } : {})}
        >
          <div className="summary-content">
            <div className="summary-info">
              <span className="summary-label">{item.label}</span>
              <h2 className="summary-count">{item.count.toLocaleString()}</h2>
            </div>
            <div className="summary-icon-wrapper">
              {item.icon}
            </div>
          </div>
          <div className="summary-footer">
            <span>View Details →</span>
          </div>
        </div>
      ))}
    </div>
  );
}