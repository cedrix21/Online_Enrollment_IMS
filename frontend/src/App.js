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
import StudentBilling from "./components/StudentBilling";
import BillingManagement from "./pages/BillingManagement";  
import { useState, useEffect } from "react"; 
import API from "./api/api";
import LoadingScreen from "./components/LoadingScreen";
function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Fetch the logged-in user so 'user' isn't undefined
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await API.get("/user");
        setUser(res.data);
      } catch (err) {
        setUser(null);
      }finally {
        setTimeout(() => setAuthLoading(false), 500);
      }
    };
    fetchUser();
  }, []);

if (authLoading) {
    return <LoadingScreen />;
  }



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

        <Route path="/students" 
        element={
          <ProtectedRoute roles={["admin", "registrar"]}>
            <StudentRecords />
          </ProtectedRoute>
        }
         />


        <Route path="/teachers" 
        element={
          <ProtectedRoute roles={["admin", "registrar"]}>
            <TeacherDirectory />
          </ProtectedRoute>
        } 
        />
        <Route path="/section-management" 
        element={
          <ProtectedRoute roles={["admin", "registrar"]}>
            <SectionManagement />
          </ProtectedRoute>
        } />
        <Route path="/load-slips" 
        element={
          <ProtectedRoute roles={["admin", "registrar"]}>
            <LoadSlip />
          </ProtectedRoute>
        } />


        {/* Catch-all route for any other invalid URLs */}
        <Route path="*" element={<NotFound />} />

        <Route 
          path="/admin/billing"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <BillingManagement user={user} />
            </ProtectedRoute>
          } 
        />



      </Routes>

      
    </Router>
  );
}

export default App;
