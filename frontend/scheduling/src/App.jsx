// src/App.jsx
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import CoursesPage from "./pages/Courses";
import UserManagement from "./pages/UserManagement";
import SubjectManagement from "./pages/SubjectManagement";
import RoomManagement from "./pages/RoomManagement";
import SchedulesManagement from "./pages/SchedulesManagement";
import AdminLayout from "./components/AdminLayout";

// Teacher pages
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherSubjectsPage from "./pages/TeacherSubjects";
import TeacherSchedule from "./pages/TeacherSchedule";
import TeacherLayout from "./components/TeacherLayout";

// Wrapper to pass teacherId from context to TeacherSubjects standalone route
function TeacherSubjectsWrapper() {
  const { user } = useAuth();
  const teacherId = user?.id || user?._id;
  return <TeacherSubjectsPage teacherId={teacherId} />;
}

// Wrapper for viewing any teacher's schedule by ID (for admin use)
function TeacherScheduleViewer() {
  const { teacherId } = useParams();
  return <TeacherSchedule teacherId={teacherId} />;
}

// Misc
import WeeklyTimetable from "./pages/timetable";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Redirect /admin → /admin-dashboard */}
        <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />

        {/* Admin Routes */}
        <Route
          path="/admin-dashboard"
          element={
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          }
        />
        <Route
          path="/courses"
          element={
            <AdminLayout>
              <CoursesPage />
            </AdminLayout>
          }
        />
        <Route
          path="/users"
          element={
            <AdminLayout>
              <UserManagement />
            </AdminLayout>
          }
        />
        <Route
          path="/subjects"
          element={
            <AdminLayout>
              <SubjectManagement />
            </AdminLayout>
          }
        />
        <Route
          path="/rooms"
          element={
            <AdminLayout>
              <RoomManagement />
            </AdminLayout>
          }
        />
        <Route
          path="/schedules"
          element={
            <AdminLayout>
              <SchedulesManagement />
            </AdminLayout>
          }
        />

        // In App.js - update the timetable routes
        <Route
          path="/timetable"
          element={
            <AdminLayout>
              <WeeklyTimetable mode="create" />
            </AdminLayout>
          }
        />
        <Route
          path="/timetable/view/:id"
          element={
            <AdminLayout>
              <WeeklyTimetable mode="view" />
            </AdminLayout>
          }
        />
        <Route
          path="/timetable/edit/:id"
          element={
            <AdminLayout>
              <WeeklyTimetable mode="edit" />
            </AdminLayout>
          }
        />

        {/* Teacher Schedule Viewer - for admin to view any teacher's schedule */}
        <Route
          path="/teacher-schedule/:teacherId"
          element={
            <AdminLayout>
              <TeacherScheduleViewer />
            </AdminLayout>
          }
        />

        {/* Teacher Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="subjects" element={<TeacherSubjectsWrapper />} />
          <Route path="schedules" element={<TeacherSchedule />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
