import React, { useState, useEffect } from "react";
import { getUser, updateAccountInfo, getCurrentUid } from "../../viewmodel/UserViewModel";

export default function AccountManagement() {
  const [accountInfo, setAccountInfo] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [emailError, setEmailError] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const emailReadOnly = accountInfo?.emailReadOnly ?? false;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setError("");
      setLoading(true);
      setEmailError("");
      setNicknameError("");
      setPasswordError("");
      setSuccessMessage("");
      try {
        const uid = getCurrentUid();
        if (!uid) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }
        const u = await getUser(uid);
        if (!mounted) return;
        setAccountInfo(u);
        setEmail(u.email ?? "");
        setNickname(u.nickname ?? u.displayName ?? "");
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "No se pudieron cargar los datos del usuario");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);
    setEmailError("");
    setNicknameError("");
    setPasswordError("");
    try {
      const uid = getCurrentUid();
      if (!uid) throw new Error("User not authenticated");
      const trimmedEmail = email.trim();
      const baselineEmail = accountInfo?.email ?? "";
      const emailChanged = !emailReadOnly && accountInfo ? trimmedEmail !== baselineEmail : false;
      if (emailChanged && !currentPassword.trim()) {
        setPasswordError("Introduce tu contraseña actual para cambiar el email.");
        setLoading(false);
        return;
      }
      const emailPayload = emailReadOnly ? undefined : trimmedEmail;
      const { profile, emailVerificationRequired } = await updateAccountInfo({
        email: emailPayload,
        nickname,
        currentPassword: emailChanged ? currentPassword : undefined,
      });
      setAccountInfo(profile);
      setEmail(profile.email ?? email);
      setNickname(profile.nickname ?? nickname);
      if (emailVerificationRequired) {
        setSuccessMessage("Te enviamos un correo a tu nuevo email. Confírmalo para completar el cambio.");
      } else {
        setSuccessMessage("Cambios guardados correctamente.");
      }
      setCurrentPassword("");
      setLoading(false);
    } catch (err) {
      setSuccessMessage("");
      if (err && err.fieldErrors) {
        const fe = err.fieldErrors;
        setEmailError(fe.email ?? "");
        setNicknameError(fe.nickname ?? "");
        setPasswordError(fe.currentPassword ?? "");
      } else {
        setError((err && (err.message || String(err))) || "Error al actualizar la información de la cuenta");
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "1rem auto", padding: "1rem", boxSizing: "border-box" }}>
      <div className="settings-row">
        <div className="settings-title">
          <h2>Account Management</h2>
          <p>Update your personal and security information</p>
        </div>

        <div className="settings-form">
          <div className="default-container settings-container with-border" style={{ padding: "1rem" }}>
            {loading ? (
              <p>Cargando...</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={emailReadOnly}
                  required
                />
                {emailReadOnly && (
                  <p className="info-text" style={{ color: "#666", marginTop: "0.25rem", fontSize: "0.8rem" }}>
                    This email is linked to your Google account and cannot be changed here.
                  </p>
                )}
                {emailError && <p className="error-text" style={{ color: "red", marginTop: "0.25rem" }}>{emailError}</p>}
                {accountInfo && !emailReadOnly && email !== (accountInfo.email ?? "") && (
                  <>
                    <label htmlFor="currentPassword">Current password (required to change email)</label>
                    <input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    {passwordError && <p className="error-text" style={{ color: "red", marginTop: "0.25rem" }}>{passwordError}</p>}
                  </>
                )}
                <label htmlFor="nickname">Nickname</label>
                <input
                  id="nickname"
                  type="text"
                  placeholder="Enter your nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                />
                {nicknameError && <p className="error-text" style={{ color: "red", marginTop: "0.25rem" }}>{nicknameError}</p>}
                <div style={{ height: "0.6rem" }}>
                  <a href="/change-password" className="password-link" style={{ textAlign: "left" }}>
                    Change Password
                  </a>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.6rem" }}>
                  <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "35%" }}>
                    {loading ? "Updating..." : "Save Changes"}
                  </button>
                </div>
                {successMessage && <p style={{ color: "green", marginTop: "0.6rem" }}>{successMessage}</p>}
                {error && <p style={{ color: "red", marginTop: "0.6rem" }}>{error}</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}