import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Enrollment from "./pages/Enrollment";
import EnrollmentManagement from "./pages/EnrollmentManagement";
import ProtectedRoute from "./components/ProtectedRoute";
import EnrollmentQR from "./pages/EnrollmentQR";
import AdminEnrollment from "./pages/AdminEnrollment";
import StudentRecords from "./components/StudentRecords";
import TeacherDirectory from "./pages/TeacherDirectory";
import SectionManagement from "./components/SectionManagement"; 
import LoadSlip from "./components/LoadSlip";
import NotFound from "./components/NotFound";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/enroll" element={<Enrollment />} />

        <Route path="/enrollment-qr" element={<EnrollmentQR />} />

        <Route
          path="/enrollment-management"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <EnrollmentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/enroll"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <AdminEnrollment />
            </ProtectedRoute>
          }
        />

        <Route path="/students" element={<StudentRecords />} />
        <Route path="/teachers" element={<TeacherDirectory />} />
        <Route path="/section-management" element={<SectionManagement />} />
        
        {/* Redirect any unknown route to login */}
        <Route path="*" element={<Navigate to="/login" />} />
        <Route path="/load-slips" element={<LoadSlip />} />

        {/* The 404 Route */}
        <Route path="/404" element={<NotFound />} />
        {/* Catch-all route for any other invalid URLs */}
        <Route path="*" element={<NotFound />} />


      </Routes>

      
    </Router>
  );
}

export default App;
