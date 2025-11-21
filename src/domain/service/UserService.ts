//USERSERVICE QUE PASA LAS PRUBEAS;)
import type { AuthProvider } from "../repository/AuthProvider";
import type { UserRepository } from "../repository/UserRepository";
import { FirebaseAuthAdapter } from "../../data/auth/FirebaseAuthAdapter";
import { UserSession } from "../session/UserSession";
import { UserRepositoryFirebase } from "../../data/repository/UserRepositoryFirebase";
import { User } from "../model/User";
//para evitar errores de tipo en el manejo de errores (lo rojo)
import type { FirebaseError } from "firebase/app";
import {
  validatePassword,
  isValidEmail,
  isValidNickname,
} from "../../core/utils/validators";
import { handleAuthError } from "../../core/utils/exceptions";

export class UserService {
  private static instance: UserService;
  private authProvider!: AuthProvider;
  private userRepository!: UserRepository;

  private constructor() {}

  public static getInstance(
    authProvider?: AuthProvider,
    repProvider?: UserRepository
  ): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
      UserService.instance.authProvider =
        authProvider ?? new FirebaseAuthAdapter();
      UserService.instance.userRepository =
        repProvider ?? new UserRepositoryFirebase();
    } else {
      // Permitir reemplazar providers si se pasan
      if (authProvider) UserService.instance.authProvider = authProvider;
      if (repProvider) UserService.instance.userRepository = repProvider;
    }
    return UserService.instance;
  }

  async deleteUser(email: string): Promise<boolean> {
    try {
      await this.userRepository.deleteUser(email);
      return true;
    } catch {
      return false;
    }
  }


  async signUp(
    email: string,
    nickname: string,
    password: string
  ): Promise<string> {
    // Delegar validación aquí y lanzar errores detallados
    if (!isValidEmail(email)) {
      throw new Error("InvalidEmailException");
    }
    if (!isValidNickname(nickname)) {
      throw new Error("InvalidNicknameException");
    }
    if (!validatePassword(password)) {
      throw new Error("InvalidPasswordException");
    }

    try {
      const user = new User(email, nickname);
      const userId = await this.authProvider.signUp(user, password); // email + password
      await this.userRepository.saveUser(userId, user); // email + nickname
      return userId;
    } catch (error: any) {
      // Mapear errores de Firebase a mensajes significativos para los tests / UI
      // Algunos adapters devuelven .code con 'auth/email-already-in-use' etc.
      const code = (error && (error.code || error?.message)) || "";
      if (typeof code === "string" && code.includes("email")) {
        // intentar detectar caso de correo ya usado
        if (
          code.includes("already") ||
          code.includes("in-use") ||
          code.includes("exist")
        ) {
          throw new Error("EmailAlreadyInUse");
        }
      }

      // Si existe helper que lanza excepciones específicas, lo delegamos
      try {
        handleAuthError(error as any);
      } catch (e: any) {
        // si handleAuthError lanza algo con mensaje útil, re-lanzarlo
        throw e;
      }

      // fallback: lanzar error genérico con el mensaje original
      throw new Error((error && error.message) || "SignUpFailed");
    }
  }
  // logIn devuelve el token (según AuthProvider.logIn)
  async logIn(email: string, password: string): Promise<UserSession> {
    try {
      const userSession = await this.authProvider.logIn(email, password);
      if (!userSession) throw new Error("AuthFailed");
      if (typeof userSession.saveToCache === "function") {
        userSession.saveToCache();
      }
      return userSession;
    } catch (error: any) {
      // Delegar el mapeo de errores al helper de exceptions.ts para lanzar las
      // excepciones con los identificadores que usan los tests (UserNotFound, InvalidCredentials, ...)
      try {
        handleAuthError(error as FirebaseError);
      } catch (e: any) {
        throw e;
      }
      throw new Error(error?.message ?? "AuthFailed");
    }
  }

  async googleSignIn(): Promise<UserSession> {
    try {
      const session = await this.authProvider.googleSignIn();
      if (session && typeof session.saveToCache === "function") {
        session.saveToCache();
      }
      if (!session) throw new Error("AuthFailed");
      return session;
    } catch (error: any) {
      // delegar al helper; si lanza, propagar; si no, devolver sesión vacía segura
      try {
        handleAuthError(error as FirebaseError);
      } catch (e) {
        throw e;
      }
      return new UserSession();
    }
  }
}
