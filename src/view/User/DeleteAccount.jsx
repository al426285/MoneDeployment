import React, { useState, useEffect } from "react";
import { useUserViewModel, getUser, getCurrentUid } from "../../viewmodel/UserViewModel";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export const DeleteAccount = () => {
  const navigate = useNavigate();
  const {
    handleDeleteAccount,
  } = useUserViewModel(navigate);

  const [confirmError, setConfirmError] = useState("");
  const [isExternalAuth, setIsExternalAuth] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const uid = getCurrentUid();
        if (!uid) return;
        const info = await getUser(uid);
        if (!mounted) return;
        setIsExternalAuth(Boolean(info?.emailReadOnly));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onDeleteAccount = async () => {
    const { value: confirmation } = await Swal.fire({
      title: "Delete account",
      text: "This action will permanently delete your account and cannot be undone. To confirm, please type 'CONFIRM' below.",
      input: "text",
      inputPlaceholder: "CONFIRM",
      showCancelButton: true,
      confirmButtonText: "Delete account",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value || value.toLowerCase().trim() !== "confirm") {
          return "You must type 'CONFIRM' to proceed.";
        }
        return null;
      },
      background: "#E0E6D5",
      color: "#585233",
      customClass: { input: "my-input", confirmButton: "my-confirm-btn", cancelButton: "my-cancel-btn" },
    });

    if (!confirmation) return;

    let password = undefined;

    if (!isExternalAuth) {
      const result = await Swal.fire({
        title: "Confirm password",
        text: "Please enter your current password to delete your account.",
        input: "password",
        inputPlaceholder: "Current password",
        inputAttributes: { autocapitalize: "off", autocorrect: "off" },
        showCancelButton: true,
        confirmButtonText: "Confirm",
        cancelButtonText: "Cancel",
        background: "#E0E6D5",
        color: "#585233",
        customClass: { input: "my-input", confirmButton: "my-confirm-btn", cancelButton: "my-cancel-btn" },
      });

      if (!result.value) return;
      password = result.value;
    }

    try {
      const success = await handleDeleteAccount(password);
      if (success) {
        await Swal.fire({
          title: "Account deleted",
          text: "Your account has been deleted successfully.",
          icon: "success",
          background: "#E0E6D5",
          color: "#585233",
          customClass: { confirmButton: "my-confirm-btn" },
        });
        navigate("/");
      } else {
        // mostrar mensaje de error si la operación no fue exitosa
        const errMsg = "Unable to delete account.";
        setConfirmError(errMsg);
        await Swal.fire({
          title: "Error",
          text: errMsg,
          icon: "error",
          background: "#E0E6D5",
          color: "#585233",
          customClass: { confirmButton: "my-confirm-btn" },
        });
      }
    } catch (err) {
      setConfirmError((err && err.message) || "Error al eliminar la cuenta");
      await Swal.fire({
        title: "Error",
        text: (err && err.message) || "Error al eliminar la cuenta",
        icon: "error",
        background: "#E0E6D5",
        color: "#585233",
        customClass: { confirmButton: "my-confirm-btn" },
      });
    }
  };

  return (
      <div style={{ maxWidth: "1000px", margin: "1rem auto", padding: "1rem", boxSizing: "border-box" }}>
        <div className="settings-row">
          <div className="settings-title">
            <h2>Delete Account</h2>
          </div>
            
          <div className="settings-form">
            <div className=" settings-container " style={{ padding: "1rem" }}>
            <button
              className="btn"
              type="button"
              onClick={onDeleteAccount}
              style={{
                background: "rgba(234, 3, 3, 0.70)",
                border: "2px solid #583533",
                color: "white",
                padding: "5px 10px",
                width: "230px",
                fontSize: "16px",
                cursor: "pointer",
                height: "45px",
              }}
            >
              Delete Account
            </button>
            </div>
          </div>
        </div>
      </div>  
  );
};

export default DeleteAccount;