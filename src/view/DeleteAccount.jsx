import React, { useState, useEffect } from "react";
import { useUserViewModel } from "../viewmodel/UserViewModel";
import { useNavigate } from "react-router-dom";

export const DeleteAccount = () => {
  const navigate = useNavigate();
  const {
    handleDeleteAccount,
  } = useUserViewModel(navigate);

  const [confirmError, setConfirmError] = useState("");

  const onDeleteAccount = async () => {
    try {
      await handleDeleteAccount();
    } catch (err) {
      setConfirmError((err && err.message) || "Error al eliminar la cuenta");
    }
  };

  return (
    <div className="center" role="main" style={{height: "100%", width: "100%"}}>
      <button
            type="button"
            onClick={onDeleteAccount}
            style={{
              background: "#ea0303",
              border: "2px solid #583533",
              color: "white",
              padding: "5px 10px",
            }}
          >
            Delete Account
          </button>
        
    </div>
  );
};

export default DeleteAccount;