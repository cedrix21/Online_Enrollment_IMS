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
import TeacherAdvisory from "./pages/TeacherAdvisory";
import EvaluationManagement from "./pages/EvaluationManagement";
import { useState, useEffect } from "react";
import API from "./api/api";
import LoadingScreen from "./components/LoadingScreen";
import SubjectManagement from "./pages/SubjectManagement";
import PaymentReports from "./pages/PaymentReports";
import EnrolledStudents from "./pages/EnrolledStudents";
import Form137 from "./pages/Form137";
import TuitionFeeManagement from "./pages/TuitionFeeManagement";  
import PaymentSuccess from "./pages/PaymentSuccess";


function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await API.get("/user");
        setUser(res.data);
      } catch (err) {
        setUser(null);
      } finally {
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

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

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

        <Route
          path="/students"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <StudentRecords />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subject-management"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <SubjectManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teachers"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <TeacherDirectory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/section-management"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <SectionManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/load-slips"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <LoadSlip />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher-advisory"
          element={
            <ProtectedRoute roles={["teacher"]}>
              <TeacherAdvisory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/evaluation"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <EvaluationManagement />
            </ProtectedRoute>
          }
        />

        

        <Route
          path="/admin/billing"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <BillingManagement user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment-reports"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <PaymentReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/enrolled-students"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <EnrolledStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/form137"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <Form137 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tuition-fees"
          element={
            <ProtectedRoute roles={["admin", "registrar"]}>
              <TuitionFeeManagement />
            </ProtectedRoute>
          }
        />
        <Route path="/enrollment/payment-success" element={<PaymentSuccess />} />

          {/* Catch-all route for any other invalid URLs */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
