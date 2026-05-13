import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,   
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Enrollment from "./pages/Enrollment";
import EnrollmentManagement from "./pages/EnrollmentManagement";
import ProtectedRoute from "./components/ProtectedRoute";
import EnrollmentQR from "./pages/EnrollmentQR";
import AdminEnrollment from "./pages/AdminEnrollment";
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
import ActivityLogs from "./pages/ActivityLogs";
import LockedUsers from "./pages/Admin/LockedUsers";
import Sidebar from "./components/SideBar";      
import TopBar from "./components/TopBar";        
import AdminSchoolYear from "./pages/AdminSchoolYear";
import ParentSetPassword from "./pages/ParentSetPassword";
import ParentDashboard from "./pages/ParentDashboard";


// ── Inline Layout Component ────────────────────────────────
function DashboardLayout() {
  return (
    <div className="main-layout">
      <Sidebar />
      <div className="page-wrapper">
        <TopBar />
        <div className="content-scroll-area">
          <Outlet />   
        </div>
      </div>
    </div>
  );
}

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
        {/* ── PUBLIC ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/enroll" element={<Enrollment />} />
        <Route path="/enrollment-qr" element={<EnrollmentQR />} />
        <Route path="/enrollment/payment-success" element={<PaymentSuccess />} />
        <Route path="/parent/set-password" element={<ParentSetPassword />} />
        <Route
          path="/parent-dashboard"
          element={
            <ProtectedRoute roles={["parent"]}>
              <ParentDashboard />
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

        {/* ── AUTHENTICATED (with sidebar + topbar) ── */}
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
         

          {/* ── Admin + Registrar ── */}
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
            path="/enrolled-students"
            element={
              <ProtectedRoute roles={["admin", "registrar"]}>
                <EnrolledStudents />
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
            path="/form137"
            element={
              <ProtectedRoute roles={["admin", "registrar"]}>
                <Form137 />
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
        

          {/* ── Admin only ── */}
          <Route
            path="/teachers"
            element={
              <ProtectedRoute roles={["admin"]}>
                <TeacherDirectory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/section-management"
            element={
              <ProtectedRoute roles={["admin"]}>
                <SectionManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject-management"
            element={
              <ProtectedRoute roles={["admin"]}>
                <SubjectManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/evaluation"
            element={
              <ProtectedRoute roles={["admin"]}>
                <EvaluationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tuition-fees"
            element={
              <ProtectedRoute roles={["admin"]}>
                <TuitionFeeManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/locked-users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <LockedUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activity-logs"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/school-year" element={
          <ProtectedRoute roles={["admin"]}>
            <AdminSchoolYear />
          </ProtectedRoute>
        } />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;