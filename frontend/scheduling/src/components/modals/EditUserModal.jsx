import { useState, useEffect } from "react";
import Swal from "sweetalert2";

function EditUserModal({ show, onClose, onSuccess, user }) {
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

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        password: "",
  role: user.role || "teacher",
        studentId: user.studentId || "",
        employeeId: user.employeeId || "",
        course: user.course || "",
        yearLevel: user.yearLevel || "",
        status: user.status || "active",
        honorific: user.honorific || "",
        employmentType: user.employmentType || "full-time", // Load employment type
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const updateData = { ...formData };

      // Remove password if empty
      if (!updateData.password) {
        delete updateData.password;
      }

      // Remove empty string values that could cause validation errors
      Object.keys(updateData).forEach((key) => {
        if (
          updateData[key] === "" ||
          updateData[key] === null ||
          updateData[key] === undefined
        ) {
          delete updateData[key];
        }
      });

      // Clean up role-specific fields based on current role
      if (updateData.role === "teacher" || updateData.role === "admin") {
        // Remove non-employee fields
        delete updateData.studentId;
        delete updateData.course;
        delete updateData.yearLevel;
        // Remove honorific/employmentType for admins
        if (updateData.role === "admin") {
          delete updateData.honorific;
          delete updateData.employmentType;
        }
      } else {
        // If the role becomes something else (non-employee), remove employee fields
        delete updateData.employeeId;
        delete updateData.honorific;
        delete updateData.employmentType;
      }

      console.log("Updating user with data:", updateData);
      console.log("Selected user ID:", user._id);

      const res = await fetch(`https://school-scheduling-system-production.up.railway.app/api/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const result = await res.json();
      console.log("Server response:", result);

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "User Updated!",
          text: "User updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        onSuccess();
        onClose();
      } else {
        console.error("Update failed:", result);
        Swal.fire({
          icon: "error",
          title: "Error Updating User",
          text: result.message || "Failed to update user",
          confirmButtonColor: "#3B82F6",
        });
      }
    } catch (error) {
      console.error("Update user error:", error);
      Swal.fire({
        icon: "error",
        title: "Server Error",
        text: error.message,
        confirmButtonColor: "#3B82F6",
      });
    }
  };

  if (!show || !user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Edit User</h2>
          <button onClick={onClose} className="modal-close">
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
            <label className="form-label">
              Password (leave empty to keep current)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              className="form-input"
              placeholder="Enter new password or leave empty"
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
              onClick={onClose}
              className="action-btn secondary"
            >
              Cancel
            </button>
            <button type="submit" className="action-btn primary">
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditUserModal;