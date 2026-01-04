import React from "react";
import { useUserViewModel2 } from "../../viewmodel/userViewModel2";
import "../../../styles/styles.css";

export const RecuperarContraseña = () => {
  const { email, message, errors, loading, setEmail, recoverPassword } = useUserViewModel2();

  const handleSubmit = (event) => {
    event.preventDefault();
    recoverPassword();
  };

  return (
    <section className="recover-wrapper">
      <article className="recover-card">
        <header className="recover-header">
          <p className="recover-eyebrow">Account access</p>
          <h1>Recover password</h1>
          <p className="recover-subtitle">
            Enter your email and we will send you a secure link to reset your password.
          </p>
        </header>

        <form className="recover-form" onSubmit={handleSubmit}>
          <label htmlFor="recoverEmail">Email</label>
          <input
            id="recoverEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            required
          />

          <button className="btn btn-primary recover-btn" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send recovery link"}
          </button>

          {message && <p className="recover-message success-text">{message}</p>}
          {errors.email && <p className="recover-message error-text">{errors.email}</p>}
        </form>

        <footer className="recover-footer">
          <p>
            Remember your password? <a href="/login" className="link-button">Log in</a>
          </p>
        </footer>
      </article>
    </section>
  );
};

export default RecuperarContraseña;