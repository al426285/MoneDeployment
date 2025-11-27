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
import type { ActionCodeSettings } from "firebase/auth";
import { getUser } from "../../viewmodel/UserViewModel";

export class UserService {
  private static instance: UserService;
  private authProvider!: AuthProvider;
  private userRepository!: UserRepository;


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

  async signUp(email: string, nickname: string, password: string): Promise<string> {
    if (!isValidEmail(email)) throw new Error("InvalidEmailException");
    if (!isValidNickname(nickname)) throw new Error("InvalidNicknameException");
    if (!validatePassword(password)) throw new Error("InvalidPasswordException")
    try {
      const user = new User(email, nickname);
      const userId = await this.authProvider.signUp(user, password);
      await this.userRepository.saveUser(userId, user);
      return userId;

    } catch (err) {
      handleAuthError(err as any);
      throw new Error("SignUpFailed"); // fallback
    }
  }

  async logIn(email: string, password: string): Promise<UserSession> {
    try {
      const session = await this.authProvider.logIn(email, password);
      if (!session) throw new Error("AuthFailed");

      if (typeof session.saveToCache === "function") session.saveToCache();

      // cachear perfil si existe
      try {
        const profile = await this.getUserById(session.userId);
        if (profile) {
          const plain = {
            userId: session.userId,
            email: (profile as any).getEmail ? profile.getEmail() : profile.email,
            nickname: (profile as any).getNickname ? profile.getNickname() : profile.nickname,
            cachedAt: Date.now(),
          };

          if (typeof (UserSession as any).saveProfileToCache === "function") {
            (UserSession as any).saveProfileToCache(plain);
          } else {
            localStorage.setItem("user_profile", JSON.stringify(plain));
          }
        }
      } catch {/* ignorar */ }

      return session;

    } catch (err) {
      handleAuthError(err as any);

      throw new Error("AuthError");
    }
  }
  async logOut(): Promise<void> {

    try {
      await this.authProvider.logOut();
    } catch (Error) {
      throw handleAuthError(Error as FirebaseError);
    }
  }


  async googleSignIn(): Promise<UserSession> {
    try {
      const session = await this.authProvider.googleSignIn();
      if (!session) throw new Error("AuthFailed");
      if (typeof session.saveToCache === "function") {
        session.saveToCache();
      }

      try {
        let exists = false;
        if (this.userRepository && typeof (this.userRepository as any).getUserById === "function") {
          try {
            const u = await (this.userRepository as any).getUserById(session.userId);
            if (u) exists = true;
          } catch { /* ignorar */ }
        }

        let email = "";
        let nickname = "";
        try {
          const profile = (UserSession as any).loadProfileFromCache && typeof (UserSession as any).loadProfileFromCache === "function"
            ? (UserSession as any).loadProfileFromCache()
            : (() => {
              const raw = localStorage.getItem("user_profile");
              return raw ? JSON.parse(raw) : null;
            })();
          if (profile) {
            email = profile.email ?? "";
            nickname = profile.nickname ?? profile.displayName ?? "";
          }
        } catch { /* ignorar */ }

        if (!exists && email && this.userRepository && typeof (this.userRepository as any).getUserByEmail === "function") {
          try {
            const ue = await (this.userRepository as any).getUserByEmail(email);
            if (ue) exists = true;
          } catch { /* ignorar */ }
        }

        if (!exists) {
          try {
            const newUser = new User(email ?? "", nickname ?? "");
            if (this.userRepository && typeof (this.userRepository as any).saveUser === "function") {
              await (this.userRepository as any).saveUser(session.userId, newUser);
            }
            try {
              const plain = { userId: session.userId, email: email ?? "", nickname: nickname ?? "", cachedAt: Date.now() };
              if ((UserSession as any).saveProfileToCache && typeof (UserSession as any).saveProfileToCache === "function") {
                (UserSession as any).saveProfileToCache(plain);
              } else {
                localStorage.setItem("user_profile", JSON.stringify(plain));
              }
            } catch { /* ignorar errores de escritura en caché */ }
          } catch { /* ignorar errores de guardado */ }
        }
      } catch { /* ignorar errores de verificación de repositorio */ }

      return session;
    } catch (error: any) {
      try {
        handleAuthError(error as FirebaseError);
      } catch (e) {
        throw e;
      }
      return new UserSession();
    }
  }


  //Flujo de acciones: miarar si la sesion esrta abierta (primero mirar chache), obtener email, cerrar sesión, borrar usuario db, borrar datos, ir a signup
  async deleteUser(email: string): Promise<boolean> {
    try {
      await this.userRepository.deleteUser(email);
      return true;

    } catch (error) {
      throw new Error(error);
    }
  }


  // Fuente de verdad: obtener usuario por id delegando al UserRepository
  async getUserById(userId: string): Promise<User | null> {
    // 1) intentar repositorio
    try {
      if (this.userRepository && typeof this.userRepository.getUserById === "function") {
        const u = await this.userRepository.getUserById(userId);
        if (u) return u;
      }
    } catch {
      /* ignore repo errors and try cache fallback */
    }

    try {
      let profile: any = null;
      if ((UserSession as any).loadProfileFromCache && typeof (UserSession as any).loadProfileFromCache === "function") {
        profile = (UserSession as any).loadProfileFromCache();
      } else {
        const raw = localStorage.getItem("user_profile");
        profile = raw ? JSON.parse(raw) : null;
      }
      if (profile) {
        // si el cache incluye userId asegurar coincidencia, o aceptar si no viene userId
        if (!profile.userId || profile.userId === userId) {
          const email = profile.email ?? profile.emailAddress ?? "";
          const nickname = profile.nickname ?? profile.displayName ?? "";
          return new User(email, nickname);
        }
      }
    } catch {
      /* ignore cache read errors */
    }

    return null;
  }



  async updateCurrentUserProfile(
    newEmail?: string,
    currentPassword?: string,
    newNickname?: string
  ): Promise<{ success: boolean; emailVerificationRequired: boolean }> {
    const trimmedEmail = typeof newEmail === "string" ? newEmail.trim() : undefined;
    const trimmedNickname = typeof newNickname === "string" ? newNickname.trim() : undefined;

    if (trimmedEmail && !isValidEmail(trimmedEmail)) throw new Error("InvalidEmailException");
    if (trimmedNickname && !isValidNickname(trimmedNickname)) throw new Error("InvalidNicknameException");

    const session = UserSession.loadFromCache();
    const userId = session?.userId ?? "";
    if (!userId) throw new Error("UserNotAuthenticated");

    const currentProfile = await this.userRepository.getUserById(userId);
    const currentEmail = currentProfile?.getEmail() ?? "";
    const currentNickname = currentProfile?.getNickname() ?? "";
    const normalizedCurrentEmail = currentEmail.trim().toLowerCase();
    const normalizedNewEmail = trimmedEmail?.toLowerCase();
    const emailChanged = !!trimmedEmail && normalizedNewEmail !== normalizedCurrentEmail;

    let verificationTriggered = false;

    if (emailChanged) {
      const canUpdateEmail = await this.authProvider.canUpdateEmail(userId);
      if (!canUpdateEmail) throw new Error("EmailUpdateNotAllowed");
      const existing = await this.userRepository.getUserByEmail(trimmedEmail);
      if (existing) throw new Error("EmailAlreadyInUse");
      if (!currentPassword || !currentPassword.trim()) throw new Error("MissingPassword");

      if (typeof (this.authProvider as any).updateUserEmail === "function") {
        const actionCodeSettings = this.buildEmailActionCodeSettings();
        await this.authProvider.updateUserEmail(
          userId,
          trimmedEmail,
          currentPassword.trim(),
          actionCodeSettings
        );
        verificationTriggered = true;
      } else {
        throw new Error("UpdateEmailNotSupported");
      }
    }

    const persistedEmail = emailChanged ? (trimmedEmail as string) : currentEmail;
    const persistedNickname = trimmedNickname ?? currentNickname;
    const tempUser = new User(persistedEmail, persistedNickname);
    await this.userRepository.updateUserProfile(userId, tempUser);

    try {
      const plain = { userId, email: persistedEmail, nickname: persistedNickname, cachedAt: Date.now() };
      if ((UserSession as any).saveProfileToCache) {
        (UserSession as any).saveProfileToCache(plain);
      } else {
        localStorage.setItem("user_profile", JSON.stringify(plain));
      }
    } catch { /* ignore cache errors */ }

    return { success: true, emailVerificationRequired: verificationTriggered };
  }

  async getAccountInfo(userId: string): Promise<{ user: User | null; emailReadOnly: boolean }> {
    if (!userId) {
      return { user: null, emailReadOnly: false };
    }

    const user = await this.getUserById(userId);
    let emailReadOnly = false;

    try {
      const canEditEmail = await this.authProvider.canUpdateEmail(userId);
      emailReadOnly = !canEditEmail;
    } catch {
      emailReadOnly = false;
    }

    return { user, emailReadOnly };
  }

  processResetParamsFromUrl(search: string) {
    const params = new URLSearchParams(search);
    const mode = params.get("mode") || undefined;
    const oobCode = params.get("oobCode") || undefined;
    const continueUrl = params.get("continueUrl") || undefined;

    const result: {
      mode?: string;
      oobCode?: string;
      continueUrl?: string;
      shouldRedirect: boolean;
      redirectQuery?: string;
    } = {
      mode,
      oobCode,
      continueUrl,
      shouldRedirect: false,
    };

    if (mode === "resetPassword" && oobCode) {
      const q = new URLSearchParams();
      q.set("oobCode", oobCode);
      if (continueUrl) q.set("continueUrl", continueUrl);
      result.shouldRedirect = true;
      result.redirectQuery = q.toString();
    }

    return result;
  }


  async changePassword(payload: {
    currentPassword?: string;
    newPassword: string;
    oobCode?: string;
  }): Promise<void> {
    const { oobCode, currentPassword, newPassword } = payload;
    if (!newPassword || !validatePassword(newPassword)) {
      throw new Error("InvalidDataException");
    }

    try {
      await this.authProvider.changeUserPassword(currentPassword ?? null, newPassword, oobCode);
    } catch (error) {
      handleAuthError(error as FirebaseError);
    }
  }

  async recoverPassword(email: string): Promise<void> {
    if (!email || !isValidEmail(email)) {
      throw new Error("InvalidDataException");
    }
    const existing = await this.userRepository.getUserByEmail(email);
    if (!existing) throw new Error("UserNotFound");
    try {
      await this.authProvider.sendRecoveryEmail(email);
    } catch (error) {
      handleAuthError(error as FirebaseError);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email || !isValidEmail(email)) {
      throw new Error("InvalidDataException");
    }
    return this.userRepository.getUserByEmail(email);
  }
}
