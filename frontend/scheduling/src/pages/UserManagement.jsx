import { useEffect, useState } from "react";
import axios from "axios";
import "../components/NavBarAdmin.css";
import "./UserManagement.css";
import AddUserModal from "../components/modals/AddUserModal";
import EditUserModal from "../components/modals/EditUserModal";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teacherUnits, setTeacherUnits] = useState({});

  // Filter states
  const [filters, setFilters] = useState({
    role: "",
    status: "",
    searchTerm: "",
  });

  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("https://school-scheduling-system-production.up.railway.app/api/users");

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const allUsers = await response.json();
      setUsers(allUsers);
      setFilteredUsers(allUsers);

      // Fetch assignment units for all teachers
      const teachers = allUsers.filter(u => u.role === 'teacher');
      const unitsMap = {};

      for (const teacher of teachers) {
        try {
          const teacherId = teacher.id || teacher._id;
          
          // Fetch offerings to calculate assignment units
          const offeringsRes = await axios.get("https://school-scheduling-system-production.up.railway.app/api/offerings");
          const allOfferings = Array.isArray(offeringsRes.data) ? offeringsRes.data : [];

          // Filter offerings assigned to this teacher
          const teacherOfferings = allOfferings.filter((offering) => {
            const at = offering.assignedTeachers || [];
            return at.some((t) => {
              let tid = t?.teacherId;
              if (tid && typeof tid === 'object') {
                tid = tid._id || tid.id;
              }
              return String(tid) === String(teacherId);
            });
          });

          // Calculate total assignment units
          const assignmentUnits = teacherOfferings.reduce(
            (acc, o) => acc + (Number(o.subjectId?.lectureUnits) || 0) + (Number(o.subjectId?.labUnits) || 0),
            0
          );

          unitsMap[teacherId] = assignmentUnits;
        } catch (err) {
          console.error(`Failed to fetch units for teacher ${teacher._id}:`, err);
          unitsMap[teacher.id || teacher._id] = 0;
        }
      }

      setTeacherUnits(unitsMap);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = users;

    if (filters.role) {
      filtered = filtered.filter((user) => user.role === filters.role);
    }

    if (filters.status) {
      filtered = filtered.filter((user) => user.status === filters.status);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(searchLower) ||
          user.lastName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.employeeId?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUsers(filtered);
  }, [users, filters]);

  // Handle edit user
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  // Handle view teacher schedule - open in new tab
  const handleViewSchedule = (teacher) => {
    const teacherId = teacher.id || teacher._id;
    const url = `/teacher-schedule/${teacherId}`;
    window.open(url, '_blank');
  };

  // Toggle user status
  const toggleUserStatus = async (user) => {
    const newStatus = user.status === "active" ? "inactive" : "active";

    try {
      const updateData = { status: newStatus };

      const res = await fetch(`https://school-scheduling-system-production.up.railway.app/api/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        alert(
          `User ${
            newStatus === "active" ? "activated" : "deactivated"
          } successfully!`
        );
        fetchUsers();
      } else {
        const result = await res.json();
        alert("Error: " + (result.message || "Failed to update user status"));
      }
    } catch (error) {
      console.error("Toggle status error:", error);
      alert("Server error: " + error.message);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${user.firstName} ${user.lastName}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`https://school-scheduling-system-production.up.railway.app/api/users/${user._id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("User deleted successfully!");
        fetchUsers();
      } else {
        const result = await res.json();
        alert("Error: " + (result.message || "Failed to delete user"));
      }
    } catch (error) {
      console.error("Delete user error:", error);
      alert("Server error: " + error.message);
    }
  };

  // Get user initials for avatar
  const getUserInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ""}${
      lastName?.charAt(0) || ""
    }`.toUpperCase();
  };

  // Get display name with honorific
  const getUserDisplayName = (user) => {
    if (user.role === "teacher" && user.honorific) {
      return `${user.honorific} ${user.firstName} ${user.lastName}`;
    }
    return `${user.firstName} ${user.lastName}`;
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      role: "",
      status: "",
      searchTerm: "",
    });
  };

  if (loading) {
    return (
      <div className="user-management-layout">
        <div className="user-management-main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-management-layout">
        <div className="user-management-main-content">
          <div className="error-container">
            <h3>Error Loading Users</h3>
            <p>{error}</p>
            <button onClick={fetchUsers} className="action-btn primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyFilter = Boolean(
    filters.searchTerm?.trim() || filters.role || filters.status
  );

  return (
    <div className="user-management-layout">
      <div className="user-management-main-content">
        {/* Header */}
        <div className="user-management-header">
          <h1>User Management</h1>
          <div className="header-buttons">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="action-btn success"
            >
              + Add User
            </button>
            <button onClick={fetchUsers} className="action-btn secondary">
              Refresh
            </button>
          </div>
        </div>

        {/* Controls and Filters */}
        <div className="user-controls-section">
          <div className="user-controls-grid">
            <div className="control-group">
              <label className="control-label">Search Users</label>
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    searchTerm: e.target.value,
                  }))
                }
                placeholder="Search by name, email, or ID..."
                className="control-input"
              />
            </div>

            <div className="control-group">
              <label className="control-label">Filter by Role</label>
              <select
                value={filters.role}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, role: e.target.value }))
                }
                className="control-select"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                {/* Student role removed */}
              </select>
            </div>

            <div className="control-group">
              <label className="control-label">Filter by Status</label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
                className="control-select"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="control-group">
              <button onClick={clearFilters} className="action-btn secondary">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {!hasAnyFilter ? (
          <div className="empty-state">
            <h3>Filter to view users</h3>
            <p>Use the search and filters above to display matching users.</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <h3>No Users Found</h3>
            <p>No users match your current filters.</p>
            <button onClick={clearFilters} className="action-btn primary">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Assignment Units</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={`${user.role}-${user._id}`}>
                    <td>
                      <div className="user-info">
                        <div className={`user-avatar ${user.role}`}>
                          {getUserInitials(user.firstName, user.lastName)}
                        </div>
                        <div className="user-details">
                          <h4>{getUserDisplayName(user)}</h4>
                          <p>{user.course || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.employeeId || user.studentId || "N/A"}</td>
                    <td>
                      <span
                        className={`status-badge ${user.status || "active"}`}
                      >
                        {user.status || "active"}
                      </span>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      {user.role === 'teacher' ? (
                        <span className="assignment-units-badge">
                          {teacherUnits[user.id || user._id] || 0} units
                        </span>
                      ) : (
                        <span className="assignment-units-na">N/A</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="action-btn primary small"
                        >
                          Edit
                        </button>
                        {user.role === 'teacher' && (
                          <button
                            onClick={() => handleViewSchedule(user)}
                            className="action-btn info small"
                          >
                            View Schedule
                          </button>
                        )}
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className={`action-btn ${
                            user.status === "active" ? "secondary" : "success"
                          } small`}
                        >
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="action-btn danger small"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddUserModal
        show={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={fetchUsers}
      />

      <EditUserModal
        show={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchUsers}
        user={selectedUser}
      />
    </div>
  );
}

export default UserManagement;