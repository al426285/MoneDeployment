import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth } from "../../core/config/firebaseConfig";

import { firebaseApp } from "../../core/config/firebaseConfig";
import { User } from "../../domain/model/User";
import {

} from "firebase/auth";
import { deleteUser as fbDeleteUser } from "firebase/auth";
import { UserSession } from "../../domain/session/UserSession";
import { db } from "../../core/config/firebaseConfig";
import { requestFormReset } from "react-dom";
import type { UserRepository } from "../../domain/repository/UserRepository";



export class FirebaseDataSource {
  private userCollection = collection(db, "users");
  private auth = auth;

  async getUserById(userId: string): Promise<User | null> {
    const ref = doc(db, "users", userId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as any;
    // Construye la entidad de dominio User (no guardamos password en Firestore)
    const user = new User(data.email ?? "", data.nickname ?? "");
    return user;
  }

  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const q = query(this.userCollection, where("email", "==", email.trim()));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch {
      return null;
    }
  }

  // rename parameter to avoid shadowing the imported class
  async saveUser(userId: string, user: User): Promise<string> {
    const ref = doc(db, "users", userId);
    await setDoc(
      ref,
      {
        email: user.getEmail(),
        nickname: user.getNickname(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return userId;
  }

  async updateUserProfile(userId: string, tempUser: User): Promise<void> {
    const ref = doc(db, "users", userId.trim());
    const payload = {
      email: tempUser.getEmail(),
      nickname: tempUser.getNickname(),
    };
    await updateDoc(ref, payload);
  }

  async deleteUser(email: string): Promise<void> {
    const currentUser = this.auth.currentUser;
    const userbbdd = await this.getUserByEmail(email);

    console.log("Deleting user with email:", email, "userbbdd", userbbdd, "and id:", userbbdd?.id);


    if (!userbbdd) {
      throw new Error("UserNotFound");
    }

    if (!currentUser || currentUser.uid !== userbbdd.id) {
      console.log("Current user ID:", currentUser?.uid, "does not match userbbdd ID:", userbbdd.id);
      throw new Error("RequiresRecentLogin");
    }

    // Eliminamos perfil de Firestore
    try {
      const ref = doc(db, "users", userbbdd.id);
      await deleteDoc(ref);
    } catch (error) {
      console.error("Firestore cleanup failed", error);
    }

    //Eliminamos de Firebase Authentication
    try {
      await 
      await fbDeleteUser(currentUser);
    } catch (error) {
      console.error("Firebase cleanup failed", error);

    }



    // 3. Limpiar sesión local
    UserSession.clear();
  }

}