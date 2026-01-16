import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");
  
  // Parse the user only if data exists
  const user = userData ? JSON.parse(userData) : null;

  if (!token || !user) {
    // If no token or no user data in storage, go to login
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // If user is logged in but doesn't have the right role
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}