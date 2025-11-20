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

export const handleAuthError = (error: FirebaseError): never => {
  const code = error?.code ?? "auth/unknown";
  switch (code) {
    case "auth/email-already-in-use":
      throw new Error("EmailAlreadyInUse");
    case "auth/invalid-email":
      throw new Error("InvalidEmail");
    case "auth/user-not-found":
      throw new Error("UserNotFound");
    case "auth/wrong-password":
      throw new Error("InvalidCredentials");
    case "auth/weak-password":
      throw new Error("WeakPassword");
    case "auth/too-many-requests":
      throw new Error("TooManyRequests");
    case "auth/popup-closed-by-user":
      throw new Error("PopupClosedByUser");
    case "auth/popup-blocked":
      throw new Error("PopupBlocked");
    case "auth/requires-recent-login":
      throw new Error("RequiresRecentLogin");
    default:
      throw new Error(error?.message ?? "AuthError");
  }
};
