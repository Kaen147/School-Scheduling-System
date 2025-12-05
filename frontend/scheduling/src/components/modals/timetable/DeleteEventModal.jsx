import Swal from 'sweetalert2';

const DeleteEventModal = {
  show: async () => {
    const result = await Swal.fire({
      title: 'Delete Event?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });

    return result.isConfirmed;
  },

  showSuccess: () => {
    return Swal.fire({
      icon: 'success',
      title: 'Event Deleted!',
      timer: 1000,
      showConfirmButton: false
    });
  }
};

export default DeleteEventModal;