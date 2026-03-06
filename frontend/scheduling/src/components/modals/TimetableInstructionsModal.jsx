import Swal from "sweetalert2";

export const showTimetableInstructions = () => {
  Swal.fire({
    title: '<strong>How to Use the Timetable</strong>',
    html: `
      <div style="text-align: left; padding: 0 1rem;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #F3F4F6; border-radius: 6px; border-left: 4px solid #3B82F6;">
            <strong>➕ Adding Events:</strong> Click on any time slot to add/edit an event
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #F3F4F6; border-radius: 6px; border-left: 4px solid #EF4444;">
            <strong>🗑️ Deleting Events:</strong> Right-click on an event to delete it
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #DBEAFE; border-radius: 6px; border-left: 4px solid #2563EB;">
            <strong>📚 Lecture (Blue):</strong> Regular lecture sessions
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #FEF3C7; border-radius: 6px; border-left: 4px solid #F59E0B;">
            <strong>🧪 Lab (Yellow):</strong> Laboratory sessions
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #F3F4F6; border-radius: 6px; border-left: 4px solid #10B981;">
            <strong>📋 Subject Filtering:</strong> Subjects are filtered based on selected course, year, and semester
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #F3F4F6; border-radius: 6px; border-left: 4px solid #8B5CF6;">
            <strong>⏱️ Hours Tracking:</strong> Hours are tracked separately for lecture and lab sessions
            <ul style="margin-top: 0.5rem; padding-left: 1.5rem; font-size: 0.9em; color: #6B7280;">
              <li>Lecture-only subjects: 3 hours/week total</li>
              <li>Subjects with lab: 2 hours lecture + 3 hours lab</li>
            </ul>
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #F3F4F6; border-radius: 6px; border-left: 4px solid #F59E0B;">
            <strong>⚠️ Conflict Detection:</strong> Conflicts with existing schedules are detected and prevented
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #F3F4F6; border-radius: 6px; border-left: 4px solid #6B7280;">
            <strong>🕐 Duration:</strong> Select the end time - duration will be calculated automatically
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #F3F4F6; border-radius: 6px; border-left: 4px solid #3B82F6;">
            <strong>📍 Room Assignment:</strong> Optionally add a room/location for the event
          </li>
          <li style="padding: 0.75rem; background: #DCFCE7; border-radius: 6px; border-left: 4px solid #10B981;">
            <strong>💾 Saving:</strong> Click "Save Schedule" when finished to save your timetable
          </li>
        </ul>
      </div>
    `,
    width: '700px',
    confirmButtonText: 'Got it!',
    confirmButtonColor: '#3B82F6',
    customClass: {
      popup: 'instructions-modal',
      title: 'instructions-title'
    }
  });
};
