import { useState } from "react";
import { UserService } from "../domain/service/UserService";

export const UserViewModel = (onNavigate: (path: string) => void) => {//pasamos el navigate como parametro para no acoplar el viewmodel a react-router
  const [email, setEmail] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false); //para desactivar el boton mientras procesamos el registro y que no pueda hacer varios clicks
  const [errors, setErrors] = useState({}); //Errores de validacion
  const userService = UserService.getInstance();


  const validate = () => {
    const newErrors: Record<string, string> = {};
    //email
    if (!email) newErrors.email = "El email es obligatorio";
    else if (!email.includes("@")) newErrors.email = "Email no válido";
    //nickname
    if (!nickname) newErrors.nickname = "El nickname es obligatorio";
    //password
    if (password.length < 6) newErrors.password = "Mínimo 6 caracteres";
    else {
      const passwordRegex =
        /^(?=(?:.*[A-Z]){2,})(?=(?:.*[a-z]){2,})(?=(?:.*\d){2,})[A-Za-z\d!@#$%^&*\(\)\-_=+\[\]\{\}:.\?]{6,}$/;
      if (!passwordRegex.test(password)) {
        newErrors.password =
          "La contraseña debe tener al menos dos mayúsculas, dos minúsculas, dos números y no contener espacios ni comas.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; //si no hay errores, es valido, contamos las llaves
  };

  /*
  mínimo dos mayúsculas, dos minúsculas, dos números y longitud de 6 caracteres.
letras del alfabeto inglés mayúsculas y minúsculas: A-Z, a-z
números 0 al 9
símbolos !, @, #, $, %, ^, &, *, (, ), -, _, =, +, [, ], {, }, :, ., ?
NO se permiten comas ni espacios.
  */
  const handleSignUp = async () => {
    if (!email || !nickname || !password || !validate()) {
      setMessage("Por favor, completa todos los campos correctamente.");
      return;
    }
    setLoading(true); //nada mas se llame a la funcion, loading true y por ende boton desactivado

    try {
      userService.signUp(email, nickname, password);
      setMessage("Registro completado con éxito.");
      onNavigate("/login"); //redirigimos al login, usando la funcion pasada como parametro del view jsx
    } catch (error) {
      // console.error("Cagaste xd:", error);
      setMessage("Error al registrar el usuario: " + (error as Error).message);
    }
    finally {
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
    setEmail,
    setNickname,
    setPassword,
    setMessage,
    handleSignUp,
    setLoading,
  };
};
