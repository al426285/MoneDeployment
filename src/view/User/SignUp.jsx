import React, { useState, useEffect } from "react";
import { useUserViewModel } from "../../viewmodel/UserViewModel";
import { useNavigate } from "react-router-dom";

export const SignUp = () => {
  const navigate = useNavigate();
  const {
    email,
    nickname,
    password,
    message,
    loading,
    errors,
    passwordRequirements,
    setEmail,
    setNickname,
    setPassword,
    setMessage,
    handleSignUp,
    setLoading,
  } = useUserViewModel(navigate);

  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    if (confirmError && password === confirmPassword) setConfirmError("");
  }, [password, confirmPassword, confirmError]);

  const onSignUp = async () => {
    setConfirmError("");
    setMessage && setMessage("");
    if (password !== confirmPassword) {
      setConfirmError("Las contraseñas no coinciden");
      return;
    }
    try {
      await handleSignUp();
    } catch (err) {
      setConfirmError((err && err.message) || "Error al registrar");
    }
  };

  return (
    <div className="center" role="main" style={{height: "100%", width: "100%"}}>
      <div className="default-container with-border login-card" aria-live="polite">
        <h2 style={{ textAlign: "center", margin: "0 0 1rem" }}>Sign Up</h2>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className="error-text">{errors.email}</p>}

        <label htmlFor="nickname">Nickname</label>
        <input
          id="nickname"
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          aria-invalid={!!errors.nickname}
        />
        {errors.nickname && <p className="error-text">{errors.nickname}</p>}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
        />
        {errors.password && <p className="error-text">{errors.password}</p>}
        <p
          className="hint-text"
          style={{
            fontSize: "0.8rem",
            color: "rgba(0,0,0,0.6)",
            marginTop: 6,
            lineHeight: 1.3,
          }}
        >
          {passwordRequirements}
        </p>

        <label htmlFor="confirmPassword">Confirmar password</label>
        <input
          id="confirmPassword"
          type="password"
          placeholder="Confirmar password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {confirmError && <p className="error-text">{confirmError}</p>}

        <button
          onClick={onSignUp}
          disabled={loading}
          className="btn btn-primary"
          style={{ marginTop: 12, width: "100%", boxSizing: "border-box", display: "block" }}
        >
          {loading ? "Creando cuenta..." : "Sign Up"}
        </button>

        <p style={{ marginTop: 12, textAlign: "center", fontSize: "0.8rem" }}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary)",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Log in
          </button>
        </p>

      </div>
    </div>
  );
};

export default SignUp;