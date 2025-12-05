// src/components/NavBarTeacher.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./NavBarTeacher.css";
import { FaHome, FaBook, FaClock, FaSignOutAlt } from "react-icons/fa";
import bcLogo from "../assets/BC Logo.png";

export default function NavBarTeacher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user || user.role !== "teacher") return null;

  const navLinks = [
    { path: "/teacher/dashboard", label: "Dashboard", icon: <FaHome /> },
    { path: "/teacher/subjects", label: "Subjects", icon: <FaBook /> },
    { path: "/teacher/schedules", label: "Schedules", icon: <FaClock /> },
  ];

  return (
    <aside className="teacher-sidebar" aria-label="Teacher navigation">
      {/* Header */}
      <div className="sidebar-header">
        <img src={bcLogo} alt="BC Logo" className="sidebar-logo" />
        <h2 className="sidebar-title">Benedicto College</h2>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`sidebar-link ${
              location.pathname === link.path ? "active" : ""
            }`}
            aria-current={location.pathname === link.path ? "page" : undefined}
          >
            <span className="icon">{link.icon}</span>
            <span className="label">{link.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          className="logout-btn"
          aria-label="Logout"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
        <div className="footer-note">
          © {new Date().getFullYear()} BC Teacher Panel
        </div>
      </div>
    </aside>
  );
}