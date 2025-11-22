//Listado excepciones de las HU:
/*
- InvalidUserException
- InvalidDataException
- EmailNotFoundException
- SessionNotFoundException
- PlaceAlreadySavedException
- PlaceNotDeletedException
- PlaceNotSavedException
- VehicleNotFoundException
- ApiNotAvailableException
- UserNotLoggedInException
- DatabaseNotAvailableException
- RouteNotFoundException
- VehicleAlreadySavedAsFavouriteException
- MobilityTypeNotFoundException
- EmailAlreadyInUse
*/
import { FirebaseError } from "firebase/app";

/**
 * Mapea errores (Firebase y mensajes genéricos) a identificadores exactos
 * esperados por los tests y la UI. Lanza siempre una Error con el identificador.
 */
export const handleAuthError = (error: unknown): never => {
  const code = (error && (error as any).code) ?? "";
  const message = (error && (error as any).message) ?? String(error ?? "");
  const normalized = (String(code) + " " + String(message)).toLowerCase();

  if (typeof code === "string" && code.startsWith("auth/")) {
    const mapping: Record<string, string> = {
      "auth/wrong-password": "InvalidCredentials",
      "auth/invalid-credential": "InvalidCredentials",
      "auth/invalid-credentials": "InvalidCredentials",
      "auth/invalid-email": "InvalidEmail",
      "auth/user-not-found": "UserNotFound",
      "auth/email-already-in-use": "EmailAlreadyInUse",
      "auth/weak-password": "InvalidPasswordException",
      "auth/too-many-requests": "TooManyRequests",
      "auth/user-disabled": "UserDisabled",
    };
    const mapped = mapping[code];
    if (mapped) throw new Error(mapped);
    // fallback: devolver el código sin prefijo
    throw new Error(String(code).replace(/^auth\//, ""));
  }

  if (
    normalized.includes("user-not-found") ||
    normalized.includes("auth/user-not-found") ||
    normalized.includes("no user") ||
    normalized.includes("not found")
  ) {
    throw new Error("UserNotFound");
  }

  if (
    normalized.includes("auth/email-already-in-use") ||
    normalized.includes("already-in-use") ||
    normalized.includes("email already")
  ) {
    throw new Error("EmailAlreadyInUse");
  }

  if (
    normalized.includes("auth/wrong-password") ||
    normalized.includes("wrong-password") ||
    normalized.includes("invalid-credentials") ||
    normalized.includes("invalid credential") ||
    normalized.includes("invalid password") ||
    normalized.includes("invalid-password") ||
    normalized.includes("invalid-credential")
  ) {
    throw new Error("InvalidCredentials");
  }

  if (
    normalized.includes("auth/invalid-email") ||
    normalized.includes("invalid-email") ||
    normalized.includes("invalid email")
  ) {
    throw new Error("InvalidEmail");
  }

  if (
    normalized.includes("auth/weak-password") ||
    normalized.includes("weak-password") ||
    normalized.includes("weak password")
  ) {
    throw new Error("InvalidPasswordException");
  }

  if (
    normalized.includes("auth/user-disabled") ||
    normalized.includes("user-disabled") ||
    normalized.includes("disabled")
  ) {
    throw new Error("UserDisabled");
  }

  if (
    normalized.includes("auth/too-many-requests") ||
    normalized.includes("too-many-requests") ||
    normalized.includes("too many requests")
  ) {
    throw new Error("TooManyRequests");
  }

  if (normalized.includes("auth/popup-closed-by-user") || normalized.includes("popup-closed")) {
    throw new Error("PopupClosedByUser");
  }
  if (normalized.includes("auth/popup-blocked") || normalized.includes("popup-blocked")) {
    throw new Error("PopupBlocked");
  }
  if (normalized.includes("auth/requires-recent-login") || normalized.includes("requires-recent-login")) {
    throw new Error("RequiresRecentLogin");
  }
  if (normalized.includes("auth/network-request-failed") || normalized.includes("network-request-failed") || normalized.includes("network error") || normalized.includes("network")) {
    throw new Error("NetworkError");
  }
  if (normalized.includes("auth/internal-error") || normalized.includes("internal-error") || normalized.includes("internal error")) {
    throw new Error("InternalError");
  }
  if (normalized.includes("auth/operation-not-allowed") || normalized.includes("operation-not-allowed")) {
    throw new Error("OperationNotAllowed");
  }
  if (normalized.includes("auth/credential-already-in-use") || normalized.includes("credential-already-in-use")) {
    throw new Error("CredentialAlreadyInUse");
  }

  // Último recurso: lanzar el mensaje original o un identificador genérico
  const fallback = message || "AuthError";
  throw new Error(fallback);
};
