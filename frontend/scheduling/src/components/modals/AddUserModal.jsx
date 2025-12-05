import { useState } from "react";
import Swal from "sweetalert2";

function AddUserModal({ show, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "teacher",
    studentId: "",
    employeeId: "",
    course: "",
    yearLevel: "",
    status: "active",
    honorific: "",
    employmentType: "full-time", // Add employment type field
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "teacher",
      studentId: "",
      employeeId: "",
      course: "",
      yearLevel: "",
      status: "active",
      honorific: "",
      employmentType: "full-time", // Reset employment type
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        status: formData.status,
      };

      // Add role-specific fields for employee roles
      if (formData.role === "teacher" || formData.role === "admin") {
        registrationData.employeeId = formData.employeeId.trim();
        // Only add honorific for teachers
        if (formData.role === "teacher" && formData.honorific) {
          registrationData.honorific = formData.honorific;
        }
        // Add employment type for teachers
        if (formData.role === "teacher") {
          registrationData.employmentType = formData.employmentType;
        }
      }

      const res = await fetch("http://localhost:5000/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });

      const result = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "User Added!",
          text: "User created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        resetForm();
        onSuccess();
        onClose();
      } else {
        Swal.fire({
          icon: "error",
          title: "Error Adding User",
          text: result.message || "Failed to add user",
          confirmButtonColor: "#3B82F6",
        });
      }
    } catch (error) {
      console.error("Add user error:", error);
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: error.message,
        confirmButtonColor: "#3B82F6",
      });
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Add New User</h2>
          <button onClick={handleClose} className="modal-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value }))
              }
              required
              className="form-select"
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {/* Honorific for Teachers only */}
          {formData.role === "teacher" && (
            <div className="form-group">
              <label className="form-label">Honorific *</label>
              <select
                value={formData.honorific || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    honorific: e.target.value,
                  }))
                }
                required
                className="form-select"
              >
                <option value="">Select honorific...</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Prof.">Prof.</option>
                <option value="Dr.">Dr.</option>
              </select>
            </div>
          )}

          {/* Employment Type for Teachers only */}
          {formData.role === "teacher" && (
            <div className="form-group">
              <label className="form-label">Employment Type *</label>
              <select
                value={formData.employmentType || "full-time"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    employmentType: e.target.value,
                  }))
                }
                required
                className="form-select"
              >
                <option value="full-time">Full-time (24 units max)</option>
                <option value="part-time">Part-time (18 units max)</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  firstName: e.target.value,
                }))
              }
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  lastName: e.target.value,
                }))
              }
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              required
              className="form-input"
            />
          </div>

          {/* Student functionality disabled - student fields removed */}

          {/* Teacher/Admin-specific fields */}
          {(formData.role === "teacher" || formData.role === "admin") && (
            <>
              <div className="form-group">
                <label className="form-label">Employee ID (Format: 0000-00000) *</label>
                <input
                  type="text"
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
                    setFormData((prev) => ({
                      ...prev,
                      employeeId: value,
                    }))
                  }}
                  placeholder="0000-00000"
                  maxLength="10"
                  className="form-input"
                  pattern="^\d{4}-\d{5}$"
                  title="Employee ID must be in format: 0000-00000"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value }))
              }
              className="form-select"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="form-buttons">
            <button
              type="button"
              onClick={handleClose}
              className="action-btn secondary"
            >
              Cancel
            </button>
            <button type="submit" className="action-btn success">
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUserModal;