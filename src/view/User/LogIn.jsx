import React from "react";
import { useNavigate } from "react-router-dom";
import { useUserViewModel } from "../../viewmodel/UserViewModel";

export default function LogIn({ onSuccess }) {
  const navigate = useNavigate();
  const {
    email,
    password,
    loading,
    message,
    errors,
    setEmail,
    setPassword,
    logIn,
    logInWithGoogle,
  } = useUserViewModel(navigate);
  const [localError, setLocalError] = React.useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    try {
      const session = await logIn();
      if (session) {
        if (onSuccess) onSuccess(session);
        else navigate("/");
      }
    } catch (err) {
      setLocalError((err && err.message) || "Error en login");
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError("");
    try {
      const session = await logInWithGoogle();
      if (session) {
        if (onSuccess) onSuccess(session);
        else navigate("/");
      }
    } catch (err) {
      setLocalError((err && err.message) || "Error al iniciar sesión con Google");
    }
  };

  return (
    <div className="center" style={{ minHeight: "60vh", flexDirection: "column", padding: "1rem" }}>
      <div className="color-primary-center login-card" >
        <img src="../resources/logoMone.png" alt="Logo MONE" style={{ width: "80vw", maxWidth: "150px" }} />
        <h2 style={{fontSize: "7vh", color: "var(--color-background)", margin: 0}}>MONE</h2>
        <div className="default-container">
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email</label>
                    <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: "100%", marginBottom: "0.6rem" }}
                />
                </div>
            <div>
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ width: "100%", marginBottom: "0.8rem" }}
                />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", fontWeight: "600" }}>
                {loading ? "Verificando..." : "Log In"}
            </button>
            {(message) && <p style={{ color: "red", marginTop: "0.6rem" }}>{message}</p>}

            {errors.email && <p className="error-text">{errors.email}</p>}
            {errors.password && <p className="error-text">{errors.password}</p>}

            <div style={{ marginTop: "0.8rem" }}>
              <a href="/forgot-password" className="password-link">Forgot your password?</a>
            </div>

            </form>
        </div>

        <a href="/signup" className="signup-link" style={{ marginTop: "1rem", textDecoration: "none" }}>
          Dont have an account? <span style={{fontWeight: "700"}}>Sign up now</span>
        </a>

        <button
          type="button"
          className="btn btn-google"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img src="../resources/logoGoogle.png" alt="Google Logo" className="btn-google__icon" />
          <span>{loading ? "Procesando..." : "Or Log In with Google"}</span>
        </button>

      </div>
    </div>
  );
}