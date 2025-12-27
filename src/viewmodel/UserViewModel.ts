import { useState } from "react";
import { UserService } from "../domain/service/UserService";
import { UserSession } from "../domain/session/UserSession";

// helper para obtener la instancia cuando la necesitamos (no cacheada a nivel módulo)
const getSvc = () => UserService.getInstance();

export const useUserViewModel = (onNavigate: (path: string) => void) => {
  const [email, setEmail] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({}); // Errores de campo

  // Obtener la instancia una sola vez por hook (segura si se inyectó antes de montar)
  const svc = getSvc();

  const passwordRequirements =
    "Password requirements: minimum 6 characters; at least 2 uppercase letters, 2 lowercase letters and 2 digits; no spaces or commas.";

  // --- Sign up ---
  const handleSignUp = async () => {
    if (!email || !nickname || !password) {
      setMessage("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);
    setMessage("");
    setErrors({});

    try {
      const userId = await svc.signUp(email.trim(), nickname.trim(), password);
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
      const session = await svc.logIn(e.trim(), p);
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
      } else if (msg === "TooManyRequests") {
        setMessage("Too many login attempts. Please try again later.");
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
      const session = await svc.googleSignIn();
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

  const handleDeleteAccount = async (password?: string): Promise<boolean> => {
    setLoading(true);
    try {
      const uid = getCurrentUid();
      if (!uid) {
        setMessage("No user is currently logged in.");
        return false;
      }
      const user = await svc.getUserById(uid);
      const email = user?.getEmail() ?? "";
      if (await svc.deleteUser(email, password ?? "")) {
        setMessage("Account successfully deleted.");
        return true;
      }
      return false;
    } catch (error) {
      const msg = (error as Error).message ?? "Error deleting account";
      setMessage("Error: " + msg);
      return false;
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
    handleDeleteAccount,
    setLoading,
  };
};

const normalizeProfile = (
  profile: any,
  fallback: { email?: string; nickname?: string } = {}
): { email: string; nickname: string } => {
  if (!profile) {
    return {
      email: fallback.email ?? "",
      nickname: fallback.nickname ?? "",
    };
  }

  const emailValue = typeof profile.getEmail === "function"
    ? profile.getEmail()
    : profile.email ?? profile.emailAddress ?? fallback.email ?? "";

  const nicknameValue = typeof profile.getNickname === "function"
    ? profile.getNickname()
    : profile.nickname ?? profile.displayName ?? fallback.nickname ?? "";

  return { email: emailValue, nickname: nicknameValue };
};

export const getCurrentUid = (): string | null => {
  try {
    const session = (UserSession as any).loadFromCache ? UserSession.loadFromCache() : null;
    return session?.userId ?? null;
  } catch {
    return null;
  }
};

export const getUser = async (uid: string) => {
  const svc = getSvc();
  if (!uid) {
    return { ...normalizeProfile(null), emailReadOnly: false };
  }

  try {
    const info = await svc.getAccountInfo(uid);
    return {
      ...normalizeProfile(info?.user),
      emailReadOnly: Boolean(info?.emailReadOnly),
    };
  } catch {
    const fallback = await svc.getUserById(uid);
    return { ...normalizeProfile(fallback), emailReadOnly: false };
  }
};


export const updateAccountInfo = async (opts: { email?: string; nickname?: string; currentPassword?: string }) => {
  const { email, nickname, currentPassword } = opts;
  const svc = getSvc();
  try {
    const result = await svc.updateCurrentUserProfile(email, currentPassword, nickname);
    const emailVerificationRequired = result?.emailVerificationRequired ?? false;

    // devolver el usuario actualizado (si hay sesión y servicio lo permite)
    const uid = getCurrentUid();
    if (uid) {
      try {
        const info = await svc.getAccountInfo(uid);
        return {
          profile: {
            ...normalizeProfile(info?.user, { email: email ?? "", nickname: nickname ?? "" }),
            emailReadOnly: Boolean(info?.emailReadOnly),
          },
          emailVerificationRequired,
        };
      } catch {
        /* ignore metadata errors and fall back */
      }
    }

    const normalizedProfile = normalizeProfile(null, { email: email ?? "", nickname: nickname ?? "" });
    return {
      profile: { ...normalizedProfile, emailReadOnly: false },
      emailVerificationRequired,
    };
  } catch (error) {
    // Normalizar errores de campo para que la vista pueda mostrarlos debajo de cada input
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: string }).message)
          : String(error ?? "");

    // lanzar objeto estructurado con fieldErrors para que la vista lo capture fácilmente
    if (msg === "InvalidEmailException") {
      throw { fieldErrors: { email: "Invalid email" }, original: error };
    }
    if (msg === "InvalidNicknameException") {
      throw { fieldErrors: { nickname: "Invalid nickname" }, original: error };
    }
    if (msg === "EmailAlreadyInUse") {
      throw { fieldErrors: { email: "This email is already in use" }, original: error };
    }
    if (msg === "RequiresRecentLogin" || msg === "MissingPassword" || msg === "Auth/missing-password") {
      throw { fieldErrors: { currentPassword: "Enter your current password to change your email address." }, original: error };
    }
    if (msg === "EmailUpdateNotAllowed") {
      throw {
        fieldErrors: {
          email: "This email is linked to your Google account and cannot be changed here.",
        },
        original: error,
      };
    }

    // fallback: re-lanzar error sin modificar
    throw error;
  }
};

export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
  const svc = getSvc();
  try {
    await svc.updateUserPassword(currentPassword, newPassword);
    
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: string }).message)
          : String(error ?? "");
    if (msg === "InvalidDataException") {
      throw { fieldErrors: { newPassword: "Password does not meet requirements" }, original: error };
    }
    if (msg.includes("auth/wrong-password")) {
      throw { fieldErrors: { currentPassword: "Current password is incorrect" }, original: error };
    }
    if (msg.includes("auth/too-many-requests")) {
      throw new Error("Demasiados intentos. Inténtalo más tarde.");
    }
    if (msg.includes("auth/invalid-credential")) {
      throw { fieldErrors: { newPassword: "Current password is incorrect" }, original: error };
    }
    throw error instanceof Error ? error : new Error(msg);
  }
};

const userViewmodel = {
  getUser,
  updateAccountInfo,
};

export default userViewmodel;
