import React from 'react';
import './RoomCard.css';

const RoomCard = ({ room, isAvailable = true, conflicts = [], onSelect, isSelected }) => {
  const getAvailabilityStatus = () => {
    if (!isAvailable) return 'Occupied';
    if (conflicts.length > 0) return 'Conflicted';
    return 'Available';
  };

  const getCapacityColor = () => {
    const capacity = room.capacity || 0;
    if (capacity >= 60) return '#4caf50'; // Green for large rooms
    if (capacity >= 40) return '#ff9800'; // Orange for medium rooms
    if (capacity >= 20) return '#ffeb3b'; // Yellow for small rooms
    return '#f44336'; // Red for very small rooms
  };

  const getRoomTypeIcon = () => {
    const type = room.type?.toLowerCase() || '';
    if (type.includes('lab')) return '🔬';
    if (type.includes('lecture')) return '📚';
    if (type.includes('computer')) return '💻';
    if (type.includes('conference')) return '👥';
    return '🏫';
  };

  return (
    <div 
      className={`room-card ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
      onClick={() => isAvailable && onSelect(room)}
    >
      <div className="room-card-header">
        <div className="room-info">
          <h4 className="room-name">
            <span className="room-icon">{getRoomTypeIcon()}</span>
            {room.name}
          </h4>
          <span className="room-building">
            {room.building && `${room.building} - `}Floor {room.floor || 'N/A'}
          </span>
        </div>
        <div className={`availability-status ${getAvailabilityStatus().toLowerCase()}`}>
          {getAvailabilityStatus()}
        </div>
      </div>
      
      <div className="room-details">
        <div className="capacity-info">
          <div className="capacity-label">Capacity</div>
          <div className="capacity-value" style={{ color: getCapacityColor() }}>
            {room.capacity || 'N/A'} students
          </div>
        </div>
        
        {room.type && (
          <div className="room-type">
            <span className="room-type-badge">{room.type}</span>
          </div>
        )}
      </div>

      {room.equipment && room.equipment.length > 0 && (
        <div className="equipment-section">
          <div className="equipment-label">Equipment:</div>
          <div className="equipment-list">
            {room.equipment.slice(0, 3).map((equipment, index) => (
              <span key={index} className="equipment-tag">
                {equipment}
              </span>
            ))}
            {room.equipment.length > 3 && (
              <span className="equipment-tag more">+{room.equipment.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="conflicts-section">
          <div className="conflicts-label">Conflicts:</div>
          <div className="conflicts-list">
            {conflicts.slice(0, 2).map((conflict, index) => (
              <span key={index} className="conflict-tag">
                {conflict.time}
              </span>
            ))}
            {conflicts.length > 2 && (
              <span className="conflict-tag more">+{conflicts.length - 2}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomCard;