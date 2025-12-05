import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { showCreateScheduleModal } from "../components/modals/CreateScheduleModal";
import axios from "axios";
import "../components/NavBarAdmin.css";
import "./AdminDashboard.css";

function AdminDashboard() {
  const { user, loading } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const teachersRes = await fetch(
        "https://school-scheduling-system-production.up.railway.app/api/users/teachers"
      );
      const teachersData = await teachersRes.json();
      setTeachers(teachersData);

      // Student listing removed (student functionality disabled)

      const coursesRes = await axios.get("https://school-scheduling-system-production.up.railway.app/api/courses");
      setCourses(coursesRes.data);

      const schedulesRes = await axios.get(
        "https://school-scheduling-system-production.up.railway.app/api/schedules"
      );
      setSchedules(schedulesRes.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  const handleCreateSchedule = () => {
    showCreateScheduleModal(courses, navigate);
  };

  if (loading) return <p className="loading-text">Loading...</p>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="admin-dashboard">
      <div className="admin-main-content">
        <div className="main-content">
          <p className="welcome-text">
            Welcome{" "}
            {`${user.honorific || ""} ${user.firstName || ""} ${
              user.lastName || ""
            }`}
          </p>

          {/* === Stats Section === */}
          <div className="stats-section">
            {/* Stats Row */}
            <div className="action-cards-grid stats-row">
              <div className="action-card stats-card">
                <h3>Total Teachers</h3>
                <p className="stat-number">{teachers.length}</p>
                <button
                  onClick={() => navigate("/users")}
                  className="action-btn secondary"
                >
                  Manage Teachers
                </button>
              </div>

              <div className="action-card stats-card">
                <h3>Total Courses</h3>
                <p className="stat-number">{courses.length}</p>
                <button
                  onClick={() => navigate("/courses")}
                  className="action-btn secondary"
                >
                  Manage Courses
                </button>
              </div>

              <div className="action-card stats-card">
                <h3>Active Schedules</h3>
                <p className="stat-number">{schedules.length}</p>
                <button
                  onClick={() => navigate("/schedules")}
                  className="action-btn secondary"
                >
                  View Schedules
                </button>
              </div>
            </div>
          </div>

          {/* === Quick Actions === */}
          <div className="action-cards-grid">
            <div className="action-card">
              <h3>Create New Schedule</h3>
              <p>
                Generate a class schedule for a specific course and year level
              </p>
              <button
                onClick={handleCreateSchedule}
                className="action-btn primary"
              >
                Create Schedule
              </button>
            </div>

            <div className="action-card">
              <h3>Manage Courses & Subjects</h3>
              <p>Add courses, subjects, and organize curriculum</p>
              <button
                onClick={() => navigate("/courses")}
                className="action-btn primary"
              >
                Go to Courses
              </button>
            </div>

            <div className="action-card">
              <h3>User Management</h3>
              <p>Manage teachers, students, and admin accounts</p>
              <button
                onClick={() => navigate("/users")}
                className="action-btn primary"
              >
                Manage Users
              </button>
            </div>
          </div>

          {/* End of content */}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;