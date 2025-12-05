import Swal from "sweetalert2";
import axios from "axios";

const getYearSuffix = (year) => {
  switch (year) {
    case "1":
      return "st";
    case "2":
      return "nd";
    case "3":
      return "rd";
    default:
      return "th";
  }
};

export const showCreateScheduleModal = async (courses, navigate) => {
  let academicYearOptions = [];
  let selectedAcademicYear = null;

  const { value: formValues } = await Swal.fire({
    title: "Create New Schedule",
    html: `
      <form style="text-align: left; display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label for="schedule-course" style="display: block; font-size: 13px; margin-bottom: 5px; font-weight: 600; color: #1F2937;">Course <span style="color: #EF4444;">*</span></label>
          <select id="schedule-course" style="width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid #D1D5DB; border-radius: 6px; background-color: #FFFFFF; cursor: pointer; outline: none;">
            <option value="">— Select a course —</option>
            ${courses
              .map((c) => `<option value="${c._id}">${c.abbreviation ? c.abbreviation + ' - ' : ''}${c.name}</option>`)
              .join("")}
          </select>
        </div>
        
        <div>
          <label for="schedule-year" style="display: block; font-size: 13px; margin-bottom: 5px; font-weight: 600; color: #1F2937;">Year Level <span style="color: #EF4444;">*</span></label>
          <select id="schedule-year" style="width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid #D1D5DB; border-radius: 6px; background-color: #FFFFFF; cursor: pointer; outline: none;">
            <option value="">— Select year level —</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
        
        <div>
          <label for="schedule-semester" style="display: block; font-size: 13px; margin-bottom: 5px; font-weight: 600; color: #1F2937;">Semester <span style="color: #EF4444;">*</span></label>
          <select id="schedule-semester" style="width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid #D1D5DB; border-radius: 6px; background-color: #FFFFFF; cursor: pointer; outline: none;">
            <option value="">— Select semester —</option>
            <option value="1">1st Semester</option>
            <option value="2">2nd Semester</option>
            <option value="summer">Summer</option>
          </select>
        </div>

        <div id="academic-year-container" style="display: none;">
          <label for="schedule-academic-year" style="display: block; font-size: 13px; margin-bottom: 5px; font-weight: 600; color: #1F2937;">Academic Year <span style="color: #EF4444;">*</span></label>
          <select id="schedule-academic-year" style="width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid #D1D5DB; border-radius: 6px; background-color: #FFFFFF; cursor: pointer; outline: none;">
            <option value="">— Select academic year —</option>
          </select>
          <p style="font-size: 12px; color: #6B7280; margin-top: 5px;">
            Multiple academic years found for this course/year/semester combination.
          </p>
        </div>

        <div style="padding: 10px; background-color: #F0F9FF; border-left: 4px solid #0EA5E9; border-radius: 4px;">
          <p style="margin: 0; font-size: 12px; color: #0C4A6E;">
            <strong>ℹ️ Academic Year:</strong> Will be automatically detected from subject offerings. If multiple academic years exist, you'll be asked to select one.
          </p>
        </div>
      </form>
    `,
    width: "420px",
    padding: "0",
    customClass: {
      popup: 'create-schedule-popup',
      container: 'create-schedule-container',
      actions: 'create-schedule-actions',
    },
    allowOutsideClick: false,
    allowEscapeKey: true,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Create Schedule",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#3B82F6",
    cancelButtonColor: "#6B7280",
    didOpen: () => {
      const popup = document.querySelector('.create-schedule-popup');
      if (popup) {
        popup.style.overflow = 'visible';
        popup.style.overflowY = 'visible';
        popup.style.maxHeight = 'none';
      }
      const header = document.querySelector('.swal2-html-container');
      if (header) {
        header.style.padding = '20px 20px 15px 20px';
      }
      
      // Style buttons
      const confirmBtn = document.querySelector('.swal2-confirm');
      const cancelBtn = document.querySelector('.swal2-cancel');
      
      if (confirmBtn) {
        confirmBtn.style.backgroundColor = '#3B82F6';
        confirmBtn.style.color = 'white';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '6px';
        confirmBtn.style.padding = '10px 20px';
        confirmBtn.style.fontSize = '14px';
        confirmBtn.style.fontWeight = '600';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.marginRight = '10px';
      }
      
      if (cancelBtn) {
        cancelBtn.style.backgroundColor = '#6B7280';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.style.padding = '10px 20px';
        cancelBtn.style.fontSize = '14px';
        cancelBtn.style.fontWeight = '600';
        cancelBtn.style.cursor = 'pointer';
      }
      
      const actions = document.querySelector('.swal2-actions');
      if (actions) {
        actions.style.padding = '20px 20px';
        actions.style.gap = '10px';
      }

      // Add change listeners to dynamically fetch academic years
      const courseSelect = document.getElementById("schedule-course");
      const yearSelect = document.getElementById("schedule-year");
      const semesterSelect = document.getElementById("schedule-semester");
      const academicYearContainer = document.getElementById("academic-year-container");
      const academicYearSelect = document.getElementById("schedule-academic-year");

      const fetchAcademicYears = async () => {
        const courseId = courseSelect.value;
        const yearLevel = yearSelect.value;
        const semester = semesterSelect.value;

        if (!courseId || !yearLevel || !semester) {
          academicYearContainer.style.display = 'none';
          academicYearOptions = [];
          return;
        }

        try {
          const offeringsRes = await axios.get(
            `http://localhost:5000/api/offerings?courseId=${courseId}&yearLevel=${yearLevel}&semester=${semester}`
          );

          if (!offeringsRes.data || offeringsRes.data.length === 0) {
            Swal.showValidationMessage(
              "No subject offerings found for this selection."
            );
            academicYearContainer.style.display = 'none';
            return;
          }

          // Extract unique academic years
          const uniqueYears = [...new Set(offeringsRes.data.map(o => o.academicYear))].sort().reverse();
          academicYearOptions = uniqueYears;

          // Populate academic year select
          academicYearSelect.innerHTML = '<option value="">— Select academic year —</option>';
          uniqueYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            academicYearSelect.appendChild(option);
          });

          // Show/hide academic year selector based on number of options
          if (uniqueYears.length > 1) {
            academicYearContainer.style.display = 'block';
          } else if (uniqueYears.length === 1) {
            academicYearContainer.style.display = 'none';
            academicYearSelect.value = uniqueYears[0];
            selectedAcademicYear = uniqueYears[0];
          }
        } catch (error) {
          console.error("Error fetching offerings:", error);
        }
      };

      courseSelect.addEventListener('change', fetchAcademicYears);
      yearSelect.addEventListener('change', fetchAcademicYears);
      semesterSelect.addEventListener('change', fetchAcademicYears);

      // Track manual selection
      academicYearSelect.addEventListener('change', (e) => {
        selectedAcademicYear = e.target.value;
      });
    },
    preConfirm: async () => {
      const courseId = document.getElementById("schedule-course").value;
      const yearLevel = document.getElementById("schedule-year").value;
      const semester = document.getElementById("schedule-semester").value;
      
      if (!courseId || !yearLevel || !semester) {
        Swal.showValidationMessage("Please select all required fields");
        return false;
      }

      // Fetch the academic year options
      try {
        const offeringsRes = await axios.get(
          `http://localhost:5000/api/offerings?courseId=${courseId}&yearLevel=${yearLevel}&semester=${semester}`
        );
        
        if (!offeringsRes.data || offeringsRes.data.length === 0) {
          Swal.showValidationMessage(
            "No subject offerings found for this course, year, and semester. Please ensure offerings are set up first."
          );
          return false;
        }

        // Extract unique academic years
        const uniqueYears = [...new Set(offeringsRes.data.map(o => o.academicYear))].sort().reverse();
        
        // If only one academic year, use it directly
        let academicYear = selectedAcademicYear || uniqueYears[0];
        
        if (!academicYear) {
          Swal.showValidationMessage(
            "Please select an academic year or check offerings setup."
          );
          return false;
        }

        return { courseId, yearLevel, semester, academicYear };
      } catch (error) {
        console.error("Error fetching offerings:", error);
        Swal.showValidationMessage(
          "Failed to fetch academic year. Please ensure the course has subject offerings set up."
        );
        return false;
      }
    },
  });

  if (formValues) {
    const selectedCourse = courses.find((c) => c._id === formValues.courseId);
    const scheduleInfo = {
      academicYear: formValues.academicYear,
      courseId: formValues.courseId,
      courseName: selectedCourse?.name || "",
      courseAbbreviation: selectedCourse?.abbreviation || "",
      yearLevel: formValues.yearLevel,
      semester: formValues.semester,
    };

    localStorage.setItem("scheduleInfo", JSON.stringify(scheduleInfo));

    Swal.fire({
      icon: "success",
      title: "Schedule Created!",
      text: `Creating schedule for ${selectedCourse?.name} - ${
        formValues.yearLevel
      }${getYearSuffix(formValues.yearLevel)} Year (${formValues.academicYear})`,
      timer: 2000,
      showConfirmButton: false,
    }).then(() => navigate("/timetable"));
  }
};

export default showCreateScheduleModal;
