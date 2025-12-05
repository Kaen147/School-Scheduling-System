import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import axios from "axios";
import NavBarTeacher from "../components/NavBarTeacher";
import TeacherSubjects from "./TeacherSubjects";
import TeacherSchedule from "./TeacherSchedule";
import { FaBook, FaClock, FaLayerGroup } from "react-icons/fa";
import "./TeacherDashboard.css";

function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Compute teacherId early and consistently
  const teacherId = user?.id || user?._id;

  const defaultAvatar =
    "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZWRlZWVmIiB2aWV3Qm94PSIwIDAgMjQwIDI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMjAiIGN5PSIxMjAiIHI9IjEyMCIvPjxjaXJjbGUgY3g9IjEyMCIgY3k9Ijk2IiByPSI0MCIgZmlsbD0iI2Q2ZDJkNyIvPjxwYXRoIGQ9Ik0xMjAgMTQ0Yy00OCAwLTgwIDM2LTgwIDg4aDE2MGMwLTUyLTMyLTg4LTgwLTg4eiIgZmlsbD0iI2M1YzZjOCIvPjwvc3ZnPg==";

  const [profileImage, setProfileImage] = useState(
    user?.profileImage || defaultAvatar
  );
  const [activeTab, setActiveTab] = useState("dashboard");

  const [subjectCount, setSubjectCount] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [assignmentUnits, setAssignmentUnits] = useState(0);  // Units from assignments (for availability)
  const [scheduleUnits, setScheduleUnits] = useState(0);      // Units from actual schedule events (for reporting)
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  const parseHMToMinutes = (t) => {
    if (!t || typeof t !== "string") return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  useEffect(() => {
    const teacherId = user?.id || user?._id;
    if (!teacherId) return;

    let alive = true;
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError("");

      try {
        // Try workload API first for authoritative totals
        let workloadData = null;
        try {
          const wlRes = await axios.get(`http://localhost:5000/api/workload/teacher/${teacherId}`, { signal });
          if (wlRes && wlRes.data) {
            // Response is wrapped in { success, data: {...} }
            workloadData = wlRes.data.data || wlRes.data;
          }
        } catch (err) {
          if (axios.isCancel(err)) return;
          // Ignore workload API errors and fall back to offerings computation
        }

        let assignmentUnitsTotal = 0;
        let scheduleUnitsTotal = 0;
        let teacherSubjects = [];

        if (workloadData && workloadData.totalAssignmentUnits !== undefined) {
          // Use workload API data (which separates assignment vs schedule units)
          assignmentUnitsTotal = workloadData.totalAssignmentUnits || 0;
          scheduleUnitsTotal = workloadData.totalScheduleUnits || 0;
          teacherSubjects = workloadData.teachingAssignments || [];
        } else {
          // Fallback: fetch offerings (which have assignedTeachers) and compute assigned subjects/units locally
          const offRes = await axios.get("http://localhost:5000/api/offerings", { signal });
          const allOfferings = Array.isArray(offRes.data) ? offRes.data : [];

          // Filter offerings to those assigned to this teacher
          teacherSubjects = allOfferings.filter((offering) => {
            const at = offering.assignedTeachers || [];
            return at.some((t) => {
              let tid = t?.teacherId;
              if (tid && typeof tid === 'object') {
                tid = tid._id || tid.id;
              }
              return String(tid) === String(teacherId);
            });
          });

          // ASSIGNMENT UNITS: Sum of all subject units (regardless of schedule)
          assignmentUnitsTotal = teacherSubjects.reduce(
            (acc, o) => acc + (Number(o.subjectId?.lectureUnits) || 0) + (Number(o.subjectId?.labUnits) || 0),
            0
          );

          // Calculate SCHEDULE UNITS from schedule events
          const schedRes = await axios.get(`http://localhost:5000/api/schedules/by-teacher/${teacherId}`, { signal });
          const schedules = Array.isArray(schedRes.data) ? schedRes.data : [];

          let totalMinutes = 0;
          schedules.forEach((sched) => {
            (sched.events || []).forEach((ev) => {
              totalMinutes += Math.max(0, parseHMToMinutes(ev.endTime) - parseHMToMinutes(ev.startTime));
              
              // Add to schedule units (each event contributes subject units)
              if (ev.subjectId && ev.subjectId.lectureUnits) {
                scheduleUnitsTotal += (ev.subjectId.lectureUnits || 0) + (ev.subjectId.labUnits || 0);
              }
            });
          });

          setTotalHours(Math.round((totalMinutes / 60) * 10) / 10);
        }

        if (!alive) return;
        setSubjectCount(teacherSubjects.length);
        setAssignmentUnits(assignmentUnitsTotal);
        setScheduleUnits(scheduleUnitsTotal);
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Teacher stats error:", err);
        if (alive) setStatsError("Failed to load stats.");
      } finally {
        if (alive) setStatsLoading(false);
      }
    };

    fetchStats();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileImage(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("profileImage", file);

      const res = await axios.post(
        `http://localhost:5000/api/teachers/${user._id}/upload-profile`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.imageUrl) {
        setProfileImage(`http://localhost:5000${res.data.imageUrl}`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload profile image. Try again.");
    }
  };

  return (
    <div className="teacher-dashboard">
      <NavBarTeacher
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="teacher-main">
        <header className="teacher-header">
          <h2>
            Welcome{" "}
            <strong>
              {user?.honorific} {user?.firstName} {user?.lastName}
            </strong>
          </h2>
        </header>

        {activeTab === "dashboard" && (
          <section className="dashboard-section">
            <div className="dashboard-wrapper">
              {/* Profile Card */}
              <div className="profile-card">
                <label htmlFor="profileUpload" className="profile-photo">
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="profile-img"
                  />
                  <div className="upload-overlay">
                    <span>📷</span>
                    <span>Update Photo</span>
                  </div>
                </label>
                <input
                  id="profileUpload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  hidden
                />
                <div className="profile-details">
                  <div className="profile-header">
                    <h2 className="profile-name">
                      {user?.honorific} {user?.firstName} {user?.lastName}
                    </h2>
                    <span className={`status-badge ${user?.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                      <span className="status-dot"></span>
                      {user?.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="profile-info-grid">
                    <div className="info-item">
                      <span className="info-label">Department</span>
                      <span className="info-value">{user?.department || "Not Assigned"}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Employee ID</span>
                      <span className="info-value">{user?.employeeId || "Not Assigned"}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Employment Type</span>
                      <span className="info-value">{user?.employmentType || "Not Specified"}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{user?.email || "Not Available"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="stats-container">
                <div className="stat-box">
                  <FaBook className="stat-icon" />
                  <div>
                    <h3>{statsLoading ? "…" : subjectCount}</h3>
                    <p>Subjects Assigned</p>
                  </div>
                </div>
                <div className="stat-box">
                  <FaClock className="stat-icon stat-icon-blue" />
                  <div>
                    <h3>{statsLoading ? "…" : totalHours}</h3>
                    <p>Hours / Week</p>
                  </div>
                </div>
                <div className="stat-box">
                  <FaLayerGroup className="stat-icon stat-icon-green" />
                  <div>
                    <h3>{statsLoading ? "…" : assignmentUnits}</h3>
                    <p>Assignment Units</p>
                  </div>
                </div>
                <div className="stat-box">
                  <FaLayerGroup className="stat-icon stat-icon-green" />
                  <div>
                    <h3>{statsLoading ? "…" : scheduleUnits}</h3>
                    <p>Schedule Units</p>
                  </div>
                </div>
              </div>

              {statsError && <div className="stats-error">{statsError}</div>}
            </div>
          </section>
        )}

        {activeTab === "subjects" && teacherId && (
          <TeacherSubjects teacherId={teacherId} />
        )}
        {activeTab === "schedule" && teacherId && (
          <TeacherSchedule teacherId={teacherId} />
        )}
      </main>
    </div>
  );
}

export default TeacherDashboard;
