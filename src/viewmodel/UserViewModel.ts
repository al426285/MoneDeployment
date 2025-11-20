import { useState } from "react";
import { UserService } from "../domain/service/UserService";

export const useUserViewModel = (onNavigate: (path: string) => void) => {
  const [email, setEmail] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({}); // Errores de campo

  // Texto reutilizable con los requisitos de contraseña (mostrado en la UI)
  const passwordRequirements =
    "Password requirements: minimum 6 characters; at least 2 uppercase letters, 2 lowercase letters and 2 digits; no spaces or commas.";

  // --- Sign up (ya existente) ---
  const handleSignUp = async () => {
    if (!email || !nickname || !password) {
      setMessage("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);
    setMessage("");
    setErrors({});

    try {
      const userService = UserService.getInstance();
      const userId = await userService.signUp(email.trim(), nickname.trim(), password);
      setMessage("Registro completado con éxito.");
      setEmail("");
      setNickname("");
      setPassword("");
      setErrors({});
      onNavigate("/login");
      return userId;
    } catch (error) {
      const err = error as Error;
      const msg = err?.message ?? "Error al registrar el usuario";

      if (msg === "InvalidEmailException") {
        setErrors({ email: "Invalid email address" });
        setMessage("Please correct the email field.");
      } else if (msg === "InvalidNicknameException") {
        setErrors({ nickname: "Invalid nickname" });
        setMessage("Please correct the nickname field.");
      } else if (msg === "InvalidPasswordException") {
        setErrors({ password: "Password does not meet requirements" });
        setMessage("Please correct the password field.");
      } else if (msg === "EmailAlreadyInUse") {
        setErrors({ email: "Email already in use" });
        setMessage("This email is already registered.");
      } else {
        setMessage("Error al registrar el usuario: " + msg);
      }
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  // --- Login: delega en UserService, mapea excepciones a estado para UI ---
  const logIn = async (emailParam?: string, passwordParam?: string) => {
    const e = emailParam ?? email;
    const p = passwordParam ?? password;

    if (!e || !p) {
      setErrors({ email: !e ? "Required" : "", password: !p ? "Required" : "" });
      setMessage("Please fill email and password.");
      return undefined;
    }

    setLoading(true);
    setMessage("");
    setErrors({});

    try {
      const userService = UserService.getInstance();
      const session = await userService.logIn(e.trim(), p);
      // éxito: limpiar campos y navegar si se quiere
      setEmail("");
      setPassword("");
      setMessage("");
      return session;
    } catch (error) {
      const msg = (error as Error).message ?? "AuthError";
      if (msg === "UserNotFound") {
        setErrors({ email: "User not found" });
        setMessage("Email not registered.");
      } else if (msg === "InvalidCredentials") {
        setErrors({ password: "Invalid credentials" });
        setMessage("Email or password incorrect.");
      } else if (msg === "UserDisabled") {
        setMessage("User disabled.");
      } else {
        setMessage(msg);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logInWithGoogle = async () => {
    setLoading(true);
    setMessage("");
    setErrors({});
    try {
      const userService = UserService.getInstance();
      const session = await userService.googleSignIn();
      setMessage("");
      return session;
    } catch (error) {
      const msg = (error as Error).message ?? "AuthError";
      setMessage(msg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
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
    logIn,
    logInWithGoogle,
    setLoading,
  };
};
