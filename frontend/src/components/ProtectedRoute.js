import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, roles }) {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");
  
  let user = null;

  try {
    // Check if userData exists AND isn't the literal string "undefined"
    if (userData && userData !== "undefined" && userData !== "null") {
      user = JSON.parse(userData);
    }
  } catch (error) {
    console.error("Failed to parse user data:", error);
    // If parsing fails, clear the bad data so it doesn't crash again
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  // 1. If no token or no valid user object, redirect to login
  if (!token || !user) {
    return <Navigate to="/*" replace />;
  }

  // 2. If roles are specified and user's role doesn't match
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/*" replace />; 
  }

  return children;
}