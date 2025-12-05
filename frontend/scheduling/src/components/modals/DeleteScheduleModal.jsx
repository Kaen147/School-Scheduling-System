import Swal from "sweetalert2";
import axios from "axios";

export const showDeleteScheduleModal = async (scheduleId, scheduleName, onSuccess) => {
  const result = await Swal.fire({
    title: "Delete Schedule?",
    html: `Are you sure you want to delete <strong>"${scheduleName}"</strong>?<br>This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC2626",
    cancelButtonColor: "#6B7280",
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
  });

  if (result.isConfirmed) {
    try {
      await axios.delete(`https://school-scheduling-system-production.up.railway.app/api/schedules/${scheduleId}`);

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Schedule has been deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.response?.data?.message || "Failed to delete schedule.",
        confirmButtonColor: "#3B82F6",
      });
    }
  }
};

export default showDeleteScheduleModal;
