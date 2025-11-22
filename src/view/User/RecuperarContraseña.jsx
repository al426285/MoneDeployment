import React from "react";
import { useUserViewModel2 } from "../../viewmodel/userViewModel2";
import "../../../styles/styles.css";
export const RecuperarContraseña = () => {
  const {
    email,
    message,
    errors,
    loading,
    setEmail,
    setMessage,
    setErrors,
    setLoading,
    recoverPassword,
  } = useUserViewModel2();

  const handleSubmit = (e) => {
    e.preventDefault();
    recoverPassword();
  };

  return (
    <div className="recoverPasswordPage">
      <div className="recoverPasswordContainer">
        <h2>Recover Password</h2>
        <h3>Enter your email address and we'll send you a link to reset your password.</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />

          <button className='recuperarContraseña' type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send recovery link"}
          </button>

          {message && <p style={{ color: "green" }}>{message}</p>}
          {errors.email && <p style={{ color: "red" }}>{errors.email}</p>}


          <p>Remember your password? <span>  <a href="/login" className="link_login">Log in</a></span></p>

        </form>
      </div>
    </div>
  );
};

export default RecuperarContraseña;