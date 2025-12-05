// src/components/NavBarAdmin.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./NavBarAdmin.css";
import {
  FaUserTie,
  FaBook,
  FaClock,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaSignOutAlt,
  FaHome,
} from "react-icons/fa";
import bcLogo from "../assets/BC Logo.png";

export default function NavBarAdmin() {
  const [teachers, setTeachers] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();


  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!user || user.role !== "admin") return null;

  const navLinks = [
    { path: "/admin-dashboard", label: "Dashboard", icon: <FaHome /> },
    { path: "/courses", label: "Courses", icon: <FaChalkboardTeacher /> },
    { path: "/users", label: "Users", icon: <FaUserTie /> },
    { path: "/subjects", label: "Subjects", icon: <FaBook /> },
    { path: "/rooms", label: "Rooms", icon: <FaDoorOpen /> },
    { path: "/schedules", label: "Schedules", icon: <FaClock /> },
  ];

  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      {/* Header */}
      <div className="sidebar-header">
        <img
          src={bcLogo}
          alt="Benedicto College Logo"
          className="sidebar-logo"
        />
        <h2 className="sidebar-title">Benedicto College</h2>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav" aria-label="Main navigation">
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

      {/* Footer / logout */}
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
          © {new Date().getFullYear()} BC Admin Panel
        </div>
      </div>
    </aside>
  );
}
