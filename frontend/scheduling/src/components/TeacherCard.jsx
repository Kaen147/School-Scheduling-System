import React from 'react';
import './TeacherCard.css';

const TeacherCard = ({ teacher, workload, onSelect, isSelected, isAvailable = true }) => {
  const getWorkloadPercentage = () => {
    if (!workload || workload.totalUnits === 0) return 0;
    
    const limit = teacher.employmentType === 'Part-time' ? 18 : 
                  (teacher.isOverloaded ? Infinity : 24);
    
    if (limit === Infinity) return 100; // Show full bar for overloaded
    return Math.min((workload.totalUnits / limit) * 100, 100);
  };

  const getWorkloadColor = () => {
    const percentage = getWorkloadPercentage();
    if (teacher.isOverloaded) return '#ff9800'; // Orange for overloaded
    if (percentage >= 100) return '#f44336'; // Red for at limit
    if (percentage >= 80) return '#ff9800'; // Orange for near limit
    if (percentage >= 60) return '#ffeb3b'; // Yellow for moderate
    return '#4caf50'; // Green for low
  };

  const getWorkloadStatus = () => {
    if (!workload) return 'No data';
    
    const limit = teacher.employmentType === 'Part-time' ? 18 : 24;
    const units = workload.totalUnits || 0;
    
    if (teacher.isOverloaded) {
      return `${units} units (Overloaded)`;
    }
    
    if (units >= limit && teacher.employmentType === 'Full-time') {
      return `${units}/${limit} units (At limit)`;
    }
    
    return `${units}/${limit} units`;
  };

  const getAvailabilityStatus = () => {
    if (!isAvailable) return 'Conflicted';
    if (teacher.isOverloaded) return 'Overloaded';
    
    const percentage = getWorkloadPercentage();
    if (percentage >= 100) return 'At Limit';
    if (percentage >= 80) return 'Near Limit';
    return 'Available';
  };

  return (
    <div 
      className={`teacher-card ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`}
      onClick={() => isAvailable && onSelect(teacher)}
    >
      <div className="teacher-card-header">
        <div className="teacher-info">
          <h4 className="teacher-name">{teacher.firstName} {teacher.lastName}</h4>
          <span className={`employment-type ${teacher.employmentType.toLowerCase()}`}>
            {teacher.employmentType}
          </span>
        </div>
        <div className={`availability-status ${getAvailabilityStatus().toLowerCase().replace(' ', '-')}`}>
          {getAvailabilityStatus()}
        </div>
      </div>
      
      <div className="workload-section">
        <div className="workload-info">
          <span className="workload-text">{getWorkloadStatus()}</span>
        </div>
        <div className="workload-bar-container">
          <div 
            className="workload-bar"
            style={{ 
              width: `${getWorkloadPercentage()}%`,
              backgroundColor: getWorkloadColor()
            }}
          />
        </div>
      </div>
      
      {workload && workload.subjects && workload.subjects.length > 0 && (
        <div className="current-subjects">
          <div className="subjects-label">Current Subjects:</div>
          <div className="subjects-list">
            {workload.subjects.slice(0, 3).map((subject, index) => (
              <span key={index} className="subject-tag">
                {subject.subjectCode}
              </span>
            ))}
            {workload.subjects.length > 3 && (
              <span className="subject-tag more">+{workload.subjects.length - 3}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherCard;