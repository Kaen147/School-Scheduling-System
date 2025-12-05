import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ConflictChecker.css';

const ConflictChecker = ({ 
  teachers = [], 
  rooms = [], 
  academicYear, 
  semester, 
  subjectId,
  onConflictUpdate 
}) => {
  const [conflicts, setConflicts] = useState({
    teachers: {},
    rooms: {}
  });
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  const checkConflicts = async () => {
    if (!academicYear || !semester || teachers.length === 0) {
      setConflicts({ teachers: {}, rooms: {} });
      return;
    }

    setLoading(true);
    try {
      const conflictChecks = await Promise.all([
        // Check teacher conflicts
        ...teachers.map(async (teacher) => {
          if (!teacher.teacherId) return null;
          try {
            const response = await axios.post('http://localhost:5000/api/workload/check-conflicts', {
              teacherId: teacher.teacherId,
              academicYear,
              semester,
              excludeSubject: subjectId
            });
            return {
              type: 'teacher',
              id: teacher.teacherId,
              conflicts: response.data.conflicts || []
            };
          } catch (error) {
            return {
              type: 'teacher',
              id: teacher.teacherId,
              conflicts: []
            };
          }
        }),
        // Check room conflicts
        ...rooms.map(async (room) => {
          if (!room.roomId) return null;
          try {
            const response = await axios.post('http://localhost:5000/api/rooms/check-conflicts', {
              roomId: room.roomId,
              academicYear,
              semester,
              excludeSubject: subjectId
            });
            return {
              type: 'room',
              id: room.roomId,
              conflicts: response.data.conflicts || []
            };
          } catch (error) {
            return {
              type: 'room',
              id: room.roomId,
              conflicts: []
            };
          }
        })
      ]);

      const newConflicts = {
        teachers: {},
        rooms: {}
      };

      conflictChecks.filter(Boolean).forEach(check => {
        if (check.type === 'teacher') {
          newConflicts.teachers[check.id] = check.conflicts;
        } else if (check.type === 'room') {
          newConflicts.rooms[check.id] = check.conflicts;
        }
      });

      setConflicts(newConflicts);
      setLastCheck(new Date());
      
      // Notify parent component of conflicts
      if (onConflictUpdate) {
        onConflictUpdate(newConflicts);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      checkConflicts();
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(debounceTimer);
  }, [teachers, rooms, academicYear, semester]);

  const getTotalConflicts = () => {
    const teacherConflicts = Object.values(conflicts.teachers).flat().length;
    const roomConflicts = Object.values(conflicts.rooms).flat().length;
    return teacherConflicts + roomConflicts;
  };

  const getConflictSummary = () => {
    const totalConflicts = getTotalConflicts();
    if (totalConflicts === 0) return 'No conflicts detected';
    return `${totalConflicts} conflict${totalConflicts > 1 ? 's' : ''} detected`;
  };

  const getConflictStatus = () => {
    const totalConflicts = getTotalConflicts();
    if (loading) return 'checking';
    if (totalConflicts === 0) return 'clear';
    if (totalConflicts <= 2) return 'warning';
    return 'error';
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Invalid time';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour12 = parseInt(hours) % 12 || 12;
      const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  if (!academicYear || !semester) {
    return (
      <div className="conflict-checker">
        <div className="conflict-status no-data">
          <span className="status-icon">ℹ️</span>
          <span>Please set academic year and semester to check conflicts</span>
        </div>
      </div>
    );
  }

  return (
    <div className="conflict-checker">
      <div className={`conflict-status ${getConflictStatus()}`}>
        <div className="status-header">
          <span className="status-icon">
            {loading ? '🔄' : getConflictStatus() === 'clear' ? '✅' : getConflictStatus() === 'warning' ? '⚠️' : '❌'}
          </span>
          <span className="status-text">
            {loading ? 'Checking conflicts...' : getConflictSummary()}
          </span>
          {lastCheck && (
            <span className="last-check">
              Last checked: {lastCheck.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <button 
          type="button"
          className="refresh-btn"
          onClick={checkConflicts}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {getTotalConflicts() > 0 && (
        <div className="conflict-details">
          {Object.entries(conflicts.teachers).map(([teacherId, teacherConflicts]) => {
            if (teacherConflicts.length === 0) return null;
            const teacher = teachers.find(t => t.teacherId === teacherId);
            const teacherName = teacher?.teacherName || `Teacher ${teacherId}`;
            
            return (
              <div key={teacherId} className="conflict-item teacher-conflict">
                <h5>👤 {teacherName}</h5>
                <ul className="conflict-list">
                  {teacherConflicts.map((conflict, index) => (
                    <li key={index}>
                      <strong>{conflict.subjectCode}</strong> - {conflict.day}s, {formatTime(conflict.startTime)} - {formatTime(conflict.endTime)}
                      {conflict.roomName && <span className="room-info"> in {conflict.roomName}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {Object.entries(conflicts.rooms).map(([roomId, roomConflicts]) => {
            if (roomConflicts.length === 0) return null;
            const room = rooms.find(r => r.roomId === roomId);
            const roomName = room?.roomName || `Room ${roomId}`;
            
            return (
              <div key={roomId} className="conflict-item room-conflict">
                <h5>🏫 {roomName}</h5>
                <ul className="conflict-list">
                  {roomConflicts.map((conflict, index) => (
                    <li key={index}>
                      <strong>{conflict.subjectCode}</strong> - {conflict.day}s, {formatTime(conflict.startTime)} - {formatTime(conflict.endTime)}
                      {conflict.teacherName && <span className="teacher-info"> with {conflict.teacherName}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConflictChecker;