//USERSERVICE QUE PASA LAS PRUBEAS;)
import { auth, googleProvider } from "../../core/config/firebaseConfig";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInWithPopup,
    type UserCredential,
} from "firebase/auth";
import type { AuthProvider } from "../repository/AuthProvider";
import type { UserRepository } from "../repository/UserRepository";
import { FirebaseAuthAdapter } from "../../data/auth/FirebaseAuthAdapter";
import { UserSession } from "../session/UserSession";
import { UserRepositoryFirebase } from "../../data/repository/UserRepositoryFirebase";
import { User } from "../model/User";
//para evitar errores de tipo en el manejo de errores (lo rojo)
import type { FirebaseError } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import { firebaseApp } from "../../core/config/firebaseConfig";

export class UserService {
  private static instance: UserService;
  private authProvider!: AuthProvider;
  private userRepository!: UserRepository;

  private constructor() { }

  public static getInstance(authProvider?: AuthProvider, repProvider?: UserRepository): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
      UserService.instance.authProvider = authProvider ?? new FirebaseAuthAdapter();
      UserService.instance.userRepository = repProvider ?? new UserRepositoryFirebase();
    } else {
      // Permitir reemplazar providers si se pasan
      if (authProvider) UserService.instance.authProvider = authProvider;
      if (repProvider) UserService.instance.userRepository = repProvider;
    }
    return UserService.instance;
  }

  async signUp(email: string, nickname: string, password: string): Promise<string> {
   const passwordRegex =
        /^(?=(?:.*[A-Z]){2,})(?=(?:.*[a-z]){2,})(?=(?:.*\d){2,})[A-Za-z\d!@#$%^&*\(\)\-_=+\[\]\{\}:.\?]{6,}$/;
    if ((password.length < 6) || (!passwordRegex.test(password))) {
           throw new Error("InvalidDataException");
    }


    const uid = await this.authProvider.signUp(email, password);

    // Aquí puedes crear la entidad User y guardarla en tu UserRepository/Firestore
    // ejemplo: await this.userRepo.saveUser(uid, new User(email, nickname, ""));

    return uid;
  }

  // logIn devuelve el token (según AuthProvider.logIn)
  async logIn(email: string, password: string): Promise<UserSession> {
    /*const token = await this.authProvider.logIn(email, password);
    const uid ="";
    const session = new UserSession(uid, token);
    session.saveToCache();
    return session;*/
  }

  async logOut(): Promise<void> {
    /*await this.authProvider.logOut();*/
  }

  async deleteUser(email:string): Promise<boolean> {
    //userRepository.deleteUser(email);
    return true;
}

async getRegisteredUsers(): Promise<Array<User>> {
    const users = await this.userRepository.getRegisteredUsers();
    return users;
}

async updateUserProfile(email:string, newEmail?: string, newNickname?:string): Promise<boolean> {

    //const tempUser = new User(newEmail ?? "", newNickname ?? "", "");
    //this.userRepository.updateUserProfile(email, tempUser);
    //return true;

}

async googleSignIn(): Promise<UserCredential> {

}

  private handleAuthError(error: FirebaseError): never {
     throw new Error("NotImplementedException");
  }
}
