import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthContext";
import "./Login.css";
import bcLogo from "../assets/BC Logo.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Register modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [formData, setFormData] = useState({
    honorific: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
    role: "teacher",
    studentId: "",
    course: "",
    yearLevel: "",
    employeeId: "",
  });
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (formData.confirm && formData.password !== formData.confirm) {
      setPasswordError("Passwords do not match");
    } else {
      setPasswordError("");
    }
  }, [formData.password, formData.confirm]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ===== Enhanced Alert Helper =====
  const showAlert = (type, title, text, timer = 1800) => {
    const colors = {
      success: "#3b82f6",
      error: "#ef4444",
      info: "#0ea5e9",
      warning: "#f59e0b",
    };

    Swal.fire({
      icon: type,
      title: `<span style="font-weight:700; font-size:1.25rem;">${title}</span>`,
      html: `<div style="font-size:0.95rem; color:#475569;">${text}</div>`,
      background: "#ffffff",
      color: "#0f172a",
      showConfirmButton: type === "error",
      confirmButtonColor: colors[type] || "#3b82f6",
      timer: type === "success" ? timer : undefined,
      timerProgressBar: type === "success",
      customClass: {
        popup: "animated fadeInDown faster",
      },
    });
  };

  // ===== Login Function =====
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      showAlert(
        "error",
        "Missing Fields",
        "Please enter both email and password."
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(
          "error",
          "Login Failed",
          data.message || "Invalid email or password."
        );
        return;
      }

      // Store user via context
      login(data.user);

      // Success Alert
      Swal.fire({
        icon: "success",
        title: `<span style="font-weight:700; font-size:1.25rem;">Welcome, ${data.user.firstName}!</span>`,
        html: `<div style="font-size:0.95rem; color:#475569;">Login successful. Redirecting to your dashboard...</div>`,
        background: "#ffffff",
        color: "#0f172a",
        showConfirmButton: false,
        timer: 1600,
        timerProgressBar: true,
        didOpen: () => {
          const popup = Swal.getPopup();
          popup.style.borderRadius = "16px";
          popup.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
        },
      });

      const role = data.user.role;
      setTimeout(() => {
        if (role === "admin") navigate("/admin");
        else if (role === "teacher") navigate("/teacher");
  // Student role no longer supported; no student redirect
        else
          showAlert(
            "error",
            "Unknown Role",
            "Please contact the administrator."
          );
      }, 1600);
    } catch (err) {
      showAlert(
        "error",
        "Network Error",
        "Please check your internet connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Registration =====
  const handleRegister = async (e) => {
    e.preventDefault();

    // Basic validations
    if (!formData.firstName.trim())
      return showAlert("error", "Error", "First name is required.");
    if (!formData.lastName.trim())
      return showAlert("error", "Error", "Last name is required.");
    if (!formData.email.trim())
      return showAlert("error", "Error", "Email is required.");
    if (!formData.password)
      return showAlert("error", "Error", "Password is required.");
    if (passwordError) return showAlert("error", "Error", passwordError);

    // Role-specific checks for employee roles
    if (formData.role === "teacher" || formData.role === "admin") {
      if (!formData.employeeId.trim())
        return showAlert("error", "Error", "Employee ID is required.");
    }

    try {
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        status: "active",
        // student-specific fields removed
        honorific: formData.honorific,
        employeeId: formData.employeeId.trim(),
      };

      const res = await fetch("http://localhost:5000/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(
          "error",
          "Registration Failed",
          data.message || "Please try again."
        );
        return;
      }

      Swal.fire({
        icon: "success",
        title: `<span style="font-weight:700; font-size:1.25rem;">Registration Successful!</span>`,
        html: `<div style="font-size:0.95rem; color:#475569;">You can now log in with your credentials.</div>`,
        background: "#ffffff",
        color: "#0f172a",
        timer: 1800,
        showConfirmButton: false,
        timerProgressBar: true,
      });

      setIsRegisterOpen(false);
      setFormData({
        honorific: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirm: "",
        role: "student",
        studentId: "",
        course: "",
        yearLevel: "",
        employeeId: "",
      });
    } catch (error) {
      showAlert(
        "error",
        "Error",
        "An unexpected error occurred. Please try again."
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <img src={bcLogo} alt="BC Logo" className="auth-logo" />
          <h1 className="auth-title">School Scheduling System</h1>
          <p className="auth-subtitle">Welcome to Benedicto College</p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Sign in</h2>
            <p className="auth-card-subtitle">Access your account below</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-row">
              <input
                className="input-field with-left-icon"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="input-row">
              <input
                className="input-field with-left-icon"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <button
              className="submit-button"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>

            <div className="auth-footer">
              <span>Don't have an account? </span>
              <Link
                className="auth-link"
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsRegisterOpen(true);
                }}
              >
                Register
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Register Modal */}
      {isRegisterOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ margin: "auto", fontWeight: 700 }}>Register</h3>
              <button
                className="modal-close"
                aria-label="Close"
                onClick={() => setIsRegisterOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="auth-form" onSubmit={handleRegister}>
              <select
                className="input-field"
                value={formData.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Administrator</option>
              </select>

              {formData.role === "teacher" && (
                <select
                  className="input-field"
                  value={formData.honorific}
                  onChange={(e) =>
                    handleInputChange("honorific", e.target.value)
                  }
                >
                  <option value="">Honorific *</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              )}

              <input
                className="input-field"
                type="text"
                placeholder="First Name *"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
              />
              <input
                className="input-field"
                type="text"
                placeholder="Last Name *"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
              />
              <input
                className="input-field"
                type="email"
                placeholder="Email *"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
              />

              {/* Student registration disabled */}

              {(formData.role === "teacher" || formData.role === "admin") && (
                <>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Employee ID (0000-00000) *"
                    value={formData.employeeId}
                    onChange={(e) => {
                      // Remove all non-digit characters
                      let value = e.target.value.replace(/[^0-9]/g, "");
                      // Limit to 9 digits total
                      value = value.substring(0, 9);
                      // Auto-format: 0000-00000
                      if (value.length > 4) {
                        value = value.substring(0, 4) + "-" + value.substring(4);
                      }
                      handleInputChange("employeeId", value);
                    }}
                    maxLength="10"
                    pattern="^\d{4}-\d{5}$"
                    title="Employee ID must be in format: 0000-00000"
                  />
                </>
              )}

              <input
                className="input-field"
                type="password"
                placeholder="Password *"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
              <input
                className="input-field"
                type="password"
                placeholder="Confirm Password *"
                value={formData.confirm}
                onChange={(e) => handleInputChange("confirm", e.target.value)}
              />
              {passwordError && <p className="error-text">{passwordError}</p>}
              <button className="submit-button" type="submit">
                Register
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
