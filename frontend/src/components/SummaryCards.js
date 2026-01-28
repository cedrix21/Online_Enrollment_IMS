import { useNavigate } from "react-router-dom";
import { FaClock, FaCheckCircle, FaTimesCircle, FaDollarSign, FaExclamationTriangle } from "react-icons/fa";
import "./SummaryCards.css";

export default function SummaryCards({ summary }) {
  const navigate = useNavigate();

  const stats = [
    {
      label: "Pending Enrollments",
      count: summary.pending,
      icon: <FaClock />,
      class: "pending-card",
      status: "pending"
    },
    {
      label: "Approved Students",
      count: summary.approved,
      icon: <FaCheckCircle />,
      class: "approved-card",
      status: "approved"
    },
    {
      label: "Rejected Applications",
      count: summary.rejected,
      icon: <FaTimesCircle />,
      class: "rejected-card",
      status: "rejected"
    },
    {
      label: "Unpaid Enrollments",
      count: summary.unpaid_enrollments || 0,
      icon: <FaDollarSign />,
      class: "unpaid-card",
      route: "/billing-management"
    },
    {
      label: "Pending Payments",
      count: summary.pending_payments || 0,
      icon: <FaExclamationTriangle />,
      class: "pending-payment-card",
      route: "/billing-management"
    }
  ];

  return (
    <div className="summary-container">
      {stats.map((item, index) => (
        <div 
          key={index} 
          className={`summary-card ${item.class}`}
          onClick={() => navigate("/enrollment-management", { state: { filter: item.status } })}
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