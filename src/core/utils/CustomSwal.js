import Swal from "sweetalert2";

export const CustomSwal = Swal.mixin({
  background: "#E0E6D5",
  color: "#585233",
  customClass: {
    confirmButton: "my-confirm-btn",
    cancelButton: "my-cancel-btn",
    denyButton: "my-back-btn",
    input: "my-input",
  },
});

export default CustomSwal;
