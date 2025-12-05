import { useState, useEffect } from "react";
import Swal from "sweetalert2";

function EditCourseModal({ show, onClose, onSuccess, course }) {
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState(null);

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name || "",
        abbreviation: course.abbreviation || "",
        description: course.description || "",
      });
    }
  }, [course]);

  // Check if course has subjects before allowing deletion
  useEffect(() => {
    if (course && showDeleteConfirm) {
      checkCourseUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, showDeleteConfirm]);

  // Helper to parse server response safely (try JSON, fallback to text)
  const parseResponseSafe = async (response) => {
    try {
      // try parsing JSON first
      const json = await response.json();
      return json;
    } catch (jsonErr) {
      // not JSON — get plain text
      try {
        const txt = await response.text();
        return {
          message: txt || response.statusText || `HTTP ${response.status}`,
        };
      } catch (txtErr) {
        return { message: response.statusText || `HTTP ${response.status}` };
      }
    }
  };

  const checkCourseUsage = async () => {
    if (!course?._id) return;
    try {
      const response = await fetch(
        `https://school-scheduling-system-production.up.railway.app/api/courses/${course._id}/usage`,
        { headers: { Accept: "application/json" } }
      );

      if (!response.ok) {
        const parsed = await parseResponseSafe(response);
        // If server returned non-critical info, just set warning with parsed.message
        setDeleteWarning({
          type: "error",
          message: parsed?.message || `Server returned ${response.status}`,
        });
        return;
      }

      const data = await parseResponseSafe(response);
      // Expecting { hasSubjects: boolean, subjectCount: number }
      if (data && data.hasSubjects) {
        setDeleteWarning({
          type: "subjects",
          count: data.subjectCount,
          message: `This course has ${data.subjectCount} subject(s) assigned to it.`,
        });
      } else {
        setDeleteWarning(null);
      }
    } catch (err) {
      console.error("Error checking course usage:", err);
      setDeleteWarning({
        type: "error",
        message: "Unable to check course usage. Try again later.",
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!course?._id) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Course not selected",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://school-scheduling-system-production.up.railway.app/api/courses/${course._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            abbreviation: formData.abbreviation.trim().toUpperCase(),
            description: formData.description.trim(),
          }),
        }
      );

      if (!response.ok) {
        const parsed = await parseResponseSafe(response);
        // parsed may be an object or {message: "..."}
        const message =
          (parsed && parsed.message) ||
          parsed?.error ||
          parsed?.errors?.[0]?.msg ||
          `Failed to update course (status ${response.status})`;
        Swal.fire({
          icon: "error",
          title: "Error Updating Course",
          text: message,
          confirmButtonColor: "#3B82F6",
        });
        return;
      }

      // success
      Swal.fire({
        icon: "success",
        title: "Course Updated!",
        text: "Course updated successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
      onSuccess && onSuccess();
      onClose && onClose();
      resetForm();
    } catch (err) {
      // err may be Error or string
      const errorMessage = err?.message || String(err);
      Swal.fire({
        icon: "error",
        title: "Error Updating Course",
        text: errorMessage,
        confirmButtonColor: "#3B82F6",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!course?._id) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Course not selected",
        confirmButtonColor: "#3B82F6",
      });
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to permanently delete this course?"
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://school-scheduling-system-production.up.railway.app/api/courses/${course._id}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        const parsed = await parseResponseSafe(response);
        const message =
          (parsed && parsed.message) ||
          parsed?.error ||
          `Failed to delete course (status ${response.status})`;
        Swal.fire({
          icon: "error",
          title: "Error Deleting Course",
          text: message,
          confirmButtonColor: "#3B82F6",
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: "Course Deleted!",
        text: "Course deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
      onSuccess && onSuccess();
      onClose && onClose();
      setShowDeleteConfirm(false);
      resetForm();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error Deleting Course",
        text: err?.message || String(err),
        confirmButtonColor: "#3B82F6",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      abbreviation: "",
      description: "",
    });
    setShowDeleteConfirm(false);
    setDeleteWarning(null);
  };

  const handleClose = () => {
    resetForm();
    onClose && onClose();
  };

  if (!show) return null;

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Course</h2>
          <button onClick={handleClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        {showDeleteConfirm ? (
          <div className="delete-confirm-section">
            <div className="warning-message">
              <span className="warning-icon">⚠️</span>
              <div>
                <h3>Confirm Deletion</h3>
                <p>
                  Are you sure you want to delete{" "}
                  <strong>
                    {course?.name} ({course?.abbreviation})
                  </strong>
                  ?
                </p>

                {deleteWarning && deleteWarning.type === "subjects" && (
                  <div className="deletion-warning">
                    <p className="warning-note">
                      <strong>⚠️ Warning:</strong> {deleteWarning.message}
                    </p>
                    <p className="warning-note">
                      All associated subjects and their data will be permanently
                      removed. This action cannot be undone.
                    </p>
                  </div>
                )}

                {deleteWarning && deleteWarning.type === "error" && (
                  <p className="warning-note">
                    <strong>Notice:</strong> {deleteWarning.message}
                  </p>
                )}

                {!deleteWarning && (
                  <p className="warning-note">
                    This action cannot be undone. All data associated with this
                    course will be permanently removed.
                  </p>
                )}
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="action-btn secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="action-btn danger"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete Course"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  Course Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Bachelor of Science in Computer Science"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Abbreviation <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="abbreviation"
                  value={formData.abbreviation}
                  onChange={handleChange}
                  placeholder="e.g., BSCS"
                  className="form-input"
                  maxLength="10"
                  required
                  style={{ textTransform: "uppercase" }}
                />
                <small className="form-hint">
                  Short code for the course (max 10 characters)
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of the course..."
                  className="form-textarea"
                  rows="4"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="action-btn danger"
                disabled={loading}
              >
                🗑️ Delete
              </button>
              <div className="action-buttons-right">
                <button
                  type="button"
                  onClick={handleClose}
                  className="action-btn secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn primary"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        )}
        </div>
      </div>
    </>
  );
}

export default EditCourseModal;
