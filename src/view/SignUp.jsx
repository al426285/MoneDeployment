import React from "react";
import { UserViewModel } from "../viewModel/UserViewModel";
import { useNavigate } from "react-router-dom";
export const SignUp = () => {
    const navigate = useNavigate();
  const  {
    email,
    nickname,
    password,
    message,
    loading,
    errors,
    setEmail,
    setNickname,
    setPassword,
    setMessage,
    handleSignUp,
    setLoading,
  } = UserViewModel(navigate); //pasamos el navigate al viewmodel

  return (
    <div>
      <h2>Sign Up</h2>

      <input
        type="email"
        placeholder="Email"
        //className="border p-2 rounded w-full mb-3"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
       {errors.email && (
        <p className="text-red-500 text-sm mb-2">{errors.email}</p>
      )}

      <input
        type="text"
        placeholder="Nickname"
        // className="border p-2 rounded w-full mb-3"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
       {errors.nickname && (
        <p className="text-red-500 text-sm mb-2">{errors.nickname}</p>
      )}

      <input
        type="password"
        placeholder="Password"
        //className="border p-2 rounded w-full mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
         {errors.password && (
        <p className="text-red-500 text-sm mb-2">{errors.password}</p>
      )}


      <button
        onClick={handleSignUp}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600"
      >
        {loading ? "Creando cuenta..." : "Registrarse"}
      </button>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}    

    </div>
  );
};

export default SignUp;