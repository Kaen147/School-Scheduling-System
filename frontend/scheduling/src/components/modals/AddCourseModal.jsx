import { useState } from "react";
import Swal from "sweetalert2";

function AddCourseModal({ show, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const parseResponseSafe = async (response) => {
    try {
      return await response.json();
    } catch (err) {
      try {
        const txt = await response.text();
        return { message: txt || response.statusText };
      } catch {
        return { message: response.statusText || `HTTP ${response.status}` };
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.abbreviation.trim()) {
      Swal.fire({
        icon: "error",
        title: "Missing Fields",
        text: "Name and abbreviation are required.",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          abbreviation: formData.abbreviation.trim().toUpperCase(),
          description: formData.description?.trim() || "",
        }),
      });

      if (!response.ok) {
        const parsed = await parseResponseSafe(response);
        const message = parsed?.message || `Failed to create course (status ${response.status})`;
        Swal.fire({
          icon: "error",
          title: "Error Adding Course",
          text: message,
          confirmButtonColor: "#3B82F6",
        });
        return;
      }

      // success
      Swal.fire({
        icon: "success",
        title: "Course Added!",
        text: "Course created successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
      onSuccess && onSuccess();
      onClose && onClose();
      setFormData({ name: "", abbreviation: "", description: "" });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "An unexpected error occurred.",
        confirmButtonColor: "#3B82F6",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", abbreviation: "", description: "" });
    setLoading(false);
    onClose && onClose();
  };

  if (!show) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true">
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
          <div className="modal-header">
            <h2>Add Course</h2>
            <button onClick={handleClose} className="modal-close" aria-label="Close">✕</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Course Name <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Bachelor of Science in Information Technology"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Abbreviation <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  name="abbreviation"
                  value={formData.abbreviation}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g., BSIT"
                  maxLength={10}
                  required
                  style={{ textTransform: "uppercase" }}
                />
                <small style={{ color: "#6b7280" }}>Short code for the course (max 10 characters)</small>
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-textarea"
                  rows={4}
                  placeholder="Brief description..."
                />
              </div>
            </div>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={handleClose} className="action-btn secondary" disabled={loading}>Cancel</button>
              <button type="submit" className="action-btn primary" disabled={loading}>{loading ? "Creating..." : "Add Course"}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default AddCourseModal;
