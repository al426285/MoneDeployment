import { useState } from "react";
import { UserService } from "../domain/service/UserService";

export const useUserViewModel2 = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);

  const service = UserService.getInstance();

  const logOut = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await service.logOut();
    } catch (error) {
      const msg = (error as Error).message;
      console.error(msg);
      setMessage(msg);
    }
    finally {
      setLoading(false);
    }
  };
  const recoverPassword = async (emailParam?: string) => {
    const e = emailParam ?? email;

    if (!e) {
      setErrors({ email: "Required" });
      setMessage("Please enter your email.");
      return;
    }

    setLoading(true);
    setMessage("");
    setErrors({});

    try {
      await service.recoverPassword(e);
      setMessage("Password reset email sent.");
    } catch (error) {
      const msg = (error as Error).message;
      console.error(msg);

      if (msg === "UserNotFound") {
        setErrors({ email: "User not found" });
        setMessage("Email not registered.");
      } else {
        setMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    message,
    errors,
    loading,
    setEmail,
    setMessage,
    setErrors,
    setLoading,
    recoverPassword,
    logOut,
  };
};
