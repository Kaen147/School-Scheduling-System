import Swal from "sweetalert2";

export const showViewScheduleModal = async (schedule, onDownloadPDF) => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Generate time slots (7 AM to 6 PM with 30-minute intervals)
  const timeSlots = [];
  for (let hour = 7; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break;
      const timeKey = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? "PM" : "AM";
      const time12 = `${displayHour}:${minute
        .toString()
        .padStart(2, "0")} ${period}`;
      timeSlots.push({ timeKey, time12 });
    }
  }

  // Build timetable grid
  let timetableHTML = `
    <div style="overflow-x: auto; max-height: 600px; overflow-y: auto;">
      <table style="width: 100%; border-collapse: collapse; min-width: 800px;">
        <thead style="position: sticky; top: 0; background: white; z-index: 10;">
          <tr style="background-color: #f8f9fa; border-bottom: 2px solid #ddd;">
            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd; min-width: 100px; font-weight: 600;">Time</th>
            ${days
              .map(
                (day) =>
                  `<th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd; font-weight: 600;">${day}</th>`
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
  `;

  // Create a map for easy event lookup
  const eventMap = {};
  schedule.events.forEach((event) => {
    const key = `${event.day}-${event.startTime}`;
    eventMap[key] = event;
  });

  // Track which cells are occupied by multi-slot events
  const occupiedSlots = new Set();

  timeSlots.forEach((timeSlot) => {
    timetableHTML += `<tr style="height: 50px;">`;
    timetableHTML += `<td style="padding: 0.5rem; border: 1px solid #ddd; background-color: #fafafa; font-size: 0.85rem; font-weight: 500;">${timeSlot.time12}</td>`;

    days.forEach((day) => {
      const cellKey = `${day}-${timeSlot.timeKey}`;

      // Check if this cell is occupied by a previous event
      if (occupiedSlots.has(cellKey)) {
        return; // Skip, already rendered with rowspan
      }

      const event = eventMap[cellKey];

      if (event) {
        // Calculate rowspan
        const startIndex = timeSlots.findIndex(
          (ts) => ts.timeKey === event.startTime
        );
        const endIndex = timeSlots.findIndex(
          (ts) => ts.timeKey === event.endTime
        );
        const rowspan = endIndex - startIndex;

        // Mark occupied slots
        for (let i = startIndex; i < endIndex; i++) {
          occupiedSlots.add(`${day}-${timeSlots[i].timeKey}`);
        }

        // Access subject data directly from populated field
        const subject = event.subjectId;
        const subjectCode = subject?.code || "N/A";
        const subjectName = subject?.name || "Unknown Subject";
        const subjectUnits = subject?.requiredHours
          ? `${subject.requiredHours}h`
          : "";

        timetableHTML += `
          <td rowspan="${rowspan}" style="
            padding: 0.75rem; 
            border: 1px solid #2563EB; 
            background-color: #DBEAFE;
            vertical-align: top;
            position: relative;
          ">
            <div style="font-weight: bold; font-size: 0.9rem; color: #1e40af; margin-bottom: 0.25rem;">
              ${schedule.courseAbbreviation} - ${subjectCode}
            </div>
            <div style="font-size: 0.85rem; color: #1e40af; margin-bottom: 0.25rem;">
              ${subjectName}
            </div>
            <div style="font-size: 0.75rem; color: #6B7280; margin-bottom: 0.25rem;">
              ${formatTime(event.startTime)} - ${formatTime(event.endTime)}
            </div>
            ${
              event.room
                ? `<div style="font-size: 0.75rem; color: #6B7280;">📍 ${event.room}</div>`
                : ""
            }
            ${
              subjectUnits
                ? `<div style="font-size: 0.7rem; color: #9CA3AF; margin-top: 0.25rem;">Required: ${subjectUnits}</div>`
                : ""
            }
          </td>
        `;
      } else {
        timetableHTML += `<td style="padding: 0.5rem; border: 1px solid #ddd; background-color: #fafafa;"></td>`;
      }
    });

    timetableHTML += `</tr>`;
  });

  timetableHTML += `
        </tbody>
      </table>
    </div>
  `;

  const result = await Swal.fire({
    title: schedule.name,
    html: `
      <div style="text-align: left; margin-bottom: 1rem;">
        <p style="margin: 0.5rem 0;"><strong>Course:</strong> ${
          schedule.courseName
        } (${schedule.courseAbbreviation})</p>
        <p style="margin: 0.5rem 0;"><strong>Year Level:</strong> ${
          schedule.yearLevel
        }${getYearSuffix(schedule.yearLevel)} Year</p>
        <p style="margin: 0.5rem 0;"><strong>Semester:</strong> ${
          schedule.semester
        }${getSemesterSuffix(schedule.semester)} Semester</p>
        <p style="margin: 0.5rem 0;"><strong>Total Events:</strong> ${
          schedule.events.length
        }</p>
      </div>
      <hr style="margin: 1rem 0; border: none; border-top: 2px solid #e0e0e0;">
      ${timetableHTML}
    `,
    width: "95%",
    showCancelButton: true,
    confirmButtonText: "Close",
    cancelButtonText: "📄 Download PDF",
    confirmButtonColor: "#3B82F6",
    cancelButtonColor: "#6B7280",
    customClass: {
      container: "schedule-view-modal",
    },
  });

  if (result.dismiss === Swal.DismissReason.cancel) {
    onDownloadPDF(schedule);
  }
};

const formatTime = (timeKey) => {
  const [hour, minute] = timeKey.split(":").map(Number);
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const period = hour >= 12 ? "PM" : "AM";
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
};

const getYearSuffix = (year) => {
  const yearStr = year?.toString();
  if (yearStr === "1") return "st";
  if (yearStr === "2") return "nd";
  if (yearStr === "3") return "rd";
  return "th";
};

const getSemesterSuffix = (semester) => {
  const semStr = semester?.toString();
  if (semStr === "1") return "st";
  if (semStr === "2") return "nd";
  return "";
};