import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import AdminSidebar from "../components/NavBarAdmin";
import "../components/NavBarAdmin.css";
import "./RoomManagement.css"; // use dedicated styles

function RoomManagement() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ searchTerm: "", type: null, status: null });
  const [showAdd, setShowAdd] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await axios.get("https://school-scheduling-system-production.up.railway.app/api/rooms");
      setRooms(res.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error fetching rooms");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRooms = () => {
    // If no type or status filter selected, return empty array (no rooms shown)
    if (!filters.type && !filters.status) {
      return [];
    }

    return rooms.filter((r) => {
      if (filters.searchTerm) {
        const t = filters.searchTerm.toLowerCase();
        if (!r.name?.toLowerCase().includes(t) && !(r.code || '').toLowerCase().includes(t)) return false;
      }
      if (filters.type && filters.type !== "all" && r.type !== filters.type) return false;
      if (filters.status && filters.status !== "all") {
        if (filters.status === "active" && !r.isActive) return false;
        if (filters.status === "inactive" && r.isActive) return false;
      }
      return true;
    });
  };

  const clearFilters = () => setFilters({ searchTerm: "", type: null, status: null });

  const handleDelete = async (room) => {
    const resp = await Swal.fire({
      title: `Delete room ${room.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete'
    });
    if (!resp.isConfirmed) return;
    try {
      await axios.delete(`https://school-scheduling-system-production.up.railway.app/api/rooms/${room._id}`);
      Swal.fire({ icon: 'success', title: 'Deleted', timer: 1200, showConfirmButton: false });
      fetchRooms();
    } catch (err) {
      console.error('Delete room failed', err);
      Swal.fire({ icon: 'error', title: 'Delete failed', text: err?.response?.data?.message || err.message });
    }
  };

  const toggleRoomStatus = async (room) => {
    const action = room.isActive ? 'mark as inactive (under maintenance)' : 'reactivate';
    const resp = await Swal.fire({
      title: `${room.isActive ? 'Mark inactive' : 'Activate'} ${room.name}?`,
      text: `Are you sure you want to ${action} this room?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: room.isActive ? 'Mark Inactive' : 'Activate'
    });
    if (!resp.isConfirmed) return;

    try {
      await axios.put(`https://school-scheduling-system-production.up.railway.app/api/rooms/${room._id}`, { isActive: !room.isActive });
      Swal.fire({ icon: 'success', title: room.isActive ? 'Marked inactive' : 'Activated', timer: 1200, showConfirmButton: false });
      fetchRooms();
    } catch (err) {
      console.error('Failed to toggle room status', err);
      Swal.fire({ icon: 'error', title: 'Failed', text: err?.response?.data?.message || err.message });
    }
  };

  const openEdit = (room) => {
    setEditingRoom(room);
    setShowAdd(true);
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditingRoom(null);
  };

  const handleSave = async (form) => {
    try {
      if (editingRoom) {
        await axios.put(`https://school-scheduling-system-production.up.railway.app/api/rooms/${editingRoom._id}`, form);
        Swal.fire({ icon: 'success', title: 'Updated', timer: 1200, showConfirmButton: false });
      } else {
        await axios.post(`https://school-scheduling-system-production.up.railway.app/api/rooms`, form);
        Swal.fire({ icon: 'success', title: 'Created', timer: 1200, showConfirmButton: false });
      }
      closeModal();
      fetchRooms();
    } catch (err) {
      console.error('Save room failed', err);
      Swal.fire({ icon: 'error', title: 'Save failed', text: err?.response?.data?.message || err.message });
    }
  };

  const filtered = getFilteredRooms();

  if (loading) return (<div className="room-mgmt-layout"><AdminSidebar /><div className="room-mgmt-main-content"><div className="loading-container"><div className="loading-spinner"></div><p>Loading rooms...</p></div></div></div>);
  if (error) return (<div className="room-mgmt-layout"><AdminSidebar /><div className="room-mgmt-main-content"><div className="error-container"><h3>Error: {error}</h3><button onClick={fetchRooms} className="action-btn primary">Retry</button></div></div></div>);

  return (
    <div className="room-mgmt-layout">
      <AdminSidebar />
      <div className="room-mgmt-main-content">
        {/* Header */}
        <div className="room-mgmt-header">
          <h1>Room Management</h1>
          <div className="header-buttons">
            <button className="action-btn primary add-room-btn" onClick={() => setShowAdd(true)}>
              <span className="plus-icon">+</span> Add Room
            </button>
            <button className="action-btn secondary small clear-filters-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="room-controls-section">
          <div className="room-controls-grid">
            <div className="control-group">
              <label className="form-label">Search (Name or Code)</label>
              <input 
                type="text"
                className="form-input" 
                value={filters.searchTerm} 
                onChange={(e) => setFilters(prev => ({...prev, searchTerm: e.target.value}))}
                placeholder="Search by room name or code..."
              />
            </div>

            <div className="control-group">
              <label className="form-label">Type</label>
              <select 
                value={filters.type || ""} 
                onChange={(e) => setFilters(prev => ({...prev, type: e.target.value || null}))} 
                className="form-input"
              >
                <option value="">-- Select Type --</option>
                <option value="all">All Types</option>
                <option value="classroom">Classroom</option>
                <option value="laboratory">Laboratory</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div className="control-group">
              <label className="form-label">Status</label>
              <select 
                value={filters.status || ""} 
                onChange={(e) => setFilters(prev => ({...prev, status: e.target.value || null}))} 
                className="form-input"
              >
                <option value="">-- Select Status --</option>
                <option value="all">All Status</option>
                <option value="active">Available (Active)</option>
                <option value="inactive">Under Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rooms Table */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No Rooms Found</h3>
          </div>
        ) : (
          <div className="rooms-table-container">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r._id}>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.code || '—'}</td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        backgroundColor: r.type === 'laboratory' ? '#FEE2E2' : r.type === 'classroom' ? '#E0F2FE' : '#F3E8FF',
                        fontSize: 13,
                        fontWeight: 500
                      }}>
                        {r.type.charAt(0).toUpperCase() + r.type.slice(1)}
                      </span>
                    </td>
                    <td>{r.capacity || '—'}</td>
                    <td>{r.location || '—'}</td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        backgroundColor: r.isActive ? '#DCFCE7' : '#FEE2E2',
                        color: r.isActive ? '#166534' : '#991B1B',
                        fontSize: 13,
                        fontWeight: 500
                      }}>
                        {r.isActive ? '✓ Available' : '⚠ Maintenance'}
                      </span>
                    </td>
                    <td>
                      <div style={{display:'flex', gap: 8, flexWrap: 'wrap'}}>
                        <button className="action-btn primary small" onClick={() => openEdit(r)}>Edit</button>
                        <button className="action-btn secondary small" onClick={() => toggleRoomStatus(r)}>
                          {r.isActive ? 'Mark Inactive' : 'Activate'}
                        </button>
                        <button className="action-btn danger small" onClick={() => handleDelete(r)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {showAdd && (
        <RoomModal onClose={closeModal} onSave={handleSave} room={editingRoom} />
      )}
    </div>
  );
}

function RoomModal({ onClose, onSave, room }) {
  const [name, setName] = useState(room?.name || '');
  const [code, setCode] = useState(room?.code || '');
  const [type, setType] = useState(room?.type || 'classroom');
  const [capacity, setCapacity] = useState(room?.capacity || 0);
  const [isActive, setIsActive] = useState(room?.isActive ?? true);
  const [location, setLocation] = useState(room?.location || '');
  const [notes, setNotes] = useState(room?.notes || '');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setName(room?.name || ''); 
    setCode(room?.code || ''); 
    setType(room?.type || 'classroom');
    setCapacity(room?.capacity || 0); 
    setIsActive(room?.isActive ?? true); 
    setLocation(room?.location || ''); 
    setNotes(room?.notes || '');
    setErrors({});
  }, [room]);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Room name is required';
    if (!capacity || capacity <= 0) newErrors.capacity = 'Capacity must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    const payload = { 
      name: name.trim(), 
      code: code.trim(), 
      type, 
      capacity: Number(capacity), 
      isActive, 
      location: location.trim(), 
      notes: notes.trim() 
    };
    onSave(payload);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>{room ? 'Edit Room' : 'Add New Room'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {/* Room Name */}
            <div className="form-group">
              <label className="form-label">Room Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="text"
                className="form-input" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Room 101, Lab A"
                required 
              />
              {errors.name && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.name}</span>}
            </div>

            {/* Room Code */}
            <div className="form-group">
              <label className="form-label">Room Code (Optional)</label>
              <input 
                type="text"
                className="form-input" 
                value={code} 
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., R101, LAB-A"
              />
            </div>

            {/* Type & Capacity */}
            <div className="form-grid">
              <div>
                <label className="form-label">Type <span style={{ color: '#ef4444' }}>*</span></label>
                <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="classroom">Classroom</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="both">Both (Classroom & Lab)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Capacity <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={capacity} 
                  onChange={(e) => setCapacity(e.target.value)}
                  min="1"
                  required 
                />
                {errors.capacity && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.capacity}</span>}
              </div>
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">Location (Optional)</label>
              <input 
                type="text"
                className="form-input" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Building A, 2nd Floor"
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <textarea 
                className="form-input" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Has projector, whiteboard, etc."
                rows="3"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Status */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <span>Available (Mark as Under Maintenance if unchecked)</span>
              </label>
            </div>
          </div>

          {/* Form Buttons */}
          <div className="form-buttons">
            <button 
              type="button" 
              className="action-btn secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="action-btn primary"
            >
              {room ? '💾 Save Changes' : '✅ Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RoomManagement;
