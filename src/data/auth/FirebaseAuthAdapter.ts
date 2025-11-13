import type { AuthProvider } from "../../domain/repository/AuthProvider";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseApp } from "../../core/config/firebaseConfig";
import { User } from "../../domain/model/User";
import { UserSession } from "../../domain/session/UserSession";
import { FirebaseDataSource } from "../datasource/firebaseDataSource";

export class FirebaseAuthAdapter implements AuthProvider {
  private auth = getAuth(firebaseApp);
  private dataSource = new FirebaseDataSource();

  async signUp(email: string, password: string): Promise<string> {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const fbUser = userCredential.user;

    // Crea la entidad de dominio User (no almacenamos la contraseña en Firestore)
    const nickname = fbUser.displayName ?? "";
    const user = new User(email, nickname, "");

    // Guardamos en Firestore usando el uid de Firebase
    await this.dataSource.saveUser(fbUser.uid, user);

    return fbUser.uid;
  }

  async logIn(email: string, password: string): Promise<string> {
    /*const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    const token = await userCredential.user.getIdToken();

    // Usar la clase de dominio UserSession para persistir la sesión
    const session = new UserSession(userCredential.user.uid, token);
    session.saveToCache(); // utiliza el helper centralizado

    return token;*/
  }

  async logOut(): Promise<void> {
    /*await signOut(this.auth);
    UserSession.clearCache();*/
  }

  async refreshToken(token: string): Promise<string> {
    // Firebase gestiona tokens automáticamente; se devuelve el mismo token por compatibilidad
    return token;
  }
}
