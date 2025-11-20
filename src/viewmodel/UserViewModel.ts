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

  // NOTE: no se realiza validación aquí; la hace UserService.
  // El viewmodel se limita a llamar al servicio y mapear errores detallados
  // a mensajes de campo para la UI.

  const handleSignUp = async () => {
    // validación local previa
    // simple guard para evitar llamadas vacías; la validación real la hace UserService
    if (!email || !nickname || !password) {
      setMessage("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);
    setMessage("");
    setErrors({});

    try {
      // Obtener la instancia aquí para evitar errores en render
      const userService = UserService.getInstance();
      if (!userService || typeof userService.signUp !== "function") {
        throw new Error("Servicio de usuario no disponible");
      }

      const userId = await userService.signUp(email.trim(), nickname.trim(), password);
      setMessage("Registro completado con éxito.");
      // limpiar formulario opcional
      setEmail("");
      setNickname("");
      setPassword("");
      setErrors({});
      // navegar al login (o a donde corresponda)
      onNavigate("/login");
      return userId;
    } catch (error) {
      const err = error as Error;
      const msg = err?.message ?? "Error al registrar el usuario";

      // Mapear errores detallados del servicio a errores de campo para la UI
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
        // fallback: mostrar mensaje general
        setMessage("Error al registrar el usuario: " + msg);
      }
      // mantener errores de validación si proceden
      return undefined;
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
    setLoading,
  };
};
